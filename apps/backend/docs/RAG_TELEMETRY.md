# RAG Telemetry & Observability

Este documento describe el sistema de telemetría y observabilidad implementado para el motor RAG (Retrieval Augmented Generation) del asistente legal.

## Descripción General

El sistema de telemetría captura métricas detalladas de cada consulta RAG, incluyendo:

- **Tiempos de ejecución** por etapa del pipeline
- **Métricas de contexto** (chunks encontrados, usados, scores)
- **Referencias de fuentes** utilizadas en la respuesta
- **Información de auditoría** (IP, userId, userAgent)

## Componentes

### 1. RagTelemetryService

Servicio centralizado para logging y persistencia de métricas.

**Ubicación:** `src/modules/assistant/application/services/RagTelemetry.service.ts`

**Responsabilidades:**
- Logging estructurado a consola (siempre activo)
- Persistencia opcional a base de datos
- Cálculo de métricas agregadas
- Consulta de logs históricos

### 2. StructuredLogger

Logger personalizado con salida JSON para fácil integración con herramientas de observabilidad.

**Ubicación:** `src/infrastructure/logging/StructuredLogger.ts`

**Características:**
- Formato JSON para CloudWatch, Datadog, ELK, etc.
- Timestamps ISO 8601
- Soporte para contexto adicional
- Niveles: debug, info, warn, error

### 3. Tabla rag_logs

Almacenamiento opcional de logs RAG en PostgreSQL.

**Migración:** `prisma/migrations/manual/005_add_rag_logs.sql`

## Campos del Log

### Timing Metrics

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `embeddingMs` | number | Tiempo para generar embedding de la pregunta |
| `vectorSearchMs` | number | Tiempo de búsqueda vectorial en pgvector |
| `contextBuildMs` | number | Tiempo para construir el contexto RAG |
| `llmResponseMs` | number | Tiempo de respuesta del LLM |
| `totalMs` | number | Tiempo total de ejecución |

### Context Metrics

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `chunksFound` | number | Chunks encontrados en la búsqueda |
| `chunksUsed` | number | Chunks efectivamente usados en el contexto |
| `avgScore` | number | Score promedio de similitud (0-1) |
| `maxScore` | number | Score máximo de similitud |
| `minScore` | number | Score mínimo de similitud |
| `contextLengthChars` | number | Longitud del contexto en caracteres |

### Source Info

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `documentId` | string | ID del documento fuente |
| `documentTitle` | string | Título del documento |
| `chunkId` | string | ID del chunk utilizado |
| `chunkIndex` | number | Índice del chunk en el documento |
| `score` | number | Score de similitud |
| `snippetLength` | number | Longitud del snippet |

## Ejemplo de Log JSON (Consola)

```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "info",
  "context": "RagTelemetry",
  "msg": "RAG query processed",
  "query": "¿Cuáles son los requisitos para constituir una empresa?",
  "queryLength": 52,
  "embeddingMs": 234,
  "vectorSearchMs": 45,
  "contextBuildMs": 2,
  "llmResponseMs": 1523,
  "totalMs": 1804,
  "chunksFound": 8,
  "chunksUsed": 4,
  "avgScore": 0.723,
  "maxScore": 0.856,
  "minScore": 0.612,
  "contextChars": 4521,
  "sourcesCount": 3,
  "success": true
}
```

## Ejemplo de Entrada en BD

```sql
SELECT * FROM rag_logs ORDER BY "createdAt" DESC LIMIT 1;
```

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "createdAt": "2024-01-15T10:30:45.123Z",
  "query": "¿Cuáles son los requisitos para constituir una empresa?",
  "sources": [
    {
      "documentId": "doc-123",
      "documentTitle": "Ley de Compañías",
      "chunkId": "chunk-456",
      "chunkIndex": 3,
      "score": 0.856,
      "snippetLength": 180
    }
  ],
  "metrics": {
    "timing": {
      "embeddingMs": 234,
      "vectorSearchMs": 45,
      "contextBuildMs": 2,
      "llmResponseMs": 1523,
      "totalMs": 1804
    },
    "context": {
      "chunksFound": 8,
      "chunksUsed": 4,
      "avgScore": 0.723,
      "maxScore": 0.856,
      "minScore": 0.612,
      "contextLengthChars": 4521
    }
  },
  "answerSummary": "Según la Ley de Compañías, los requisitos principales para constituir una empresa incluyen...",
  "ip": "192.168.1.100",
  "userId": null
}
```

## Configuración

### Variables de Entorno

| Variable | Tipo | Default | Descripción |
|----------|------|---------|-------------|
| `ASSISTANT_LOG_TO_DB` | string | `"false"` | Habilitar persistencia en BD |

### Habilitar Logging a BD

1. Aplicar la migración SQL:
```bash
psql -d asistencialegal -f apps/backend/prisma/migrations/manual/005_add_rag_logs.sql
```

2. Configurar variable de entorno:
```bash
export ASSISTANT_LOG_TO_DB=true
```

3. Reiniciar el backend

### Deshabilitar Logging a BD

```bash
export ASSISTANT_LOG_TO_DB=false
# o simplemente no definir la variable
```

## Endpoint de Auditoría

### GET /api/admin/rag-logs

Consultar logs RAG para auditoría y monitoreo.

**Autenticación:** Requerida (JWT)
**Roles permitidos:** SUPER_ADMIN, ADMIN

**Parámetros:**

| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `limit` | number | 50 | Máximo de registros (max: 100) |
| `offset` | number | 0 | Registros a saltar |
| `userId` | string | - | Filtrar por usuario (opcional) |

**Ejemplo:**
```bash
curl -X GET "http://localhost:3000/api/admin/rag-logs?limit=20&offset=0" \
  -H "Authorization: Bearer $TOKEN"
```

**Respuesta:**
```json
{
  "logs": [
    {
      "id": "...",
      "createdAt": "2024-01-15T10:30:45.123Z",
      "query": "¿Cuáles son los requisitos...?",
      "sources": [...],
      "metrics": {...},
      "answerSummary": "Según la normativa..."
    }
  ],
  "total": 150,
  "limit": 20,
  "offset": 0
}
```

## Consideraciones de Privacidad

### Lo que NO se almacena:
- **Respuestas completas del LLM** - Solo se guarda un resumen truncado (~150 chars)
- Esto evita problemas legales con almacenamiento de contenido generado

### Datos semi-sensibles:
- **Direcciones IP** - Almacenadas opcionalmente para auditoría
- **User IDs** - Solo si el usuario está autenticado

### Recomendaciones:
1. Habilitar `ASSISTANT_LOG_TO_DB` solo si necesitas auditoría persistente
2. Implementar política de retención (ej: eliminar logs > 90 días)
3. Restringir acceso al endpoint `/api/admin/rag-logs`

## Integración con Herramientas de Observabilidad

### CloudWatch Logs
Los logs JSON pueden ser parseados directamente por CloudWatch Logs Insights:

```sql
fields @timestamp, @message
| filter context = "RagTelemetry"
| stats avg(totalMs) as avg_latency by bin(1h)
```

### Datadog
Los logs estructurados son compatibles con Datadog Log Management:

```yaml
# datadog.yaml
logs:
  - type: file
    path: /var/log/asistencialegal/*.log
    service: asistencialegal-backend
    source: nodejs
```

### Grafana/Prometheus
Métricas pueden ser expuestas para Prometheus scraping:

```typescript
// Futuro: Exponer métricas en /metrics
gauge('rag_query_duration_seconds', { labels: ['stage'] })
counter('rag_queries_total', { labels: ['success'] })
```

## Troubleshooting

### Logs no aparecen en BD
1. Verificar que `ASSISTANT_LOG_TO_DB=true`
2. Verificar que la migración SQL se ejecutó
3. Revisar logs de error del backend

### Latencia alta en logs
1. La persistencia a BD es asíncrona y no bloquea la respuesta
2. Si los logs fallan, solo se registra un warning

### Endpoint admin devuelve 403
1. Verificar que el usuario tenga rol SUPER_ADMIN o ADMIN
2. Verificar que el JWT sea válido
