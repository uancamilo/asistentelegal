import { Injectable, Logger, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PDFParse } = require('pdf-parse');
import OpenAI from 'openai';

import {
  IngestDocumentDto,
  IngestDocumentResponseDto,
  DetectedDocumentMetadata,
} from './IngestDocument.dto';
import { DocumentType, DocumentScope } from '../../../domain/entities/DocumentEnums';
import { chunkText } from '../../utils/chunkText';

/**
 * Result from pdf-parse getText()
 */
interface PdfTextResult {
  pages: Array<{ text: string; num: number }>;
  text: string;
  total: number;
}

/**
 * IngestDocumentUseCase
 *
 * Synchronous document ingestion with automatic metadata detection.
 * This use case:
 * 1. Downloads PDF from URL
 * 2. Extracts text using pdf-parse
 * 3. Analyzes content with LLM to detect metadata
 * 4. Detects if PDF contains single or multiple legal documents
 * 5. Returns structured data for frontend form pre-filling
 *
 * Note: This does NOT create documents in the database - it only
 * returns detected metadata for the user to review and confirm.
 */
@Injectable()
export class IngestDocumentUseCase {
  private readonly logger = new Logger(IngestDocumentUseCase.name);
  private readonly openai: OpenAI;

  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY not configured - metadata detection will use fallback');
    }
    this.openai = new OpenAI({ apiKey: apiKey || 'not-configured' });
  }

  async execute(dto: IngestDocumentDto): Promise<IngestDocumentResponseDto> {
    const startTime = Date.now();
    const warnings: string[] = [];

    this.logger.log(`[Ingest] Starting ingestion from URL: ${dto.url}`);

    // Step 1: Validate URL
    this.validateUrl(dto.url);

    // Step 2: Download PDF
    let pdfBuffer: Buffer;
    try {
      this.logger.log('[Ingest] Downloading PDF...');
      const response = await axios.get(dto.url, {
        responseType: 'arraybuffer',
        timeout: 60000,
        maxContentLength: 50 * 1024 * 1024,
        headers: {
          'User-Agent': 'AsistenciaLegal-Bot/1.0',
        },
      });

      const contentType = response.headers['content-type'];
      if (!contentType?.includes('application/pdf')) {
        throw new HttpException(
          `Invalid content type: ${contentType}. Expected application/pdf`,
          HttpStatus.BAD_REQUEST,
        );
      }

      pdfBuffer = Buffer.from(response.data);
      this.logger.log(`[Ingest] Downloaded ${pdfBuffer.length} bytes`);
    } catch (error) {
      const errorMessage = this.formatDownloadError(error);
      this.logger.error(`[Ingest] Download failed: ${errorMessage}`);
      throw new HttpException(
        `Failed to download PDF: ${errorMessage}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // Step 3: Extract text from PDF
    let extractedText: string;
    let totalPages = 0;
    try {
      this.logger.log('[Ingest] Extracting text from PDF...');
      const pdfParser = new PDFParse({ data: pdfBuffer });
      const pdfData: PdfTextResult = await pdfParser.getText();
      extractedText = pdfData.text?.trim() || '';
      totalPages = pdfData.total || 0;
      await pdfParser.destroy();

      if (!extractedText) {
        throw new HttpException(
          'No text could be extracted from the PDF',
          HttpStatus.BAD_REQUEST,
        );
      }

      this.logger.log(`[Ingest] Extracted ${extractedText.length} chars from ${totalPages} pages`);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`[Ingest] Extraction failed: ${errorMessage}`);
      throw new HttpException(
        `Failed to extract text from PDF: ${errorMessage}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // Step 4: Analyze content with LLM to detect metadata
    let detectedDocuments: DetectedDocumentMetadata[];
    try {
      this.logger.log('[Ingest] Analyzing content with LLM...');
      detectedDocuments = await this.analyzeContentWithLLM(extractedText);
      this.logger.log(`[Ingest] Detected ${detectedDocuments.length} document(s)`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(`[Ingest] LLM analysis failed, using fallback: ${errorMessage}`);
      warnings.push(`Metadata detection limited: ${errorMessage}`);
      detectedDocuments = [this.createFallbackMetadata(extractedText)];
    }

    // Step 5: Convert content to Markdown for each detected document
    for (const doc of detectedDocuments) {
      try {
        this.logger.log(`[Ingest] Converting content to Markdown for: ${doc.title}`);
        doc.contentMarkdown = await this.convertToMarkdown(doc.content, doc.title);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.warn(`[Ingest] Markdown conversion failed, using plain text: ${errorMessage}`);
        warnings.push(`Markdown conversion failed for "${doc.title}": ${errorMessage}`);
        doc.contentMarkdown = this.createBasicMarkdown(doc.content, doc.title);
      }

      // Create chunks from original content (not markdown) for embeddings
      const chunks = chunkText(doc.content, {
        targetSize: 1200,
        minSize: 500,
        maxSize: 1500,
        overlap: 100,
      });
      doc.chunksCount = chunks.length;
    }

    const processingTimeMs = Date.now() - startTime;
    this.logger.log(`[Ingest] Completed in ${processingTimeMs}ms`);

    return {
      success: true,
      sourceUrl: dto.url,
      totalPages,
      totalCharacters: extractedText.length,
      multipleDocumentsDetected: detectedDocuments.length > 1,
      detectedDocuments,
      processingTimeMs,
      warnings,
    };
  }

  /**
   * Analyze PDF content with LLM to detect metadata
   */
  private async analyzeContentWithLLM(text: string): Promise<DetectedDocumentMetadata[]> {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Truncate text for LLM analysis (first 15000 chars)
    const textForAnalysis = text.substring(0, 15000);

    const systemPrompt = `Eres un experto en análisis de documentos legales ecuatorianos.
Tu tarea es analizar el texto extraído de un PDF y detectar los metadatos de los documentos legales que contiene.

IMPORTANTE: Un PDF puede contener UNA o VARIAS normas legales (por ejemplo, un Registro Oficial puede contener múltiples leyes, decretos, resoluciones, etc.).

Para CADA documento/norma legal detectado, debes extraer:
1. title: Título completo del documento
2. documentNumber: Número oficial (ej: "Ley 123", "Decreto 456", "RO-789-2024")
3. documentType: Uno de: CONSTITUCION, TRATADO_INTERNACIONAL, LEY_ORGANICA, LEY_ORDINARIA, DECRETO_LEY, DECRETO, REGLAMENTO, ORDENANZA, RESOLUCION, ACUERDO, CIRCULAR, DIRECTIVA, OTRO
4. scope: Uno de: INTERNACIONAL, NACIONAL, REGIONAL, MUNICIPAL, LOCAL
5. issuingEntity: Entidad emisora (ej: "Asamblea Nacional", "Presidencia de la República")
6. date: Fecha de publicación o vigencia en formato ISO (YYYY-MM-DD) o null
7. summary: Resumen breve del contenido (máximo 500 caracteres)
8. keywords: Lista de palabras clave relevantes (máximo 10)
9. startPosition: Posición aproximada donde inicia este documento en el texto (número)
10. endPosition: Posición aproximada donde termina este documento en el texto (número)

Responde ÚNICAMENTE con un JSON válido con la siguiente estructura:
{
  "documents": [
    {
      "title": "...",
      "documentNumber": "..." o null,
      "documentType": "...",
      "scope": "...",
      "issuingEntity": "...",
      "date": "..." o null,
      "summary": "...",
      "keywords": ["..."],
      "startPosition": 0,
      "endPosition": 5000,
      "confidence": 0.95
    }
  ]
}

Si solo hay UN documento, devuelve un array con un solo elemento.
Si hay VARIOS documentos, devuelve un array con todos ellos en orden de aparición.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analiza el siguiente texto extraído de un PDF legal:\n\n${textForAnalysis}` },
        ],
        temperature: 0.1,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from LLM');
      }

      const parsed = JSON.parse(content);
      const documents = parsed.documents || [parsed];

      if (!Array.isArray(documents) || documents.length === 0) {
        throw new Error('Invalid response structure from LLM');
      }

      // Map LLM response to our metadata format
      return documents.map((doc: any) => {
        // Si es un solo documento, usar el texto completo
        // ya que el LLM solo analiza los primeros 15k caracteres
        let docContent: string;
        if (documents.length === 1) {
          docContent = text; // Texto completo para documento único
        } else {
          const startPos = doc.startPosition || 0;
          const endPos = doc.endPosition || text.length;
          docContent = text.substring(
            Math.max(0, startPos),
            Math.min(text.length, endPos),
          );
        }

        return {
          title: doc.title || 'Documento sin título',
          documentNumber: doc.documentNumber || null,
          documentType: this.validateDocumentType(doc.documentType),
          scope: this.validateScope(doc.scope),
          issuingEntity: doc.issuingEntity || 'Entidad no identificada',
          date: doc.date || null,
          summary: doc.summary || '',
          content: docContent || text, // Fallback to full text if segmentation fails
          chunksCount: 0, // Will be calculated later
          keywords: Array.isArray(doc.keywords) ? doc.keywords.slice(0, 10) : [],
          confidence: typeof doc.confidence === 'number' ? doc.confidence : 0.8,
        } as DetectedDocumentMetadata;
      });
    } catch (error) {
      this.logger.error(`[Ingest] LLM analysis error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Create fallback metadata when LLM is unavailable
   */
  private createFallbackMetadata(text: string): DetectedDocumentMetadata {
    // Try to extract title from first few lines
    const lines = text.split('\n').filter(l => l.trim());
    const potentialTitle = lines.slice(0, 3).join(' ').substring(0, 200);

    return {
      title: potentialTitle || 'Documento importado',
      documentNumber: null,
      documentType: DocumentType.OTRO,
      scope: DocumentScope.NACIONAL,
      issuingEntity: 'Entidad no identificada',
      date: null,
      summary: '',
      content: text,
      contentMarkdown: this.createBasicMarkdown(text, potentialTitle || 'Documento importado'),
      chunksCount: 0,
      keywords: [],
      confidence: 0.3,
    };
  }

  /**
   * Convert extracted text to structured Markdown using LLM
   */
  private async convertToMarkdown(text: string, title: string): Promise<string> {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // For very long texts, we need to truncate for LLM processing
    // but preserve the original structure
    const maxLlmChars = 30000;
    const textForConversion = text.substring(0, maxLlmChars);
    const needsTruncationNote = text.length > maxLlmChars;

    const systemPrompt = `Eres un experto en formateo de documentos legales.
Tu tarea es convertir texto plano extraído de un PDF legal a formato Markdown estructurado.

INSTRUCCIONES:
1. Identifica y formatea correctamente:
   - Títulos y subtítulos (usar # ## ###)
   - Artículos (### Art. X o ### ARTÍCULO X)
   - Capítulos y secciones (## CAPÍTULO X)
   - Listas numeradas o con viñetas
   - Párrafos separados claramente

2. Preserva TODO el contenido - no elimines ni resumas nada
3. Mejora la legibilidad con saltos de línea apropiados
4. Usa **negrita** para términos importantes definidos
5. Usa > blockquotes para citas textuales dentro del documento

FORMATO DE SALIDA:
Devuelve ÚNICAMENTE el texto convertido a Markdown, sin explicaciones adicionales.
El documento debe comenzar con el título como encabezado nivel 1.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Convierte el siguiente documento legal "${title}" a Markdown estructurado:\n\n${textForConversion}`
          },
        ],
        temperature: 0.1,
        max_tokens: 16000,
      });

      let markdown = response.choices[0]?.message?.content || '';

      if (!markdown.trim()) {
        throw new Error('Empty response from LLM');
      }

      // If text was truncated, append the remaining content with basic formatting
      if (needsTruncationNote && text.length > maxLlmChars) {
        const remainingText = text.substring(maxLlmChars);
        markdown += '\n\n---\n\n' + this.applyBasicMarkdownFormatting(remainingText);
      }

      return markdown;
    } catch (error) {
      this.logger.error(`[Ingest] Markdown conversion error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Create basic Markdown when LLM is unavailable
   */
  private createBasicMarkdown(text: string, title: string): string {
    let markdown = `# ${title}\n\n`;
    markdown += this.applyBasicMarkdownFormatting(text);
    return markdown;
  }

  /**
   * Apply basic Markdown formatting rules to text
   */
  private applyBasicMarkdownFormatting(text: string): string {
    const lines = text.split('\n');
    const formattedLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        formattedLines.push('');
        continue;
      }

      // Detect article patterns
      if (/^(ART[ÍI]CULO|Art\.?)\s*\d+/i.test(trimmed)) {
        formattedLines.push(`\n### ${trimmed}`);
        continue;
      }

      // Detect chapter/section patterns
      if (/^(CAP[ÍI]TULO|SECCI[ÓO]N|T[ÍI]TULO)\s+[IVXLCDM\d]+/i.test(trimmed)) {
        formattedLines.push(`\n## ${trimmed}`);
        continue;
      }

      // Detect numbered items
      if (/^\d+[\.\)\-]\s/.test(trimmed)) {
        formattedLines.push(trimmed);
        continue;
      }

      // Detect lettered items
      if (/^[a-z][\.\)]\s/i.test(trimmed)) {
        formattedLines.push(`   ${trimmed}`);
        continue;
      }

      // Regular paragraph
      formattedLines.push(trimmed);
    }

    return formattedLines.join('\n');
  }

  /**
   * Validate and normalize document type
   */
  private validateDocumentType(type: string): DocumentType {
    const normalized = type?.toUpperCase?.() || '';
    if (Object.values(DocumentType).includes(normalized as DocumentType)) {
      return normalized as DocumentType;
    }
    return DocumentType.OTRO;
  }

  /**
   * Validate and normalize scope
   */
  private validateScope(scope: string): DocumentScope {
    const normalized = scope?.toUpperCase?.() || '';
    if (Object.values(DocumentScope).includes(normalized as DocumentScope)) {
      return normalized as DocumentScope;
    }
    return DocumentScope.NACIONAL;
  }

  /**
   * Validate URL security
   */
  private validateUrl(url: string): void {
    try {
      const parsedUrl = new URL(url);

      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new HttpException(
          'Only HTTP and HTTPS URLs are allowed',
          HttpStatus.BAD_REQUEST,
        );
      }

      const hostname = parsedUrl.hostname.toLowerCase();
      const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0'];

      if (blockedHosts.includes(hostname)) {
        throw new HttpException(
          'URLs pointing to localhost are not allowed',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (this.isPrivateIP(hostname)) {
        throw new HttpException(
          'URLs pointing to private IP addresses are not allowed',
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Invalid URL format', HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Check if hostname is a private IP
   */
  private isPrivateIP(hostname: string): boolean {
    const privatePatterns = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^169\.254\./,
      /^fc00:/i,
      /^fe80:/i,
    ];
    return privatePatterns.some(pattern => pattern.test(hostname));
  }

  /**
   * Format download error message
   */
  private formatDownloadError(error: unknown): string {
    if (error instanceof AxiosError) {
      if (error.code === 'ECONNABORTED') return 'Timeout - PDF took too long to download';
      if (error.code === 'ENOTFOUND') return 'Host not found';
      if (error.response) return `HTTP ${error.response.status}: ${error.response.statusText}`;
      if (error.code) return `Network error: ${error.code}`;
    }
    return error instanceof Error ? error.message : String(error);
  }
}
