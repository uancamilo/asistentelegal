import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';

export interface RecordSearchQueryDto {
  userId: string;
  query: string;
  totalResults: number;
  hasResults: boolean;
  executionTimeMs: number;
}

export interface RecordDocumentViewDto {
  documentId: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  referer?: string;
}

@Injectable()
export class SearchAnalyticsService {
  private readonly logger = new Logger(SearchAnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registrar una búsqueda realizada
   */
  async recordSearchQuery(data: RecordSearchQueryDto): Promise<string> {
    try {
      // Sanitizar query para GDPR (truncar si es muy largo)
      const sanitizedQuery = data.query.substring(0, 500);

      const searchQuery = await this.prisma.searchQuery.create({
        data: {
          userId: data.userId,
          query: sanitizedQuery,
          totalResults: data.totalResults,
          hasResults: data.hasResults,
          executionTimeMs: data.executionTimeMs,
        },
      });

      this.logger.debug(`Search query recorded: ${searchQuery.id}`);
      return searchQuery.id;
    } catch (error) {
      this.logger.error('Error recording search query:', error);
      // No lanzar error - analytics no debe romper búsqueda
      return '';
    }
  }

  /**
   * Obtener top queries más populares
   */
  async getTopQueries(
    limit: number = 10,
    days?: number,
    startDate?: string,
    endDate?: string,
  ) {
    // Construir filtro de fecha
    const dateFilter: any = {};
    if (startDate && endDate) {
      // Parsear fechas como locales (YYYY-MM-DD) sin conversión de zona horaria
      const [startYear, startMonth, startDay] = startDate
        .split('-')
        .map((v) => parseInt(v, 10));
      const start = new Date(
        startYear!,
        startMonth! - 1,
        startDay!,
        0,
        0,
        0,
        0,
      );

      const [endYear, endMonth, endDay] = endDate
        .split('-')
        .map((v) => parseInt(v, 10));
      const end = new Date(endYear!, endMonth! - 1, endDay!, 23, 59, 59, 999);

      dateFilter.gte = start;
      dateFilter.lte = end;
    } else if (days) {
      const since = new Date();
      since.setDate(since.getDate() - days);
      dateFilter.gte = since;
    }

    const groupedResults = await this.prisma.searchQuery.groupBy({
      by: ['query'],
      _count: {
        query: true,
      },
      _avg: {
        executionTimeMs: true,
        totalResults: true,
      },
      where: {
        createdAt: dateFilter,
      },
      orderBy: {
        _count: {
          query: 'desc',
        },
      },
      take: limit,
    });

    // Obtener la última fecha de búsqueda para cada query
    const resultsWithLastSearched = await Promise.all(
      groupedResults.map(async (item) => {
        const lastSearch = await this.prisma.searchQuery.findFirst({
          where: {
            query: item.query,
            createdAt: dateFilter,
          },
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            createdAt: true,
          },
        });

        return {
          ...item,
          lastSearched: lastSearch?.createdAt,
        };
      }),
    );

    return resultsWithLastSearched;
  }

  /**
   * Obtener búsquedas sin resultados (para identificar gaps)
   */
  async getZeroResultsQueries(
    limit: number = 20,
    days?: number,
    startDate?: string,
    endDate?: string,
  ) {
    // Construir filtro de fecha
    const dateFilter: any = {};
    if (startDate && endDate) {
      // Parsear fechas como locales (YYYY-MM-DD) sin conversión de zona horaria
      const [startYear, startMonth, startDay] = startDate
        .split('-')
        .map((v) => parseInt(v, 10));
      const start = new Date(
        startYear!,
        startMonth! - 1,
        startDay!,
        0,
        0,
        0,
        0,
      );

      const [endYear, endMonth, endDay] = endDate
        .split('-')
        .map((v) => parseInt(v, 10));
      const end = new Date(endYear!, endMonth! - 1, endDay!, 23, 59, 59, 999);

      dateFilter.gte = start;
      dateFilter.lte = end;
    } else if (days) {
      const since = new Date();
      since.setDate(since.getDate() - days);
      dateFilter.gte = since;
    }

    const groupedResults = await this.prisma.searchQuery.groupBy({
      by: ['query'],
      _count: {
        query: true,
      },
      where: {
        createdAt: dateFilter,
        hasResults: false,
      },
      orderBy: {
        _count: {
          query: 'desc',
        },
      },
      take: limit,
    });

    // Obtener la última fecha de búsqueda para cada query
    const resultsWithLastSearched = await Promise.all(
      groupedResults.map(async (item) => {
        const lastSearch = await this.prisma.searchQuery.findFirst({
          where: {
            query: item.query,
            hasResults: false,
            createdAt: dateFilter,
          },
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            createdAt: true,
          },
        });

        return {
          ...item,
          lastSearched: lastSearch?.createdAt,
        };
      }),
    );

    return resultsWithLastSearched;
  }

  /**
   * Registrar visita a un documento
   */
  async recordDocumentView(data: RecordDocumentViewDto): Promise<void> {
    try {
      await this.prisma.documentView.create({
        data: {
          documentId: data.documentId,
          userId: data.userId,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          referer: data.referer,
        },
      });

      this.logger.debug(`Document view recorded: ${data.documentId}`);
    } catch (error) {
      this.logger.error('Error recording document view:', error);
      // No lanzar error - analytics no debe romper la aplicación
    }
  }

  /**
   * Obtener documentos más visitados
   */
  async getTopViewedDocuments(
    limit: number = 10,
    days?: number,
    startDate?: string,
    endDate?: string,
  ) {
    const where: any = {};

    // Construir filtro de fecha
    if (startDate && endDate) {
      // Parsear fechas como locales (YYYY-MM-DD) sin conversión de zona horaria
      const [startYear, startMonth, startDay] = startDate
        .split('-')
        .map((v) => parseInt(v, 10));
      const start = new Date(
        startYear!,
        startMonth! - 1,
        startDay!,
        0,
        0,
        0,
        0,
      );

      const [endYear, endMonth, endDay] = endDate
        .split('-')
        .map((v) => parseInt(v, 10));
      const end = new Date(endYear!, endMonth! - 1, endDay!, 23, 59, 59, 999);

      where.viewedAt = {
        gte: start,
        lte: end,
      };
    } else if (days) {
      const since = new Date();
      since.setDate(since.getDate() - days);
      where.viewedAt = { gte: since };
    }

    const topDocuments = await this.prisma.documentView.groupBy({
      by: ['documentId'],
      _count: {
        documentId: true,
      },
      where,
      orderBy: {
        _count: {
          documentId: 'desc',
        },
      },
      take: limit,
    });

    // Obtener información de los documentos y última fecha de visita
    const documentsWithInfo = await Promise.all(
      topDocuments.map(async (item) => {
        const document = await this.prisma.document.findUnique({
          where: { id: item.documentId },
          select: {
            id: true,
            title: true,
            documentNumber: true,
            type: true,
          },
        });

        // Obtener última visita
        const lastView = await this.prisma.documentView.findFirst({
          where: {
            documentId: item.documentId,
            ...where,
          },
          orderBy: {
            viewedAt: 'desc',
          },
          select: {
            viewedAt: true,
          },
        });

        return {
          documentId: item.documentId,
          title: document?.title || 'Documento no encontrado',
          documentNumber: document?.documentNumber,
          type: document?.type,
          viewCount: item._count.documentId,
          lastViewed: lastView?.viewedAt,
        };
      }),
    );

    return documentsWithInfo;
  }

  /**
   * Obtener historial completo de una búsqueda específica
   */
  async getQueryHistory(
    query: string,
    days?: number,
    startDate?: string,
    endDate?: string,
  ) {
    // Construir filtro de fecha
    const dateFilter: any = {};
    if (startDate && endDate) {
      // Parsear fechas como locales (YYYY-MM-DD) sin conversión de zona horaria
      const [startYear, startMonth, startDay] = startDate
        .split('-')
        .map((v) => parseInt(v, 10));
      const start = new Date(
        startYear!,
        startMonth! - 1,
        startDay!,
        0,
        0,
        0,
        0,
      );

      const [endYear, endMonth, endDay] = endDate
        .split('-')
        .map((v) => parseInt(v, 10));
      const end = new Date(endYear!, endMonth! - 1, endDay!, 23, 59, 59, 999);

      dateFilter.gte = start;
      dateFilter.lte = end;
    } else if (days) {
      const since = new Date();
      since.setDate(since.getDate() - days);
      dateFilter.gte = since;
    }

    const searchHistory = await this.prisma.searchQuery.findMany({
      where: {
        query,
        createdAt: dateFilter,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return searchHistory;
  }
}
