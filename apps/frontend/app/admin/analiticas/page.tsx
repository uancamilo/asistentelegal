'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/hooks/useAuth';
import { TrendingUp, AlertCircle, ShieldAlert, FileText, Eye, Activity, BarChart3, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import axios from 'axios';

interface TopQuery {
  query: string;
  _count: {
    query: number;
  };
  _avg: {
    executionTimeMs: number | null;
    totalResults: number | null;
  };
  lastSearched?: string;
}

interface ZeroResultQuery {
  query: string;
  _count: {
    query: number;
  };
  lastSearched?: string;
}

interface TopViewedDocument {
  documentId: string;
  title: string;
  documentNumber: string | null;
  type: string;
  viewCount: number;
  lastViewed?: string;
}

type SortDirection = 'asc' | 'desc' | null;
type SortField = string;

export default function AnalyticsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  // Date range states
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [applyTrigger, setApplyTrigger] = useState(0); // Trigger para forzar recarga

  const [topQueries, setTopQueries] = useState<TopQuery[]>([]);
  const [zeroResultQueries, setZeroResultQueries] = useState<ZeroResultQuery[]>([]);
  const [topDocuments, setTopDocuments] = useState<TopViewedDocument[]>([]);

  // Sorting states
  const [topQueriesSort, setTopQueriesSort] = useState<{ field: SortField; direction: SortDirection }>({ field: 'frequency', direction: 'desc' });
  const [zeroResultsSort, setZeroResultsSort] = useState<{ field: SortField; direction: SortDirection }>({ field: 'frequency', direction: 'desc' });
  const [documentsSort, setDocumentsSort] = useState<{ field: SortField; direction: SortDirection }>({ field: 'views', direction: 'desc' });

  // Verificar permisos de acceso
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login?returnUrl=/admin/analiticas');
        return;
      }

      if (user.role !== 'SUPER_ADMIN') {
        router.push('/acceso-denegado?reason=insufficient_permissions&required=SUPER_ADMIN&current=' + user.role);
        return;
      }
    }
  }, [user, authLoading, router]);

  // Cargar analytics cuando cambia el período
  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN') {
      loadAnalytics();
    }
  }, [days, user, applyTrigger]);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

      // Construir parámetros según si es rango personalizado o predefinido
      const params: any = { limit: 10 };
      if (useCustomRange && startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      } else {
        params.days = days;
      }

      const zeroResultParams: any = { limit: 20 };
      if (useCustomRange && startDate && endDate) {
        zeroResultParams.startDate = startDate;
        zeroResultParams.endDate = endDate;
      } else {
        zeroResultParams.days = days;
      }

      const [topQueriesRes, zeroResultsRes, topDocsRes] = await Promise.all([
        axios.get(`${apiUrl}/search/analytics/top-queries`, {
          params,
          withCredentials: true,
        }),
        axios.get(`${apiUrl}/search/analytics/zero-results-queries`, {
          params: zeroResultParams,
          withCredentials: true,
        }),
        axios.get(`${apiUrl}/search/analytics/top-viewed-documents`, {
          params,
          withCredentials: true,
        }),
      ]);

      setTopQueries(topQueriesRes.data);
      setZeroResultQueries(zeroResultsRes.data);
      setTopDocuments(topDocsRes.data);
    } catch (err: any) {
      console.error('Error loading analytics:', err);
      setError(err.response?.data?.message || 'Error cargando analytics');
    } finally {
      setLoading(false);
    }
  };

  // Sort functions
  const handleTopQueriesSort = (field: SortField) => {
    const newDirection = topQueriesSort.field === field && topQueriesSort.direction === 'desc' ? 'asc' : 'desc';
    setTopQueriesSort({ field, direction: newDirection });
  };

  const handleZeroResultsSort = (field: SortField) => {
    const newDirection = zeroResultsSort.field === field && zeroResultsSort.direction === 'desc' ? 'asc' : 'desc';
    setZeroResultsSort({ field, direction: newDirection });
  };

  const handleDocumentsSort = (field: SortField) => {
    const newDirection = documentsSort.field === field && documentsSort.direction === 'desc' ? 'asc' : 'desc';
    setDocumentsSort({ field, direction: newDirection });
  };

  // Sorted data
  const sortedTopQueries = [...topQueries].sort((a, b) => {
    const { field, direction } = topQueriesSort;
    if (!direction) return 0;

    let aVal: any, bVal: any;
    if (field === 'query') {
      aVal = a.query.toLowerCase();
      bVal = b.query.toLowerCase();
    } else if (field === 'frequency') {
      aVal = a._count.query;
      bVal = b._count.query;
    } else if (field === 'avgResults') {
      aVal = a._avg.totalResults || 0;
      bVal = b._avg.totalResults || 0;
    } else if (field === 'date') {
      aVal = a.lastSearched ? new Date(a.lastSearched).getTime() : 0;
      bVal = b.lastSearched ? new Date(b.lastSearched).getTime() : 0;
    }

    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const sortedZeroResults = [...zeroResultQueries].sort((a, b) => {
    const { field, direction } = zeroResultsSort;
    if (!direction) return 0;

    let aVal: any, bVal: any;
    if (field === 'query') {
      aVal = a.query.toLowerCase();
      bVal = b.query.toLowerCase();
    } else if (field === 'frequency') {
      aVal = a._count.query;
      bVal = b._count.query;
    } else if (field === 'date') {
      aVal = a.lastSearched ? new Date(a.lastSearched).getTime() : 0;
      bVal = b.lastSearched ? new Date(b.lastSearched).getTime() : 0;
    }

    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const sortedDocuments = [...topDocuments].sort((a, b) => {
    const { field, direction } = documentsSort;
    if (!direction) return 0;

    let aVal: any, bVal: any;
    if (field === 'title') {
      aVal = a.title.toLowerCase();
      bVal = b.title.toLowerCase();
    } else if (field === 'number') {
      aVal = a.documentNumber || '';
      bVal = b.documentNumber || '';
    } else if (field === 'type') {
      aVal = a.type.toLowerCase();
      bVal = b.type.toLowerCase();
    } else if (field === 'views') {
      aVal = a.viewCount;
      bVal = b.viewCount;
    } else if (field === 'date') {
      aVal = a.lastViewed ? new Date(a.lastViewed).getTime() : 0;
      bVal = b.lastViewed ? new Date(b.lastViewed).getTime() : 0;
    }

    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  // Si está verificando autenticación
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
          <p className="text-gray-600">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  // Si no es SUPER_ADMIN
  if (!user || user.role !== 'SUPER_ADMIN') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-50">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <ShieldAlert className="mx-auto text-red-500 mb-4" size={64} />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acceso Restringido</h2>
          <p className="text-gray-600">Esta página solo está disponible para Super Administradores.</p>
        </div>
      </div>
    );
  }

  // Si está cargando datos
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
          <p className="text-gray-600">Cargando analytics...</p>
        </div>
      </div>
    );
  }

  // Si hay error
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="text-red-500" size={24} />
            <h3 className="font-semibold text-red-900">Error</h3>
          </div>
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => loadAnalytics()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Calcular totales para las cards
  const totalSearches = topQueries.reduce((sum, q) => sum + q._count.query, 0);
  const totalZeroResults = zeroResultQueries.reduce((sum, q) => sum + q._count.query, 0);

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col gap-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Analíticas de Búsqueda
                </h1>
                <p className="text-gray-600">
                  Métricas y estadísticas del sistema de búsqueda
                </p>
              </div>

              {/* Period Selector */}
              <div className="bg-white px-4 py-3 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center gap-3 mb-3">
                  <Activity size={16} className="text-gray-400" />
                  <button
                    onClick={() => setUseCustomRange(false)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      !useCustomRange
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Rango Predefinido
                  </button>
                  <button
                    onClick={() => setUseCustomRange(true)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      useCustomRange
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Rango Personalizado
                  </button>
                </div>

                {!useCustomRange ? (
                  <select
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white text-sm text-gray-700 cursor-pointer"
                  >
                    <option value={7}>Últimos 7 días</option>
                    <option value={30}>Últimos 30 días</option>
                    <option value={90}>Últimos 90 días</option>
                  </select>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">Fecha Inicio</label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">Fecha Fin</label>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (startDate && endDate) {
                            setApplyTrigger(prev => prev + 1); // Trigger para recargar
                          }
                        }}
                        disabled={!startDate || !endDate}
                        className="flex-1 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                      >
                        Aplicar
                      </button>
                      <button
                        onClick={() => {
                          setStartDate('');
                          setEndDate('');
                          setUseCustomRange(false);
                          // Si el selector ya está en 30 días, forzar recarga
                          if (days === 30) {
                            setApplyTrigger(prev => prev + 1);
                          } else {
                            setDays(30); // Esto dispara el useEffect automáticamente
                          }
                        }}
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 transition-colors"
                      >
                        Limpiar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {/* Total Searches */}
          <MetricCard
            title="Total Búsquedas"
            value={totalSearches.toLocaleString()}
            icon={<BarChart3 size={24} />}
            iconColor="text-blue-600"
            iconBg="bg-blue-50"
            subtitle={totalSearches > 0 ? `${topQueries.length} consultas únicas` : ''}
          />

          {/* Zero Results */}
          <MetricCard
            title="Sin Resultados"
            value={totalZeroResults.toLocaleString()}
            subtitle={totalSearches > 0 ? `${((totalZeroResults / totalSearches) * 100).toFixed(1)}% del total` : ''}
            icon={<AlertCircle size={24} />}
            iconColor="text-amber-600"
            iconBg="bg-amber-50"
          />

          {/* Top Documents Views */}
          <MetricCard
            title="Documentos Visitados"
            value={topDocuments.reduce((sum, doc) => sum + doc.viewCount, 0).toLocaleString()}
            icon={<Eye size={24} />}
            iconColor="text-emerald-600"
            iconBg="bg-emerald-50"
            subtitle={`${topDocuments.length} documentos únicos`}
          />
        </div>

        {/* Top Queries Table */}
        <div className="bg-white rounded-lg shadow-sm mb-6 overflow-hidden border border-gray-200">
            <div className="bg-gradient-to-r from-slate-50 to-gray-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <TrendingUp size={20} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Búsquedas Más Populares
                  </h2>
                  <p className="text-sm text-gray-500">Top 10 consultas más frecuentes</p>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      #
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleTopQueriesSort('query')}
                    >
                      <div className="flex items-center gap-1">
                        Búsqueda
                        {topQueriesSort.field === 'query' ? (
                          topQueriesSort.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                        ) : (
                          <ArrowUpDown size={14} className="text-gray-400" />
                        )}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleTopQueriesSort('frequency')}
                    >
                      <div className="flex items-center gap-1">
                        Frecuencia
                        {topQueriesSort.field === 'frequency' ? (
                          topQueriesSort.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                        ) : (
                          <ArrowUpDown size={14} className="text-gray-400" />
                        )}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleTopQueriesSort('avgResults')}
                    >
                      <div className="flex items-center gap-1">
                        Resultados Prom.
                        {topQueriesSort.field === 'avgResults' ? (
                          topQueriesSort.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                        ) : (
                          <ArrowUpDown size={14} className="text-gray-400" />
                        )}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleTopQueriesSort('date')}
                    >
                      <div className="flex items-center gap-1">
                        Última Búsqueda
                        {topQueriesSort.field === 'date' ? (
                          topQueriesSort.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                        ) : (
                          <ArrowUpDown size={14} className="text-gray-400" />
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {sortedTopQueries.length > 0 ? (
                    sortedTopQueries.map((query, index) => (
                      <tr key={index} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-600 font-medium text-sm">
                            {index + 1}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {query.query}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                            {query._count.query}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {query._avg.totalResults?.toFixed(1) ?? '0.0'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {query.lastSearched ? new Date(query.lastSearched).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : 'N/A'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <p className="text-gray-500 text-sm">No hay búsquedas en este período</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        {/* Zero Results Queries Table */}
        <div className="bg-white rounded-lg shadow-sm mb-6 overflow-hidden border border-gray-200">
            <div className="bg-gradient-to-r from-slate-50 to-gray-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="bg-amber-100 p-2 rounded-lg">
                  <AlertCircle size={20} className="text-amber-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Búsquedas Sin Resultados
                  </h2>
                  <p className="text-sm text-gray-500">Oportunidades para mejorar el contenido</p>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      #
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleZeroResultsSort('query')}
                    >
                      <div className="flex items-center gap-1">
                        Búsqueda
                        {zeroResultsSort.field === 'query' ? (
                          zeroResultsSort.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                        ) : (
                          <ArrowUpDown size={14} className="text-gray-400" />
                        )}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleZeroResultsSort('frequency')}
                    >
                      <div className="flex items-center gap-1">
                        Frecuencia
                        {zeroResultsSort.field === 'frequency' ? (
                          zeroResultsSort.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                        ) : (
                          <ArrowUpDown size={14} className="text-gray-400" />
                        )}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleZeroResultsSort('date')}
                    >
                      <div className="flex items-center gap-1">
                        Última Búsqueda
                        {zeroResultsSort.field === 'date' ? (
                          zeroResultsSort.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                        ) : (
                          <ArrowUpDown size={14} className="text-gray-400" />
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {sortedZeroResults.length > 0 ? (
                    sortedZeroResults.map((query, index) => (
                      <tr key={index} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-600 font-medium text-sm">
                            {index + 1}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {query.query}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100">
                            {query._count.query}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {query.lastSearched ? new Date(query.lastSearched).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : 'N/A'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center">
                        <p className="text-gray-500 text-sm">No hay búsquedas sin resultados en este período</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        {/* Top Viewed Documents Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
          <div className="bg-gradient-to-r from-slate-50 to-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-100 p-2 rounded-lg">
                <Eye size={20} className="text-emerald-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Documentos Más Visitados
                </h2>
                <p className="text-sm text-gray-500">Contenido más consultado por los usuarios</p>
              </div>
            </div>
          </div>
          {topDocuments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      #
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleDocumentsSort('title')}
                    >
                      <div className="flex items-center gap-1">
                        Título
                        {documentsSort.field === 'title' ? (
                          documentsSort.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                        ) : (
                          <ArrowUpDown size={14} className="text-gray-400" />
                        )}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleDocumentsSort('number')}
                    >
                      <div className="flex items-center gap-1">
                        Número
                        {documentsSort.field === 'number' ? (
                          documentsSort.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                        ) : (
                          <ArrowUpDown size={14} className="text-gray-400" />
                        )}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleDocumentsSort('type')}
                    >
                      <div className="flex items-center gap-1">
                        Tipo
                        {documentsSort.field === 'type' ? (
                          documentsSort.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                        ) : (
                          <ArrowUpDown size={14} className="text-gray-400" />
                        )}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleDocumentsSort('views')}
                    >
                      <div className="flex items-center gap-1">
                        Visitas
                        {documentsSort.field === 'views' ? (
                          documentsSort.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                        ) : (
                          <ArrowUpDown size={14} className="text-gray-400" />
                        )}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleDocumentsSort('date')}
                    >
                      <div className="flex items-center gap-1">
                        Última Visita
                        {documentsSort.field === 'date' ? (
                          documentsSort.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                        ) : (
                          <ArrowUpDown size={14} className="text-gray-400" />
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {sortedDocuments.map((doc, index) => (
                    <tr key={index} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-600 font-medium text-sm">
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        <span className="max-w-md truncate">{doc.title}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <span className="font-mono text-xs bg-gray-50 px-2 py-1 rounded border border-gray-200">
                          {doc.documentNumber || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200">
                          {doc.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                          {doc.viewCount}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {doc.lastViewed ? new Date(doc.lastViewed).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4">
                <Eye size={32} className="text-slate-400" />
              </div>
              <h3 className="text-base font-medium text-gray-900 mb-2">No hay datos de visitas todavía</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                Las visitas se registrarán automáticamente cuando los usuarios accedan a los documentos.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  trend?: string;
  trendUp?: boolean;
}

function MetricCard({ title, value, subtitle, icon, iconColor, iconBg }: MetricCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={`${iconBg} p-3 rounded-lg`}>
          <div className={iconColor}>{icon}</div>
        </div>
      </div>
      <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">{title}</h3>
      <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
      {subtitle && (
        <p className="text-sm text-gray-500">
          {subtitle}
        </p>
      )}
    </div>
  );
}
