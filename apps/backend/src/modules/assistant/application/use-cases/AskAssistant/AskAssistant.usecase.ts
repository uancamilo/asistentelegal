import { Injectable, Inject } from '@nestjs/common';
import { OpenAIService } from '../../../../../shared/openai/OpenAI.service';
import { DOCUMENT_CHUNK_REPOSITORY } from '../../../../document/domain/constants/tokens';
import { IDocumentChunkRepository, ChunkSearchResult } from '../../../../document/domain/repositories/DocumentChunk.repository.interface';
import {
  AskAssistantRequestDto,
  AskAssistantResponseDto,
  SourceReferenceDto,
} from '../../dtos/AskAssistant.dto';
import {
  RagTelemetryService,
  RagTelemetryData,
  RagSourceInfo,
} from '../../services';
import { StructuredLogger } from '../../../../../infrastructure/logging';

/**
 * RAG System Prompt for the Legal Assistant
 *
 * This prompt instructs the LLM to:
 * - Respond only based on provided context
 * - Not invent or fabricate legal information
 * - Generate clickable links when citing articles
 * - Respond in Spanish (Colombia legal domain)
 * - Adapt response length based on question type
 */
const RAG_SYSTEM_PROMPT = `Eres un asistente jurídico especializado en normativa legal colombiana.

=== REGLA PRINCIPAL - ENLACES OBLIGATORIOS ===
SIEMPRE que menciones un artículo, DEBES usar este formato de enlace Markdown:
[Artículo X de la Constitución](/documentos/DOCUMENT_ID#articulo-X)

El DOCUMENT_ID lo encuentras en el contexto entre paréntesis, ej: (documentId: cmiq8epqi0001w2h33z4rjgef)
El anchor es siempre en minúsculas sin tildes: #articulo-55, #articulo-100

EJEMPLO: Si el contexto dice "(documentId: cmiq8epqi0001w2h33z4rjgef)" y mencionas el Artículo 55:
✓ CORRECTO: "El [Artículo 55 de la Constitución](/documentos/cmiq8epqi0001w2h33z4rjgef#articulo-55) garantiza el derecho..."
✗ INCORRECTO: "El Artículo 55 garantiza el derecho..." (falta el enlace)

=== INSTRUCCIONES ===
1. Responde basándote SOLO en el contexto proporcionado.
2. NUNCA inventes información legal que no esté en el contexto.
3. CADA mención de artículo DEBE ser un enlace clickeable.
4. Estructura tu respuesta de forma clara.

=== TIPO DE RESPUESTA ===
- Preguntas de disponibilidad (¿tienes...?, ¿existe...?): Respuesta BREVE.
- Preguntas específicas (¿qué dice...?, explica...): Respuesta DETALLADA con citas.
- Preguntas de búsqueda (busca..., información sobre...): Resume con citas.

RECUERDA: Cada artículo mencionado = enlace Markdown con el documentId del contexto.`;

/**
 * Extended chunk result with document metadata
 */
interface EnrichedChunkResult extends ChunkSearchResult {
  documentTitle: string;
  documentNumber: string | null;
  documentType: string;
  articleRef?: string;
}

/**
 * Request context for telemetry (optional user/request info)
 */
export interface RequestContext {
  userId?: string;
  ip?: string;
  userAgent?: string;
}

/**
 * AskAssistant Use Case - RAG-based Legal Question Answering
 *
 * This use case implements the complete RAG pipeline with full telemetry:
 * 1. Generate embedding for user question
 * 2. Retrieve relevant chunks from vector database
 * 3. Build context from top chunks (limited by token/char count)
 * 4. Generate answer using OpenAI chat completion
 * 5. Log telemetry data (timing, metrics, sources)
 * 6. Return answer with source citations
 *
 * @example
 * ```typescript
 * const response = await askAssistantUseCase.execute({
 *   question: "¿Cuáles son los requisitos para constituir una empresa?"
 * });
 * // Returns: { answer: "...", sources: [...], executionTimeMs: 1234 }
 * ```
 */
@Injectable()
export class AskAssistantUseCase {
  private readonly logger = new StructuredLogger('AskAssistantUseCase');

  // Configuration constants
  private readonly MAX_CHUNKS = 6;
  private readonly MAX_CONTEXT_CHARS = 6000;
  private readonly MIN_SIMILARITY = 0.25; // Lowered from 0.4 - embeddings often have lower similarity scores
  private readonly SNIPPET_LENGTH = 200;

  constructor(
    private readonly openAIService: OpenAIService,
    @Inject(DOCUMENT_CHUNK_REPOSITORY)
    private readonly chunkRepository: IDocumentChunkRepository,
    private readonly telemetryService: RagTelemetryService,
  ) {}

  /**
   * Execute the RAG pipeline to answer a legal question
   *
   * @param dto - Request containing the user's question
   * @param context - Optional request context (userId, ip, userAgent)
   * @returns Response with answer and source citations
   */
  async execute(
    dto: AskAssistantRequestDto,
    context?: RequestContext,
  ): Promise<AskAssistantResponseDto> {
    const startTime = Date.now();
    const { question, maxSources = 6 } = dto;

    // Timing metrics
    let embeddingMs = 0;
    let vectorSearchMs = 0;
    let contextBuildMs = 0;
    let llmResponseMs = 0;

    // Track chunks for telemetry
    let chunksFound = 0;
    let chunksUsed = 0;
    let contextLength = 0;

    this.logger.log('Processing RAG query', {
      queryLength: question.length,
      maxSources,
    });

    try {
      // Step 1: Generate embedding for the question
      const embeddingStart = Date.now();
      const questionEmbedding = await this.generateQuestionEmbedding(question);
      embeddingMs = Date.now() - embeddingStart;

      // Step 2: Search for relevant chunks in published documents
      const vectorSearchStart = Date.now();
      const allChunks = await this.searchRelevantChunks(
        questionEmbedding,
        Math.min(maxSources, this.MAX_CHUNKS),
      );
      vectorSearchMs = Date.now() - vectorSearchStart;
      chunksFound = allChunks.length;

      // Handle no chunks found
      if (allChunks.length === 0) {
        const totalMs = Date.now() - startTime;

        // Log telemetry for empty result
        await this.logTelemetry({
          question,
          answer: '',
          chunks: [],
          sources: [],
          timing: { embeddingMs, vectorSearchMs, contextBuildMs: 0, llmResponseMs: 0, totalMs },
          contextLength: 0,
          chunksFound: 0,
          chunksUsed: 0,
          success: true,
          context,
        });

        return {
          answer: 'No encontré información relevante en los documentos disponibles para responder tu pregunta. Por favor, intenta reformular tu consulta o verifica que existan documentos publicados sobre este tema.',
          sources: [],
          query: question,
          executionTimeMs: totalMs,
        };
      }

      // Step 3: Build context from chunks
      const contextBuildStart = Date.now();
      const { context: ragContext, usedChunks } = this.buildContextWithTracking(allChunks);
      contextBuildMs = Date.now() - contextBuildStart;
      chunksUsed = usedChunks;
      contextLength = ragContext.length;

      // Step 4: Generate answer using OpenAI
      const llmStart = Date.now();
      const answer = await this.generateAnswer(question, ragContext);
      llmResponseMs = Date.now() - llmStart;

      // Step 5: Build source references
      const sources = this.buildSourceReferences(allChunks.slice(0, chunksUsed));

      const totalMs = Date.now() - startTime;

      // Step 6: Log telemetry
      await this.logTelemetry({
        question,
        answer,
        chunks: allChunks.slice(0, chunksUsed),
        sources,
        timing: { embeddingMs, vectorSearchMs, contextBuildMs, llmResponseMs, totalMs },
        contextLength,
        chunksFound,
        chunksUsed,
        success: true,
        context,
      });

      this.logger.log('RAG query completed', {
        totalMs,
        chunksUsed,
        sourcesCount: sources.length,
      });

      return {
        answer,
        sources,
        query: question,
        executionTimeMs: totalMs,
      };
    } catch (error) {
      const totalMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Log telemetry for failed request
      await this.logTelemetry({
        question,
        answer: '',
        chunks: [],
        sources: [],
        timing: { embeddingMs, vectorSearchMs, contextBuildMs, llmResponseMs, totalMs },
        contextLength,
        chunksFound,
        chunksUsed,
        success: false,
        errorMessage,
        context,
      });

      this.logger.error('RAG query failed', undefined, {
        totalMs,
        error: errorMessage,
      });

      throw error;
    }
  }

  /**
   * Log telemetry data for the RAG query
   */
  private async logTelemetry(data: {
    question: string;
    answer: string;
    chunks: EnrichedChunkResult[];
    sources: SourceReferenceDto[];
    timing: { embeddingMs: number; vectorSearchMs: number; contextBuildMs: number; llmResponseMs: number; totalMs: number };
    contextLength: number;
    chunksFound: number;
    chunksUsed: number;
    success: boolean;
    errorMessage?: string;
    context?: RequestContext;
  }): Promise<void> {
    const { avgScore, maxScore, minScore } = this.telemetryService.calculateMetrics(
      data.chunks.map((c) => ({ score: c.similarity })),
    );

    const telemetryData: RagTelemetryData = {
      queryOriginal: data.question,
      userId: data.context?.userId,
      ip: data.context?.ip,
      userAgent: data.context?.userAgent,
      timing: {
        embeddingMs: data.timing.embeddingMs,
        vectorSearchMs: data.timing.vectorSearchMs,
        contextBuildMs: data.timing.contextBuildMs,
        llmResponseMs: data.timing.llmResponseMs,
        totalMs: data.timing.totalMs,
      },
      context: {
        chunksFound: data.chunksFound,
        chunksUsed: data.chunksUsed,
        avgScore,
        maxScore,
        minScore,
        contextLengthChars: data.contextLength,
      },
      sources: data.sources.map((s): RagSourceInfo => ({
        documentId: s.documentId,
        documentTitle: s.title,
        chunkId: s.chunkId,
        chunkIndex: s.chunkIndex,
        score: s.score,
        snippetLength: s.snippet.length,
      })),
      answerSummary: this.telemetryService.createAnswerSummary(data.answer),
      success: data.success,
      errorMessage: data.errorMessage,
    };

    await this.telemetryService.log(telemetryData);
  }

  /**
   * Generate embedding vector for the user's question
   */
  private async generateQuestionEmbedding(question: string): Promise<number[]> {
    try {
      const embedding = await this.openAIService.generateEmbedding(question);
      this.logger.debug('Generated question embedding', {
        dimensions: embedding.length,
      });
      return embedding;
    } catch (error) {
      this.logger.error('Failed to generate question embedding', undefined, {
        error: error instanceof Error ? error.message : 'Unknown',
      });
      throw new Error('No se pudo procesar la pregunta. Por favor, intenta de nuevo.');
    }
  }

  /**
   * Search for relevant chunks in published documents
   */
  private async searchRelevantChunks(
    embedding: number[],
    limit: number,
  ): Promise<EnrichedChunkResult[]> {
    try {
      const chunks = await this.chunkRepository.searchPublishedByVector(
        embedding,
        {
          limit: limit * 2, // Request more to filter by similarity
          minSimilarity: this.MIN_SIMILARITY,
        },
      );

      // Take only the top N chunks after similarity filtering
      const topChunks = chunks.slice(0, limit);

      this.logger.debug('Vector search completed', {
        totalFound: chunks.length,
        topChunks: topChunks.length,
      });

      return topChunks;
    } catch (error) {
      this.logger.error('Failed to search chunks', undefined, {
        error: error instanceof Error ? error.message : 'Unknown',
      });
      throw new Error('Error al buscar en la base de conocimiento.');
    }
  }

  /**
   * Build context string from chunks with clear separators
   * Returns both the context and the count of chunks actually used
   * Includes documentId for each document so LLM can generate proper links
   */
  private buildContextWithTracking(chunks: EnrichedChunkResult[]): {
    context: string;
    usedChunks: number;
  } {
    const contextParts: string[] = [];
    let totalChars = 0;
    let usedChunks = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      if (!chunk) continue;

      // Build header with document title AND documentId for link generation
      const header = `───── Documento: ${chunk.documentTitle} (documentId: ${chunk.documentId}) ─────`;
      const content = chunk.chunk.content;
      const section = `${header}\n${content}\n`;

      // Check if adding this chunk would exceed the limit
      if (totalChars + section.length > this.MAX_CONTEXT_CHARS) {
        // Try to add a truncated version
        const remainingChars = this.MAX_CONTEXT_CHARS - totalChars - header.length - 50;
        if (remainingChars > 200) {
          const truncatedContent = content.substring(0, remainingChars) + '...';
          contextParts.push(`${header}\n${truncatedContent}\n`);
          usedChunks++;
        }
        break;
      }

      contextParts.push(section);
      totalChars += section.length;
      usedChunks++;
    }

    const context = contextParts.join('\n');

    this.logger.debug('Context built', {
      chunksUsed: usedChunks,
      contextLength: context.length,
    });

    return { context, usedChunks };
  }

  /**
   * Generate answer using OpenAI chat completion
   */
  private async generateAnswer(question: string, context: string): Promise<string> {
    try {
      const answer = await this.openAIService.chatCompletion(
        question,
        context,
        RAG_SYSTEM_PROMPT,
      );

      if (!answer || answer.trim().length === 0) {
        return 'No pude generar una respuesta. Por favor, intenta reformular tu pregunta.';
      }

      return answer;
    } catch (error) {
      this.logger.error('Failed to generate answer', undefined, {
        error: error instanceof Error ? error.message : 'Unknown',
      });
      throw new Error('Error al generar la respuesta. Por favor, intenta de nuevo.');
    }
  }

  /**
   * Build source references from chunks for citation
   */
  private buildSourceReferences(chunks: EnrichedChunkResult[]): SourceReferenceDto[] {
    // Deduplicate by document ID, keeping the highest-scoring chunk per document
    const documentMap = new Map<string, EnrichedChunkResult>();

    for (const chunk of chunks) {
      const existing = documentMap.get(chunk.documentId);
      if (!existing || chunk.similarity > existing.similarity) {
        documentMap.set(chunk.documentId, chunk);
      }
    }

    // Convert to source references, sorted by score descending
    const sources: SourceReferenceDto[] = Array.from(documentMap.values())
      .sort((a, b) => b.similarity - a.similarity)
      .map((chunk) => ({
        documentId: chunk.documentId,
        title: chunk.documentTitle,
        documentNumber: chunk.documentNumber,
        chunkId: chunk.chunk.id,
        chunkIndex: chunk.chunk.chunkIndex,
        score: Math.round(chunk.similarity * 1000) / 1000,
        snippet: this.buildSnippet(chunk.chunk.content),
        articleRef: chunk.articleRef || chunk.chunk.articleRef,
      }));

    return sources;
  }

  /**
   * Build a short snippet from chunk content
   * Ensures the snippet starts at the beginning of a sentence
   */
  private buildSnippet(content: string): string {
    const cleanContent = content.replace(/\s+/g, ' ').trim();

    // Find a clean starting point (after a period, or at start of ARTÍCULO/Art.)
    let startIndex = 0;

    // Check if content starts with a truncated word (lowercase letter or continuation)
    const firstChar = cleanContent.charAt(0);
    if (firstChar === firstChar.toLowerCase() && /[a-záéíóúñ]/.test(firstChar)) {
      // Content starts mid-sentence, find next sentence start
      const articleMatch = cleanContent.match(/(?:ARTÍCULO|Art\.|PARÁGRAFO|Artículo)\s+\d+/i);
      if (articleMatch && articleMatch.index !== undefined && articleMatch.index < 100) {
        // Found an article reference nearby, start from there
        startIndex = articleMatch.index;
      } else {
        // Find the next period followed by a space and uppercase letter
        const nextSentenceMatch = cleanContent.match(/\.\s+[A-ZÁÉÍÓÚÑ]/);
        if (nextSentenceMatch && nextSentenceMatch.index !== undefined && nextSentenceMatch.index < 80) {
          startIndex = nextSentenceMatch.index + 2; // Start after ". "
        }
      }
    }

    const relevantContent = cleanContent.substring(startIndex);

    if (relevantContent.length <= this.SNIPPET_LENGTH) {
      return relevantContent;
    }

    // Try to cut at a sentence or word boundary
    const truncated = relevantContent.substring(0, this.SNIPPET_LENGTH);
    const lastPeriod = truncated.lastIndexOf('.');
    const lastSpace = truncated.lastIndexOf(' ');

    if (lastPeriod > this.SNIPPET_LENGTH * 0.6) {
      return truncated.substring(0, lastPeriod + 1);
    }

    if (lastSpace > this.SNIPPET_LENGTH * 0.8) {
      return truncated.substring(0, lastSpace) + '...';
    }

    return truncated + '...';
  }
}
