import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../shared/guards/JwtAuth.guard';
import { Roles } from '../../../../shared/decorators/Roles.decorator';
import { RolesGuard } from '../../../../shared/guards/Roles.guard';
import { Role } from '../../../user/domain/entities/User.entity';
import { SearchAnalyticsService } from '../../application/services/SearchAnalytics.service';

/**
 * Search Analytics Controller
 *
 * Endpoints para analytics de búsquedas
 *
 * Authorization: Solo SUPER_ADMIN
 *
 * Proporciona:
 * - Top queries (búsquedas más populares)
 * - Búsquedas sin resultados
 */
@Controller('search/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class SearchAnalyticsController {
  constructor(private readonly analyticsService: SearchAnalyticsService) {}

  /**
   * GET /api/search/analytics/top-queries
   * Queries más populares por frecuencia con promedios
   *
   * Query params:
   * - limit: cantidad de resultados (default: 10)
   * - days: número de días a consultar (opcional)
   * - startDate: fecha de inicio para rango personalizado (opcional)
   * - endDate: fecha de fin para rango personalizado (opcional)
   */
  @Get('top-queries')
  @HttpCode(HttpStatus.OK)
  async getTopQueries(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('days') days?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getTopQueries(
      limit,
      days,
      startDate,
      endDate,
    );
  }

  /**
   * GET /api/search/analytics/zero-results-queries
   * Queries que no generaron resultados (para identificar gaps de contenido)
   *
   * Query params:
   * - limit: cantidad de resultados (default: 20)
   * - days: número de días a consultar (opcional)
   * - startDate: fecha de inicio para rango personalizado (opcional)
   * - endDate: fecha de fin para rango personalizado (opcional)
   */
  @Get('zero-results-queries')
  @HttpCode(HttpStatus.OK)
  async getZeroResultsQueries(
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('days') days?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getZeroResultsQueries(
      limit,
      days,
      startDate,
      endDate,
    );
  }

  /**
   * GET /api/search/analytics/top-viewed-documents
   * Documentos más visitados
   *
   * Query params:
   * - limit: cantidad de resultados (default: 10)
   * - days: número de días a consultar (opcional)
   * - startDate: fecha de inicio para rango personalizado (opcional)
   * - endDate: fecha de fin para rango personalizado (opcional)
   */
  @Get('top-viewed-documents')
  @HttpCode(HttpStatus.OK)
  async getTopViewedDocuments(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('days') days?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getTopViewedDocuments(
      limit,
      days,
      startDate,
      endDate,
    );
  }

  /**
   * GET /api/search/analytics/query-history
   * Historial completo de una búsqueda específica
   *
   * Query params:
   * - query: término de búsqueda (requerido)
   * - days: número de días a consultar (opcional)
   * - startDate: fecha de inicio para rango personalizado (opcional)
   * - endDate: fecha de fin para rango personalizado (opcional)
   */
  @Get('query-history')
  @HttpCode(HttpStatus.OK)
  async getQueryHistory(
    @Query('query') query: string,
    @Query('days') days?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getQueryHistory(
      query,
      days,
      startDate,
      endDate,
    );
  }
}
