import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  Ip,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { Public } from '../../../../shared/decorators/public.decorator';
import { AskAssistantUseCase, RequestContext } from '../../application/use-cases/AskAssistant';
import {
  AskAssistantRequestDto,
  AskAssistantResponseDto,
} from '../../application/dtos';
import { StructuredLogger } from '../../../../infrastructure/logging';

/**
 * Extended Request with optional user info
 */
interface AuthenticatedRequest extends Request {
  user?: {
    sub?: string;
    userId?: string;
  };
}

/**
 * Assistant Controller - Legal AI Assistant API
 *
 * This controller exposes the RAG-based legal assistant functionality.
 * It allows users to ask questions about legal documents and receive
 * AI-generated answers with source citations.
 *
 * @endpoint POST /api/assistant/ask - Ask a legal question
 */
@Controller('assistant')
export class AssistantController {
  private readonly logger = new StructuredLogger('AssistantController');

  constructor(private readonly askAssistantUseCase: AskAssistantUseCase) {}

  /**
   * POST /api/assistant/ask
   *
   * Ask the legal assistant a question. The assistant will:
   * 1. Search for relevant chunks in published documents
   * 2. Build context from the most relevant chunks
   * 3. Generate an AI response using the context
   * 4. Return the answer with source citations
   *
   * Rate limited to 10 requests per minute per IP to prevent abuse.
   *
   * @param dto - Request containing the user's question
   * @param req - Express request for context extraction
   * @param ip - Client IP address
   * @returns Answer with source references
   *
   * @example
   * Request:
   * ```json
   * {
   *   "question": "¿Cuáles son los requisitos para constituir una empresa?"
   * }
   * ```
   *
   * Response:
   * ```json
   * {
   *   "answer": "Según la normativa vigente...",
   *   "sources": [
   *     {
   *       "documentId": "...",
   *       "title": "Ley de Compañías",
   *       "score": 0.85,
   *       "snippet": "..."
   *     }
   *   ],
   *   "query": "¿Cuáles son los requisitos...",
   *   "executionTimeMs": 1234
   * }
   * ```
   */
  @Post('ask')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async ask(
    @Body() dto: AskAssistantRequestDto,
    @Req() req: AuthenticatedRequest,
    @Ip() ip: string,
  ): Promise<AskAssistantResponseDto> {
    this.logger.log('Received RAG question', {
      questionLength: dto.question.length,
      hasUser: !!req.user,
    });

    // Build request context for telemetry
    const context: RequestContext = {
      userId: req.user?.sub || req.user?.userId,
      ip: this.sanitizeIp(ip),
      userAgent: req.headers['user-agent'],
    };

    const response = await this.askAssistantUseCase.execute(dto, context);

    this.logger.log('RAG question answered', {
      executionMs: response.executionTimeMs,
      sourcesCount: response.sources.length,
    });

    return response;
  }

  /**
   * Sanitize IP address for logging (handle proxies)
   */
  private sanitizeIp(ip: string): string {
    // Remove IPv6 prefix if present
    if (ip.startsWith('::ffff:')) {
      return ip.substring(7);
    }
    return ip;
  }
}
