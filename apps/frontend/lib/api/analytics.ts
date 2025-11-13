import apiClient from './client';

/**
 * Search Analytics API Service
 * Handles all API calls related to search analytics and metrics
 *
 * Authorization: All endpoints require ADMIN or SUPER_ADMIN role
 */

// ============================================================================
// TYPES
// ============================================================================

export interface AnalyticsOverview {
  totalSearches: number;
  clickThroughRate: number;
  averageExecutionTimeMs: number;
  averageOpenAILatencyMs: number;
  averagePgvectorLatencyMs: number;
  zeroResultsRate: number;
  totalCostUsd: number;
  topQueries: Array<{
    query: string;
    count: number;
    avgExecutionTime: number;
    avgResults: number;
  }>;
}

export interface TopQuery {
  query: string;
  _count: {
    query: number;
  };
  _avg: {
    executionTimeMs: number;
    totalResults: number;
  };
}

export interface TopDocument {
  documentId: string;
  _count: {
    documentId: number;
  };
  _avg: {
    clickPosition: number;
  };
}

export interface ZeroResultQuery {
  query: string;
  _count: {
    query: number;
  };
}

export interface CTRMetric {
  clickThroughRate: number;
  percentage: string;
  period: string;
}

export interface ExecutionTimeMetric {
  _avg: {
    executionTimeMs: number;
    openaiLatencyMs: number;
    pgvectorLatencyMs: number;
  };
}

export interface ZeroResultsRateMetric {
  zeroResultsRate: number;
  percentage: string;
  period: string;
}

export interface ClickPositionMetric {
  averageClickPosition: number;
  period: string;
}

export interface CostMetric {
  totalCostUsd: number;
  formatted: string;
  period: string;
}

export interface SearchTypeStat {
  searchType: string;
  _count: {
    searchType: number;
  };
  _avg: {
    executionTimeMs: number;
    totalResults: number;
  };
}

export interface RecordClickParams {
  searchQueryId: string;
  documentId: string;
  clickPosition: number;
  relevanceScore?: number;
  timeToClickMs?: number;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Get analytics overview with all main metrics
 *
 * @param days - Number of days to query (default: 30)
 * @returns Complete analytics dashboard data
 */
export const getAnalyticsOverview = async (days: number = 30): Promise<AnalyticsOverview> => {
  const response = await apiClient.get('/search/analytics/overview', {
    params: { days },
  });
  return response.data;
};

/**
 * Get most popular search queries
 *
 * @param limit - Number of results to return (default: 10)
 * @param days - Number of days to query (default: 30)
 * @returns List of top queries with frequency and performance metrics
 */
export const getTopQueries = async (
  limit: number = 10,
  days: number = 30
): Promise<TopQuery[]> => {
  const response = await apiClient.get('/search/analytics/top-queries', {
    params: { limit, days },
  });
  return response.data;
};

/**
 * Get most clicked documents from search results
 *
 * @param limit - Number of results to return (default: 10)
 * @param days - Number of days to query (default: 30)
 * @returns List of top documents with click counts and average position
 */
export const getTopDocuments = async (
  limit: number = 10,
  days: number = 30
): Promise<TopDocument[]> => {
  const response = await apiClient.get('/search/analytics/top-documents', {
    params: { limit, days },
  });
  return response.data;
};

/**
 * Get queries that returned zero results (content gaps)
 *
 * @param limit - Number of results to return (default: 20)
 * @param days - Number of days to query (default: 30)
 * @returns List of queries without results, useful for identifying missing content
 */
export const getZeroResultsQueries = async (
  limit: number = 20,
  days: number = 30
): Promise<ZeroResultQuery[]> => {
  const response = await apiClient.get('/search/analytics/zero-results-queries', {
    params: { limit, days },
  });
  return response.data;
};

/**
 * Get Click-Through Rate (CTR)
 * Percentage of searches that generated at least one click
 *
 * @param days - Number of days to query (default: 30)
 * @returns CTR metric with interpretation
 */
export const getClickThroughRate = async (days: number = 30): Promise<CTRMetric> => {
  const response = await apiClient.get('/search/analytics/metrics/ctr', {
    params: { days },
  });
  return response.data;
};

/**
 * Get average execution times (total, OpenAI, pgvector)
 *
 * @param days - Number of days to query (default: 30)
 * @returns Breakdown of performance metrics
 */
export const getExecutionTime = async (days: number = 30): Promise<ExecutionTimeMetric> => {
  const response = await apiClient.get('/search/analytics/metrics/execution-time', {
    params: { days },
  });
  return response.data;
};

/**
 * Get zero results rate
 * Percentage of searches that returned no results
 *
 * @param days - Number of days to query (default: 30)
 * @returns Zero results rate metric
 */
export const getZeroResultsRate = async (days: number = 30): Promise<ZeroResultsRateMetric> => {
  const response = await apiClient.get('/search/analytics/metrics/zero-results-rate', {
    params: { days },
  });
  return response.data;
};

/**
 * Get average click position
 * Average position where users click (0-indexed)
 *
 * @param days - Number of days to query (default: 30)
 * @returns Average click position metric
 */
export const getAverageClickPosition = async (days: number = 30): Promise<ClickPositionMetric> => {
  const response = await apiClient.get('/search/analytics/metrics/click-position', {
    params: { days },
  });
  return response.data;
};

/**
 * Get total OpenAI API costs
 *
 * @param days - Number of days to query (default: 30)
 * @returns Total estimated cost in USD
 */
export const getTotalCost = async (days: number = 30): Promise<CostMetric> => {
  const response = await apiClient.get('/search/analytics/costs/total', {
    params: { days },
  });
  return response.data;
};

/**
 * Get search type statistics
 * Compare semantic vs hybrid search performance and usage
 *
 * @param days - Number of days to query (default: 30)
 * @returns Statistics by search type
 */
export const getSearchTypeStats = async (days: number = 30): Promise<SearchTypeStat[]> => {
  const response = await apiClient.get('/search/analytics/search-type-stats', {
    params: { days },
  });
  return response.data;
};

/**
 * Record a click on a search result
 * Used by search components to track user behavior
 *
 * @param params - Click tracking parameters
 */
export const trackSearchResultClick = async (params: RecordClickParams): Promise<void> => {
  try {
    await apiClient.post('/search/analytics/click', params);
  } catch (error) {
    // Silently fail - analytics shouldn't break user experience
    console.warn('Failed to track search click:', error);
  }
};
