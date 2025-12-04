# Flujo de Revisión Humana - Guía de Testing

## Descripción

Este documento describe cómo probar el flujo de revisión humana para documentos procesados.

## Diagrama de Estados

```
                    ┌─────────────┐
                    │   DRAFT     │ (Documento creado o rechazado)
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │ submit-review    │                  │
        │ (OWNER/MEMBER)   │                  │
        ▼                  │                  │
┌───────────────┐          │                  │
│  IN_REVIEW    │──────────┘                  │
└───────┬───────┘                             │
        │                                     │
        │ review (EDITOR/ADMIN)               │
        │                                     │
        ├── approved=true ───────────────────►│
        │                                     │
        │                          ┌──────────┴──────────┐
        │                          │     PUBLISHED       │ (Estado terminal)
        │                          │  (NO puede volver)  │
        │                          └─────────────────────┘
        │
        └── approved=false (con rejectionReason)
                    │
                    ▼
            ┌─────────────┐
            │   DRAFT     │ (Corregir y reenviar)
            └─────────────┘
```

## Reglas de Transición

| Estado Actual | Acción Permitida | Estado Resultante | Roles |
|---------------|------------------|-------------------|-------|
| DRAFT | submit-review | IN_REVIEW | ACCOUNT_OWNER, MEMBER |
| DRAFT | review (approved=true) | PUBLISHED | EDITOR, ADMIN, SUPER_ADMIN |
| DRAFT | review (approved=false) | DRAFT | EDITOR, ADMIN, SUPER_ADMIN |
| IN_REVIEW | review (approved=true) | PUBLISHED | EDITOR, ADMIN, SUPER_ADMIN |
| IN_REVIEW | review (approved=false) | DRAFT | EDITOR, ADMIN, SUPER_ADMIN |
| PUBLISHED | ❌ Ninguna | - | - |

**Regla importante:** Un documento PUBLISHED **NO puede** volver a IN_REVIEW, DRAFT o cualquier otro estado del flujo de revisión.

## Endpoints

### 1. Enviar documento a revisión

```
PATCH /api/documents/:id/submit-review
```

**Autorización:** JWT Token de usuario con rol ACCOUNT_OWNER o MEMBER

**Prerrequisito:** Documento debe estar en status DRAFT

### 2. Revisar documento (aprobar/rechazar)

```
PATCH /api/documents/:id/review
```

**Autorización:** JWT Token de usuario con rol EDITOR, ADMIN o SUPER_ADMIN

**Prerrequisito:** Documento debe estar en status DRAFT o IN_REVIEW

## Prerequisitos para Testing

### 1. Obtener Token JWT

```bash
# Login como admin
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@email.com",
    "password": "your_password"
  }'
```

**Respuesta esperada:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "email": "admin@email.com",
    "role": "SUPER_ADMIN"
  }
}
```

### 2. Crear documento para revisión (vía import URL)

```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X POST http://localhost:8080/api/documents/import-url \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "url": "https://example.com/documento.pdf",
    "title": "Documento de Prueba",
    "type": "LEY",
    "issuingEntity": "Congreso de la República"
  }'
```

**Respuesta esperada (202 Accepted):**
```json
{
  "id": "cmhl...",
  "title": "Documento de Prueba",
  "status": "DRAFT",
  "processingStatus": "PENDING",
  "message": "Documento creado y en cola para procesamiento"
}
```

### 3. Verificar estado del documento

Esperar a que el procesamiento termine (processingStatus cambie de PENDING a COMPLETED o FAILED):

```bash
curl -X GET http://localhost:8080/api/documents/{document_id} \
  -H "Authorization: Bearer $TOKEN"
```

---

## Casos de Prueba

### Caso 0: Enviar documento a revisión (submit-review)

**Request:**
```bash
curl -X PATCH http://localhost:8080/api/documents/{document_id}/submit-review \
  -H "Authorization: Bearer $TOKEN"
```

**Respuesta esperada (200 OK):**
```json
{
  "id": "cmhl...",
  "title": "Documento de Prueba",
  "status": "IN_REVIEW",
  "submittedBy": "cmhl...",
  "submittedAt": "2024-01-15T10:30:00.000Z",
  "message": "Document \"Documento de Prueba\" has been submitted for review."
}
```

**Cambios en base de datos:**
- `status` → `IN_REVIEW`
- `updatedBy` → ID del usuario que envió
- `updatedAt` → timestamp actual

**Error si no está en DRAFT (409 Conflict):**
```json
{
  "statusCode": 409,
  "message": "Document cannot be submitted for review. Current status: IN_REVIEW. Only documents in DRAFT status can be submitted for review.",
  "error": "Conflict"
}
```

---

### Caso 1: Aprobar documento sin cambios

**Request:**
```bash
curl -X PATCH http://localhost:8080/api/documents/{document_id}/review \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "approved": true
  }'
```

**Respuesta esperada (200 OK):**
```json
{
  "id": "cmhl...",
  "title": "Documento de Prueba",
  "status": "PUBLISHED",
  "reviewedBy": "cmhl...",
  "reviewedAt": "2024-01-15T10:30:00.000Z",
  "rejectionReason": null,
  "message": "Documento aprobado y publicado exitosamente"
}
```

**Cambios en base de datos:**
- `status` → `PUBLISHED`
- `reviewedBy` → ID del usuario que aprobó
- `reviewedAt` → timestamp actual
- `publishedBy` → ID del usuario que aprobó
- `publishedAt` → timestamp actual
- `rejectionReason` → null (limpiado si existía)

---

### Caso 2: Aprobar documento con modificaciones de metadatos

**Request:**
```bash
curl -X PATCH http://localhost:8080/api/documents/{document_id}/review \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "approved": true,
    "title": "Ley 1234 de 2024 - Código Comercial Actualizado",
    "scope": "NACIONAL",
    "summary": "Esta ley actualiza y moderniza el Código de Comercio colombiano, incluyendo disposiciones sobre comercio electrónico.",
    "tags": ["comercio", "empresas", "e-commerce", "contratos"]
  }'
```

**Respuesta esperada (200 OK):**
```json
{
  "id": "cmhl...",
  "title": "Ley 1234 de 2024 - Código Comercial Actualizado",
  "status": "PUBLISHED",
  "reviewedBy": "cmhl...",
  "reviewedAt": "2024-01-15T10:30:00.000Z",
  "rejectionReason": null,
  "message": "Documento aprobado y publicado exitosamente"
}
```

**Cambios adicionales:**
- `title` → nuevo título
- `scope` → `NACIONAL`
- `summary` → nuevo resumen
- `keywords` → nuevos tags (nota: en BD se guarda como `keywords`)

---

### Caso 3: Rechazar documento con razón

**Request:**
```bash
curl -X PATCH http://localhost:8080/api/documents/{document_id}/review \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "approved": false,
    "rejectionReason": "El texto extraído está incompleto. Faltan los artículos 15 al 20. Por favor, verificar el PDF original y re-procesar."
  }'
```

**Respuesta esperada (200 OK):**
```json
{
  "id": "cmhl...",
  "title": "Documento de Prueba",
  "status": "DRAFT",
  "reviewedBy": "cmhl...",
  "reviewedAt": "2024-01-15T10:30:00.000Z",
  "rejectionReason": "El texto extraído está incompleto. Faltan los artículos 15 al 20. Por favor, verificar el PDF original y re-procesar.",
  "message": "Documento rechazado. Razón registrada."
}
```

**Cambios en base de datos:**
- `status` → `DRAFT` (permanece o vuelve a DRAFT)
- `reviewedBy` → ID del usuario que rechazó
- `reviewedAt` → timestamp actual
- `rejectionReason` → razón del rechazo

---

### Caso 4: Rechazar sin razón (Error esperado)

**Request:**
```bash
curl -X PATCH http://localhost:8080/api/documents/{document_id}/review \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "approved": false
  }'
```

**Respuesta esperada (400 Bad Request):**
```json
{
  "statusCode": 400,
  "message": ["rejectionReason is required when approved is false"],
  "error": "Bad Request"
}
```

---

### Caso 5: Revisar documento ya publicado (Error esperado)

Si el documento ya tiene status PUBLISHED:

**Request:**
```bash
curl -X PATCH http://localhost:8080/api/documents/{document_id}/review \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "approved": true
  }'
```

**Respuesta esperada (400 Bad Request):**
```json
{
  "statusCode": 400,
  "message": "Documento no está en estado de revisión. Estado actual: PUBLISHED",
  "error": "Bad Request"
}
```

---

### Caso 6: Sin autorización (Error esperado)

**Request sin token:**
```bash
curl -X PATCH http://localhost:8080/api/documents/{document_id}/review \
  -H "Content-Type: application/json" \
  -d '{
    "approved": true
  }'
```

**Respuesta esperada (401 Unauthorized):**
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

---

### Caso 7: Usuario sin permisos (Error esperado)

Con token de usuario con rol USER (no EDITOR/ADMIN):

**Respuesta esperada (403 Forbidden):**
```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

---

## Criterios para Aprobar un Documento

Antes de aprobar un documento procesado, el revisor debe verificar:

1. **Calidad del texto extraído**
   - El texto es legible y coherente
   - No hay caracteres ilegibles o corruptos
   - Los párrafos y secciones están correctamente separados

2. **Completitud**
   - El documento completo fue procesado
   - No faltan secciones importantes
   - Los artículos/capítulos están todos presentes

3. **Metadatos correctos**
   - El título refleja correctamente el contenido
   - El tipo de documento es correcto (LEY, DECRETO, etc.)
   - El scope (NACIONAL, DEPARTAMENTAL, MUNICIPAL) es correcto
   - La entidad emisora es correcta

4. **Resumen adecuado**
   - El resumen generado captura los puntos principales
   - No contiene errores factuales
   - Es útil para búsquedas

5. **Tags/Keywords**
   - Los tags son relevantes al contenido
   - Cubren los temas principales del documento
   - No hay tags spam o irrelevantes

---

## Criterios para Rechazar un Documento

Un documento debe rechazarse cuando:

1. **Problemas de extracción**
   - Texto ilegible o corrupto
   - Faltan secciones significativas
   - PDF protegido o dañado

2. **Metadatos incorrectos**
   - Título completamente erróneo
   - Tipo de documento mal clasificado
   - Entidad emisora incorrecta

3. **Problemas de calidad**
   - Resumen inadecuado o con errores
   - Tags irrelevantes o engañosos
   - Contenido duplicado con otro documento

4. **Problemas legales/contenido**
   - Documento no es de carácter legal
   - Contenido sensible no apto para publicación
   - Violación de derechos de autor

Al rechazar, siempre incluir en `rejectionReason`:
- Descripción específica del problema
- Sugerencia de acción correctiva (si aplica)
- Referencia a secciones problemáticas

---

## Flujo Completo de Testing

```
1. Login → Obtener TOKEN (admin/editor para revisión)
2. POST /documents/import-url → Crear documento (status: DRAFT, processingStatus: PENDING)
3. Esperar procesamiento → (processingStatus: COMPLETED)
4. GET /documents/:id → Ver documento procesado
5. (Opcional) PATCH /documents/:id/submit-review → Enviar a revisión (status: IN_REVIEW)
6. PATCH /documents/:id/review → Aprobar o Rechazar
   - approved=true → status: PUBLISHED (estado terminal)
   - approved=false → status: DRAFT (puede ser corregido y reenviado)
7. GET /documents/:id → Verificar cambios
```

### Flujo Editorial Completo

```
Creador (MEMBER/OWNER)           Revisor (EDITOR/ADMIN)
        │                               │
        ▼                               │
   Crear documento                      │
   (status: DRAFT)                      │
        │                               │
        ▼                               │
   Enviar a revisión ────────────────►  │
   (submit-review)                      │
   (status: IN_REVIEW)                  │
        │                               ▼
        │                          Revisar documento
        │                          (review)
        │                               │
        │               ┌───────────────┼───────────────┐
        │               │               │               │
        │               ▼               │               ▼
        │          Aprobar              │           Rechazar
        │     (status: PUBLISHED)       │      (status: DRAFT)
        │               │               │               │
        │               │               │               ▼
        │               │               │    Corregir documento
        │               │               │               │
        │               │               │               ▼
        │               │               └──────── Reenviar ◄─┘
        │               │
        │               ▼
        │         FIN (Publicado)
        │
```

## Variables de Entorno para Testing

```bash
# Backend URL
BASE_URL=http://localhost:8080

# Token de admin (obtener de login)
TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Document ID para testing
DOC_ID=cmhl...
```

## Script de Testing Automatizado

```bash
#!/bin/bash
BASE_URL="http://localhost:8080"
TOKEN="YOUR_TOKEN_HERE"
DOC_ID="YOUR_DOC_ID_HERE"

# Test 1: Aprobar sin cambios
echo "=== Test 1: Aprobar sin cambios ==="
curl -X PATCH "$BASE_URL/api/documents/$DOC_ID/review" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"approved": true}'

# Test 2: Rechazar sin razón (debe fallar)
echo -e "\n\n=== Test 2: Rechazar sin razón (debe fallar) ==="
curl -X PATCH "$BASE_URL/api/documents/$DOC_ID/review" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"approved": false}'

# Test 3: Rechazar con razón
echo -e "\n\n=== Test 3: Rechazar con razón ==="
curl -X PATCH "$BASE_URL/api/documents/$DOC_ID/review" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"approved": false, "rejectionReason": "Texto incompleto"}'
```
