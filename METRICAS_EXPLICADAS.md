# Métricas de Analytics - Explicación en Español

## 📊 Guía de Métricas del Dashboard de Búsquedas

---

## 1. 🔍 Total Búsquedas

### ¿Qué es?
El número total de búsquedas realizadas por los usuarios en el período seleccionado.

### ¿Cómo se calcula?
```sql
SELECT COUNT(*) FROM search_queries
WHERE created_at >= fecha_inicio
  AND created_at <= fecha_fin;
```

### ¿Qué indica?
- **Alto número**: Sistema muy utilizado, usuarios buscan información activamente
- **Bajo número**: Poca adopción o usuarios no encuentran el buscador

### Valores referenciales
- **Excelente**: > 1000 búsquedas/mes
- **Bueno**: 500-1000 búsquedas/mes
- **Bajo**: < 500 búsquedas/mes

---

## 2. 🖱️ Tasa de Clics (Click-Through Rate - CTR)

### ¿Qué es?
**La Tasa de Clics es el porcentaje de búsquedas en las que el usuario hizo click en al menos un resultado.**

Es la métrica más importante para medir si los usuarios encuentran lo que buscan.

### ¿Cómo se calcula?
```
Tasa de Clics = (Búsquedas con clicks / Total de búsquedas) × 100

Ejemplo:
- Total de búsquedas: 100
- Búsquedas donde el usuario hizo click: 72
- Tasa de Clics = (72 / 100) × 100 = 72%
```

### ¿Qué indica?
- **CTR Alto (> 70%)**: Los usuarios encuentran resultados relevantes y hacen click
- **CTR Medio (50-70%)**: Resultados aceptables pero hay margen de mejora
- **CTR Bajo (< 50%)**: Los resultados no son relevantes, usuarios no encuentran lo que buscan

### Ejemplo práctico
```
Usuario busca "derechos laborales":
├─ Ve 10 resultados
├─ Hace click en el resultado #3
└─ ✅ Esta búsqueda cuenta para la Tasa de Clics

Usuario busca "ley blockchain":
├─ Ve 0 resultados (o resultados irrelevantes)
├─ No hace click en nada
└─ ❌ Esta búsqueda NO cuenta para la Tasa de Clics
```

### En el Dashboard
```
┌────────────────────────┐
│   Tasa de Clics        │
│   ─────────────────    │
│        72.5%           │
│      Excelente         │
└────────────────────────┘
```

### Cómo mejorar una Tasa de Clics baja
1. **Mejorar relevancia**: Ajustar pesos semantic vs keyword
2. **Agregar más documentos**: Llenar gaps de contenido
3. **Optimizar títulos**: Hacer títulos más descriptivos
4. **Ajustar similarity threshold**: Reducir si hay muy pocos resultados

---

## 3. ⏱️ Tiempo Promedio de Ejecución

### ¿Qué es?
El tiempo que tarda el sistema en procesar una búsqueda y retornar resultados.

### Componentes
1. **Tiempo OpenAI**: Cuánto tarda en generar el embedding del query
2. **Tiempo pgvector**: Cuánto tarda PostgreSQL en buscar documentos similares
3. **Tiempo Total**: Suma de ambos + overhead del sistema

### ¿Qué indica?
- **< 1000ms**: Excelente - respuesta instantánea
- **1000-2000ms**: Bueno - respuesta rápida
- **> 2000ms**: Lento - puede frustrar usuarios

### Ejemplo
```
Usuario busca "código civil":
├─ OpenAI genera embedding: 456ms
├─ PostgreSQL busca documentos: 234ms
├─ Procesamiento adicional: 100ms
└─ Tiempo Total: 790ms ✅ Excelente
```

### Cómo optimizar
- **OpenAI lento**: Usar modelo más rápido (text-embedding-3-small)
- **pgvector lento**: Agregar más índices, optimizar queries
- **Ambos lentos**: Considerar cache de búsquedas populares

---

## 4. 💵 Costo OpenAI

### ¿Qué es?
El costo estimado de las llamadas a la API de OpenAI para generar embeddings.

### ¿Cómo se calcula?
```
Costo por búsqueda = (Tokens usados / 1000) × Precio por 1K tokens

Modelo: text-embedding-3-small
Precio: $0.00002 por 1K tokens
Tokens promedio: 500 tokens

Costo por búsqueda ≈ $0.00001 (0.01 centavos de dólar)
```

### Ejemplo real
```
Mes con 10,000 búsquedas:
- Tokens totales: 5,000,000 tokens
- Costo: (5,000,000 / 1,000) × $0.00002
- Costo: $0.10 USD

¡Menos de 10 centavos por 10,000 búsquedas!
```

### ¿Qué indica?
- Es una métrica informativa para presupuestar
- Generalmente es muy económico
- Útil para proyectar costos a futuro

---

## 5. ⚠️ Búsquedas Sin Resultados (Zero Results Rate)

### ¿Qué es?
El porcentaje de búsquedas que no retornaron ningún documento.

### ¿Cómo se calcula?
```
Tasa Sin Resultados = (Búsquedas con 0 resultados / Total búsquedas) × 100
```

### ¿Qué indica?
- **< 10%**: Excelente cobertura de contenido
- **10-20%**: Aceptable, algunos gaps
- **> 20%**: Problema serio - falta mucho contenido

### Ejemplo
```
Usuario busca "ley de criptomonedas":
├─ Sistema busca en base de datos
├─ No encuentra ningún documento relacionado
└─ ❌ Se registra como "búsqueda sin resultados"

Solución:
└─ Agregar documentos sobre criptomonedas
```

### Tabla en el Dashboard
Muestra exactamente qué están buscando los usuarios que no tiene resultados:

```
┌─────────────────────────────────┬─────────────┐
│ Búsqueda                        │ Frecuencia  │
├─────────────────────────────────┼─────────────┤
│ ley de blockchain               │     12      │
│ criptomonedas regulación        │      8      │
│ contratos inteligentes          │      5      │
└─────────────────────────────────┴─────────────┘

Acción requerida:
→ Agregar documentos sobre estos temas
```

---

## 6. 📊 Comparación por Tipo de Búsqueda

### Tipos de búsqueda

#### 🔍 Búsqueda Semántica (Semantic)
- **Cómo funciona**: Usa IA (OpenAI) para entender el significado
- **Ventaja**: Encuentra resultados aunque no usen las mismas palabras
- **Ejemplo**: Buscar "derechos del trabajador" encuentra "derechos laborales"

#### 🔀 Búsqueda Híbrida (Hybrid)
- **Cómo funciona**: Combina IA + búsqueda por palabras exactas
- **Ventaja**: Mejor precisión, combina lo mejor de ambos mundos
- **Recomendado**: Es el método predeterminado y más efectivo

### Comparación en el Dashboard
```
┌─────────────────────────────────────────┐
│  Semantic                               │
│  Cantidad: 234 búsquedas               │
│  Tiempo: 1,100ms                        │
│  Resultados promedio: 14.2              │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Hybrid                                 │
│  Cantidad: 189 búsquedas               │
│  Tiempo: 1,350ms                        │
│  Resultados promedio: 18.7              │
└─────────────────────────────────────────┘

Conclusión:
→ Hybrid es más popular
→ Hybrid retorna más resultados
→ Hybrid es ligeramente más lento (pero vale la pena)
```

---

## 7. 📈 Búsquedas Más Populares

### ¿Qué es?
Lista de las búsquedas más frecuentes realizadas por los usuarios.

### ¿Para qué sirve?
1. **Identificar necesidades**: Qué temas interesan más
2. **Optimizar contenido**: Mejorar documentos sobre temas populares
3. **Planificar features**: Qué secciones destacar en la UI

### Ejemplo
```
┌──────────────────────┬────────┬─────────┬────────────┐
│ Búsqueda             │ Veces  │ Tiempo  │ Resultados │
├──────────────────────┼────────┼─────────┼────────────┤
│ código civil         │   45   │ 1,123ms │    15.3    │
│ derechos laborales   │   38   │ 1,345ms │    12.1    │
│ ley de contratos     │   29   │ 1,067ms │    18.5    │
└──────────────────────┴────────┴─────────┴────────────┘

Insights:
→ "código civil" es el tema más buscado
→ Usuarios encuentran buenos resultados (15.3 promedio)
→ Sistema responde rápido (1.1 segundos)
```

---

## 🎯 Cómo Interpretar las Métricas Juntas

### Escenario 1: Sistema Saludable ✅
```
Total Búsquedas:        1,234
Tasa de Clics:          78.5% ← Excelente
Tiempo Promedio:        890ms ← Rápido
Sin Resultados:         6.2%  ← Bajo
Costo OpenAI:           $0.12 ← Económico

Diagnóstico:
✅ Usuarios encuentran lo que buscan
✅ Sistema es rápido
✅ Buena cobertura de contenido
✅ Costo controlado
```

### Escenario 2: Problema de Relevancia ⚠️
```
Total Búsquedas:        1,234
Tasa de Clics:          42.3% ← BAJO
Tiempo Promedio:        920ms ← OK
Sin Resultados:         8.1%  ← OK
Costo OpenAI:           $0.12 ← OK

Diagnóstico:
❌ Los resultados no son relevantes
→ Usuarios no hacen click
→ Ajustar pesos semantic/keyword
→ Mejorar similarity threshold
```

### Escenario 3: Faltan Documentos ⚠️
```
Total Búsquedas:        1,234
Tasa de Clics:          68.2% ← OK
Tiempo Promedio:        910ms ← OK
Sin Resultados:         24.7% ← ALTO
Costo OpenAI:           $0.12 ← OK

Diagnóstico:
❌ Muchas búsquedas sin resultados
→ Revisar tabla "Búsquedas Sin Resultados"
→ Agregar documentos sobre esos temas
→ Priorizar contenido faltante
```

### Escenario 4: Problema de Performance 🐌
```
Total Búsquedas:        1,234
Tasa de Clics:          75.1% ← OK
Tiempo Promedio:        2,845ms ← LENTO
  OpenAI:               1,980ms ← LENTO
  pgvector:             745ms   ← OK
Sin Resultados:         7.3%   ← OK
Costo OpenAI:           $0.12  ← OK

Diagnóstico:
❌ OpenAI es muy lento
→ Posible problema de red
→ Considerar cache de embeddings
→ Revisar configuración de OpenAI
```

---

## 🔔 Alertas Recomendadas

### Configurar alertas cuando:

1. **Tasa de Clics < 50%** durante 3 días consecutivos
   - Acción: Revisar relevancia de resultados

2. **Sin Resultados > 20%** durante 1 semana
   - Acción: Agregar contenido urgente

3. **Tiempo Promedio > 3000ms** durante 1 día
   - Acción: Investigar problema de performance

4. **Costo diario > $1.00** (si tu presupuesto es bajo)
   - Acción: Revisar si hay uso anómalo

5. **Total Búsquedas = 0** durante 1 día
   - Acción: Verificar que el sistema funcione

---

## 📚 Resumen de Valores Ideales

| Métrica | Excelente | Bueno | Mejorar |
|---------|-----------|-------|---------|
| **Tasa de Clics** | > 70% | 50-70% | < 50% |
| **Tiempo Promedio** | < 1000ms | 1000-2000ms | > 2000ms |
| **Sin Resultados** | < 10% | 10-20% | > 20% |
| **OpenAI Latency** | < 500ms | 500-1000ms | > 1000ms |
| **pgvector Latency** | < 300ms | 300-600ms | > 600ms |

---

## 🎓 Términos Clave

- **CTR / Tasa de Clics**: Porcentaje de búsquedas con clicks
- **Embedding**: Representación matemática del texto para IA
- **Similarity**: Qué tan parecidos son dos textos (0-1)
- **Threshold**: Umbral mínimo de similitud
- **Semantic**: Búsqueda por significado
- **Hybrid**: Búsqueda combinada (significado + palabras)
- **pgvector**: Extensión de PostgreSQL para búsqueda vectorial
- **Zero Results**: Búsquedas sin resultados

---

Esta guía te ayudará a interpretar correctamente todas las métricas del dashboard de analytics y tomar decisiones informadas para mejorar el sistema de búsqueda. 🚀
