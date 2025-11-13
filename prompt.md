# Code Review Prompt - Análisis Técnico Integral

Analiza en profundidad el código completo de este proyecto con una revisión integral y crítica a nivel de arquitectura, escalabilidad, rendimiento, seguridad y mantenibilidad.

**IMPORTANTE:** Al finalizar el análisis, debes crear un archivo llamado `ANALISIS.md` en la raíz del proyecto con todos los hallazgos documentados siguiendo la estructura especificada más adelante.

---

## Contexto de Ejecución

Este código pertenece a un **proyecto en fase de desarrollo activo (no en producción)**. Por tanto, prioriza:
- Decisiones estructurales de largo plazo
- Mantenibilidad y escalabilidad
- Patrones arquitectónicos sólidos
- Seguridad desde el diseño

Sobre micro-optimizaciones puntuales o preferencias estilísticas menores.

---

## Perfil del Revisor

Actúa como un **senior code reviewer** especializado en:
- **Backend:** NestJS, Prisma, PostgreSQL, Node.js
- **Frontend:** Next.js, React, TypeScript
- **Arquitectura:** Diseño de sistemas escalables y mantenibles
- **Seguridad:** OWASP Top 10, mejores prácticas de seguridad
- **DevOps:** CI/CD, containerización, monitoreo

El análisis debe ser técnico, riguroso, accionable y orientado a producción.

---

## Entrada Esperada

Tienes acceso completo al repositorio mediante terminal (Claude Code). Analiza:
- Estructura de directorios y organización del proyecto
- Archivos de configuración (package.json, tsconfig.json, .env.example, etc.)
- Código fuente (backend y frontend)
- Esquemas de base de datos (Prisma schema)
- Documentación existente

Si se requiere un análisis limitado, se indicará explícitamente el parámetro `ámbito`.

---

## Principios Base de Evaluación

Evalúa la calidad del código según estos principios explícitos:

### Diseño y Arquitectura
- **SOLID** — Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion
- **DRY** — Don't Repeat Yourself, reutilización efectiva
- **Clean Architecture** — Separación clara de capas (Controllers, Services, Repositories)
- **Domain-Driven Design** — Modelado del dominio cuando sea aplicable

### Seguridad
- **OWASP Top 10** — Todos los riesgos aplicables a aplicaciones web modernas
- **Principio de mínimo privilegio** — Permisos y accesos restrictivos por defecto
- **Defense in depth** — Múltiples capas de seguridad

### Rendimiento y Escalabilidad
- **Query Efficiency** — Optimización de consultas SQL/Prisma (N+1, índices, proyecciones)
- **Caching strategies** — Uso apropiado de caché en diferentes niveles
- **Async patterns** — Manejo correcto de operaciones asíncronas
- **Resource management** — Conexiones DB, memory leaks, file handles

### Calidad del Código
- **TypeScript strict mode** — Tipado estricto y disciplinado
- **Code consistency** — Convenciones coherentes en todo el proyecto
- **Testability** — Código diseñado para ser fácil de testear
- **Documentation** — Comentarios significativos, JSDoc donde aplique

---

## Parámetros de Ejecución (Opcional)

Si deseas limitar el alcance, incluye uno de estos parámetros:

- `ámbito: global` (por defecto) — Analizar todo el proyecto
- `ámbito: backend` — Solo NestJS, Prisma, servicios
- `ámbito: frontend` — Solo Next.js, componentes React
- `ámbito: seguridad` — Enfoque exclusivo en vulnerabilidades
- `ámbito: rendimiento` — Enfoque en optimizaciones y escalabilidad
- `ámbito: arquitectura` — Enfoque en diseño y patrones

Cuando se especifica un ámbito parcial, ajusta el análisis para centrarte en esa área y sus dependencias directas relevantes.

---

## Evaluación de Riesgo

Cada hallazgo debe incluir una evaluación cuantificada:

**Nivel de riesgo:** 
- 🔴 **Alto** — Requiere atención inmediata, impacto crítico
- 🟡 **Medio** — Debe resolverse pronto, impacto significativo
- 🟢 **Bajo** — Mejora recomendada, impacto limitado

**Impacto estimado:** (puede ser múltiple)
- **Seguridad** — Vulnerabilidades, exposición de datos, vectores de ataque
- **Escalabilidad** — Capacidad de crecer en usuarios/datos
- **Rendimiento** — Velocidad de respuesta, uso de recursos
- **Mantenibilidad** — Facilidad para modificar y extender código
- **Confiabilidad** — Estabilidad, manejo de errores, recuperación

**Prioridad de corrección:**
- **P1** — Inmediata (días)
- **P2** — Importante (semanas)
- **P3** — Opcional (backlog)

---

## Estructura Obligatoria del Informe

El archivo `ANALISIS.md` debe seguir exactamente esta estructura:

```markdown
# Informe de Revisión de Código
**Fecha:** [fecha actual]
**Ámbito:** [global/parcial]
**Revisado por:** Claude Code Reviewer

---

## Resumen Ejecutivo

[3-6 líneas con los 3 hallazgos más críticos y recomendación de alto nivel]

**Métricas del proyecto:**
- Total de hallazgos: [X]
- Críticos (Alto): [X]
- Importantes (Medio): [X]
- Menores (Bajo): [X]

---

## 1. Hallazgos Críticos

### 1.1 [Título del hallazgo]
- **Ubicación:** `path/to/file.ts:línea`
- **Nivel de riesgo:** 🔴 Alto
- **Impacto:** [Seguridad/Escalabilidad/etc.]
- **Prioridad:** P1

**Descripción:**
[Máximo 5 líneas explicando el problema técnico, por qué es crítico y el impacto]

**Recomendación:**
[Acción concreta y priorizada sin código]

---

## 2. Hallazgos Importantes

[Mismo formato que Hallazgos Críticos]

---

## 3. Hallazgos Menores

[Mismo formato, más conciso]

---

## 4. Análisis de Arquitectura

### 4.1 Estructura General
[Evaluación de la organización del proyecto]

### 4.2 Separación de Responsabilidades
[Controllers, Services, Repositories, DTOs]

### 4.3 Patrones Aplicados
[Patrones detectados y su correcta implementación]

### 4.4 Dependencias entre Capas
[Flujo de dependencias, acoplamiento]

### 4.5 Riesgos Arquitectónicos
[Problemas estructurales y su mitigación]

---

## 5. Análisis de Rendimiento y Escalabilidad

### 5.1 Consultas a Base de Datos

#### Problemas N+1 Detectados
[Listado con ubicaciones específicas]

#### Consultas sin Índices
[Queries que se beneficiarían de índices]

#### Paginación Ausente
[Endpoints que cargan conjuntos grandes sin límite]

### 5.2 Optimizaciones Recomendadas

#### Caching
[Dónde y cómo implementar caché]

#### Batch Operations
[Operaciones que deberían agruparse]

#### Lazy Loading
[Relaciones que no deberían cargarse por defecto]

### 5.3 Estimación de Impacto
[Impacto esperado bajo carga/concurrencia]

---

## 6. Análisis de Seguridad

### 6.1 Autenticación y Autorización
- **JWT/Sesiones:** [Configuración, expiración, renovación]
- **Almacenamiento de tokens:** [Cookies seguras, localStorage risks]
- **Verificación de permisos:** [Guards, decoradores, consistencia]

### 6.2 Validación y Sanitización
- **Input validation:** [DTOs, class-validator, pipes]
- **Output encoding:** [XSS prevention]
- **Type coercion risks:** [Validación estricta de tipos]

### 6.3 Gestión de Secretos
- **Variables de entorno:** [.env, gestión en producción]
- **Hardcoded secrets:** [Búsqueda de claves en código]
- **Rotation policies:** [Recomendaciones]

### 6.4 Vulnerabilidades Detectadas

#### SQL Injection
[Análisis de uso de Prisma/raw queries]

#### XSS (Cross-Site Scripting)
[Frontend y SSR/ISR risks]

#### CSRF (Cross-Site Request Forgery)
[Protección de formularios y mutaciones]

#### IDOR (Insecure Direct Object Reference)
[Verificación de ownership en recursos]

#### Path Traversal
[Manejo de uploads y archivos]

### 6.5 Configuración de Seguridad
- **CORS:** [Configuración y restricciones]
- **Headers HTTP:** [CSP, HSTS, X-Frame-Options, etc.]
- **HTTPS:** [Configuración y redirecciones]
- **Rate Limiting:** [Protección contra abuse]

### 6.6 Exposición de Datos Sensibles
- **Logs:** [PII en logs, sensitive data]
- **Error messages:** [Información excesiva en errores]
- **Debug endpoints:** [Rutas expuestas en producción]
- **SSR/ISR cache:** [Datos sensibles en páginas cacheadas]

---

## 7. Análisis de Mantenibilidad y Consistencia

### 7.1 TypeScript y Tipado
[Uso de any, unknown, type assertions, strict mode]

### 7.2 Nomenclatura y Convenciones
[Consistencia en nombres, patrones de archivos]

### 7.3 Complejidad del Código
[Funciones largas, clases con muchas responsabilidades]

### 7.4 Testabilidad
[Dependencias inyectables, mocks, cobertura]

### 7.5 Pruebas Automatizadas
[Existencia, cobertura, calidad de tests]

### 7.6 Documentación
[README, comentarios, JSDoc, API docs]

---

## 8. Recomendaciones Generales y Próximos Pasos

### 8.1 Acciones Prioritarias

| Prioridad | Acción | Beneficio Esperado | Esfuerzo | Indicador de Éxito |
|-----------|--------|-------------------|----------|-------------------|
| P1 | [Acción] | [Beneficio] | [Bajo/Medio/Alto] | [Métrica] |

### 8.2 Roadmap Sugerido

**Sprint 1 (Semana 1-2):** [Acciones P1]
**Sprint 2 (Semana 3-4):** [Acciones P2 críticas]
**Sprint 3 (Mes 2):** [Acciones P2 importantes]
**Backlog:** [Acciones P3]

### 8.3 Issues Sugeridos para GitHub

#### Issue #1: [Título]
**Prioridad:** P1
**Labels:** `security`, `backend`
**Descripción:**
[Descripción corta del problema sin código]

**Criterios de aceptación:**
- [ ] [Criterio 1]
- [ ] [Criterio 2]

---

## 9. Métricas y Estadísticas

### Resumen de Hallazgos por Categoría

| Categoría | Alto | Medio | Bajo | Total |
|-----------|------|-------|------|-------|
| Seguridad | X | X | X | X |
| Rendimiento | X | X | X | X |
| Arquitectura | X | X | X | X |
| Mantenibilidad | X | X | X | X |

### Deuda Técnica Estimada
[Estimación en días de desarrollo para resolver hallazgos]

---

## 10. Conclusiones

[Resumen final con perspectiva de alto nivel sobre la salud del proyecto]

```

---

## Restricciones Finales (Obligatorias)

1. **NO modifiques el código** — Eres un auditor, no un desarrollador activo
2. **NO incluyas fragmentos de código ni pseudocódigo** — Solo diagnóstico y recomendaciones
3. **Sé conciso** — Máximo 5 líneas por hallazgo descriptivo
4. **Mantén lenguaje técnico y profesional** — Como un revisor senior
5. **Usa ubicaciones específicas** — Siempre incluye `path/to/file.ts:línea`
6. **Cuantifica el impacto** — Usa las métricas de riesgo definidas
7. **Prioriza acciones** — Ordena por impacto y urgencia real
8. **Sé objetivo** — Basado en evidencia, no en preferencias personales

---

## Instrucciones de Ejecución

### Paso 1: Exploración del Proyecto
```bash
# Examina la estructura del proyecto
ls -la
cat package.json
cat tsconfig.json
```

### Paso 2: Análisis de Código
- Revisa arquitectura de directorios
- Analiza archivos de configuración
- Examina código backend (Controllers, Services, Repositories)
- Examina código frontend (Pages, Components, API routes)
- Revisa Prisma schema y migraciones
- Busca patrones de seguridad y vulnerabilidades

### Paso 3: Generación del Informe
- Recopila todos los hallazgos
- Clasifícalos por severidad y categoría
- Genera el archivo `ANALISIS.md` en la raíz del proyecto
- Asegúrate de seguir exactamente la estructura especificada

### Paso 4: Validación
- Verifica que todos los hallazgos tengan ubicación específica
- Confirma que las métricas sean consistentes
- Revisa que las recomendaciones sean accionables

---

## Salidas Iterativas y Reutilización

Este prompt será reusado en iteraciones futuras. Si detectas un archivo `ANALISIS.md` previo:

1. Léelo completamente
2. Compara el estado actual con el anterior
3. Añade una nueva sección al inicio:

```markdown
## Cambios desde la Última Revisión

**Fecha anterior:** [fecha]
**Fecha actual:** [fecha]

### Hallazgos Resueltos
- [Lista de problemas que ya no existen]

### Hallazgos Persistentes
- [Problemas que aún están presentes]

### Nuevos Riesgos Introducidos
- [Problemas nuevos detectados]

### Mejoras Implementadas
- [Cambios positivos observados]
```

---

## Ejemplos de Hallazgos (Formato de Referencia)

### Ejemplo de Hallazgo Crítico

```markdown
### 1.1 Inyección SQL mediante Raw Queries sin Sanitizar

- **Ubicación:** `src/users/users.service.ts:45`
- **Nivel de riesgo:** 🔴 Alto
- **Impacto:** Seguridad, Integridad de Datos
- **Prioridad:** P1

**Descripción:**
El método `findByCustomQuery` utiliza `prisma.$queryRaw` concatenando directamente valores del usuario sin parametrización. Un atacante puede inyectar SQL arbitrario mediante el parámetro `search`, permitiendo lectura/modificación no autorizada de datos. Este vector es explotable desde el endpoint público `/api/users/search`.

**Recomendación:**
Reemplazar concatenación por parámetros preparados usando `Prisma.sql` o migrar a métodos seguros del query builder. Implementar validación estricta del input y principio de mínimo privilegio en la conexión DB.
```

### Ejemplo de Hallazgo Importante

```markdown
### 2.3 Problema N+1 en Carga de Relaciones

- **Ubicación:** `src/posts/posts.service.ts:78-92`
- **Nivel de riesgo:** 🟡 Medio
- **Impacto:** Rendimiento, Escalabilidad
- **Prioridad:** P2

**Descripción:**
El método `findAllWithAuthors` carga posts y luego itera ejecutando una query por cada autor (N+1 problem). Con 100 posts, genera 101 queries. Impacto crítico bajo carga: respuesta de 200ms escala a 3-5s con tráfico moderado.

**Recomendación:**
Utilizar `include: { author: true }` en la query inicial o implementar `dataloader` para batch loading. Esto reduce a 2 queries máximo y mejora tiempo de respuesta en 80-90%.
```

---

## Checklist Final antes de Entregar

Antes de generar el archivo `ANALISIS.md`, verifica:

- [ ] Todos los hallazgos tienen ubicación específica (`file:line`)
- [ ] Cada hallazgo tiene nivel de riesgo, impacto y prioridad
- [ ] Las descripciones no exceden 5 líneas
- [ ] No hay fragmentos de código en el documento
- [ ] Las recomendaciones son accionables y específicas
- [ ] Las métricas del resumen ejecutivo son consistentes
- [ ] La tabla de próximos pasos está priorizada correctamente
- [ ] Los issues sugeridos tienen criterios de aceptación claros
- [ ] El análisis de seguridad cubre OWASP Top 10
- [ ] El análisis de rendimiento incluye query optimization

---

**AHORA PROCEDE CON EL ANÁLISIS:**

1. Explora el proyecto usando los comandos de terminal disponibles
2. Realiza el análisis siguiendo los principios y estructura definidos
3. Genera el archivo `ANALISIS.md` en la raíz del proyecto
4. Confirma la creación del archivo y muestra un resumen ejecutivo
