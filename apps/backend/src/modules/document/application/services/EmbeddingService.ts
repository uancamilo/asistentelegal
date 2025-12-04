import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

/**
 * Service for generating text embeddings using OpenAI's text-embedding-3-small model
 *
 * This service handles:
 * - Single text embedding generation
 * - Batch embedding generation for multiple texts
 * - Error handling and retries
 *
 * Model: text-embedding-3-small (1536 dimensions)
 * - Cost-effective for semantic search
 * - Good balance between quality and performance
 */
@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly openai: OpenAI;
  private readonly model = 'text-embedding-3-small';
  private readonly dimensions = 1536;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      this.logger.warn(
        'OPENAI_API_KEY not configured - embedding generation will fail',
      );
    }
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Generates an embedding vector for a single text
   *
   * @param text - The text to generate an embedding for
   * @returns Array of numbers representing the embedding vector (1536 dimensions)
   * @throws Error if embedding generation fails
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) {
      throw new Error('Cannot generate embedding for empty text');
    }

    try {
      const response = await this.openai.embeddings.create({
        model: this.model,
        input: text,
        dimensions: this.dimensions,
      });

      const embedding = response.data[0]?.embedding;
      if (!embedding) {
        throw new Error('No embedding returned from OpenAI');
      }

      this.logger.debug(
        `Generated embedding for text of ${text.length} chars: ${embedding.length} dimensions`,
      );

      return embedding;
    } catch (error) {
      this.logger.error(
        `Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Generates embeddings for multiple texts in a single batch request
   * More efficient than calling generateEmbedding multiple times
   *
   * @param texts - Array of texts to generate embeddings for
   * @returns Array of embedding vectors, one per input text
   * @throws Error if embedding generation fails
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!texts || texts.length === 0) {
      return [];
    }

    // Filter out empty texts and track their indices
    const validTexts: { index: number; text: string }[] = [];
    texts.forEach((text, index) => {
      if (text && text.trim().length > 0) {
        validTexts.push({ index, text });
      }
    });

    if (validTexts.length === 0) {
      this.logger.warn('All texts were empty, returning empty embeddings');
      return texts.map(() => []);
    }

    try {
      // OpenAI batch limit is 2048 texts per request
      const batchSize = 100; // Use smaller batches for reliability
      const results: number[][] = new Array(texts.length).fill([]);

      for (let i = 0; i < validTexts.length; i += batchSize) {
        const batch = validTexts.slice(i, i + batchSize);
        const batchTexts = batch.map((v) => v.text);

        this.logger.debug(
          `Processing embedding batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(validTexts.length / batchSize)} (${batch.length} texts)`,
        );

        const response = await this.openai.embeddings.create({
          model: this.model,
          input: batchTexts,
          dimensions: this.dimensions,
        });

        // Map results back to original indices
        response.data.forEach((embeddingData, batchIndex) => {
          const batchItem = batch[batchIndex];
          if (batchItem) {
            results[batchItem.index] = embeddingData.embedding;
          }
        });

        // Small delay between batches to avoid rate limits
        if (i + batchSize < validTexts.length) {
          await this.delay(100);
        }
      }

      this.logger.log(
        `Generated ${validTexts.length} embeddings for ${texts.length} texts`,
      );

      return results;
    } catch (error) {
      this.logger.error(
        `Failed to generate batch embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Converts an embedding array to a Buffer for storage in PostgreSQL
   * Uses Float32Array for efficient storage (4 bytes per dimension vs 8 for Float64)
   *
   * @param embedding - Array of numbers representing the embedding
   * @returns Buffer containing the embedding data
   */
  embeddingToBuffer(embedding: number[]): Buffer {
    const float32Array = new Float32Array(embedding);
    return Buffer.from(float32Array.buffer);
  }

  /**
   * Converts a Buffer back to an embedding array
   *
   * @param buffer - Buffer containing embedding data
   * @returns Array of numbers representing the embedding
   */
  bufferToEmbedding(buffer: Buffer): number[] {
    const float32Array = new Float32Array(
      buffer.buffer,
      buffer.byteOffset,
      buffer.length / Float32Array.BYTES_PER_ELEMENT,
    );
    return Array.from(float32Array);
  }

  /**
   * Formats embedding as PostgreSQL vector string for raw SQL queries
   *
   * @param embedding - Array of numbers representing the embedding
   * @returns String in format '[0.1,0.2,0.3,...]' suitable for pgvector
   */
  embeddingToVectorString(embedding: number[]): string {
    return `[${embedding.join(',')}]`;
  }

  /**
   * Returns the expected embedding dimensions
   */
  getEmbeddingDimensions(): number {
    return this.dimensions;
  }

  /**
   * Returns the model being used
   */
  getModel(): string {
    return this.model;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
