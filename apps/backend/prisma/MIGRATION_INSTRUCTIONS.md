# Instrucciones de Migración de Base de Datos

## 📋 Resumen

Necesitas ejecutar la migración para crear las tablas de documentos en tu base de datos Neon.

---

## 🚀 OPCIÓN 1: Migración Automática con Prisma (Recomendado)

Esta es la forma más fácil y recomendada.

### Pasos:

1. **Abre tu terminal local** (no Claude Code)

2. **Navega al directorio backend:**
   ```bash
   cd apps/backend
   ```

3. **Verifica que tienes el archivo .env configurado:**
   ```bash
   cat .env | grep DATABASE_URL
   # Debe mostrar tu connection string de Neon
   ```

4. **Ejecuta la migración:**
   ```bash
   npx prisma migrate dev --name add_document_models
   ```

5. **Espera a que termine.** Verás algo como:
   ```
   ✔ Generated Prisma Client
   ✔ Migration completed successfully
   ```

6. **Verifica que las tablas se crearon:**
   ```bash
   npx prisma studio
   ```
   Se abrirá una interfaz web donde podrás ver todas las tablas creadas.

---

## 🔧 OPCIÓN 2: Migración SQL Manual

Si tienes problemas con Prisma o prefieres hacerlo manualmente.

### Método A: Desde psql (Terminal)

1. **Conecta a Neon usando psql:**
   ```bash
   psql "postgresql://usuario:password@ep-xxxx.neon.tech/asistentelegal?sslmode=require"
   ```

2. **Ejecuta el script SQL:**
   ```sql
   \i apps/backend/prisma/migrations/manual_add_document_models.sql
   ```

3. **Verifica que las tablas se crearon:**
   ```sql
   \dt
   -- Deberías ver: documents, document_versions, document_sections, document_files, etc.
   ```

### Método B: Desde Neon Dashboard

1. **Ve a tu proyecto en Neon:** https://console.neon.tech

2. **Click en "SQL Editor"**

3. **Abre el archivo** `apps/backend/prisma/migrations/manual_add_document_models.sql`

4. **Copia TODO el contenido** (Ctrl+A, Ctrl+C)

5. **Pégalo en el SQL Editor de Neon**

6. **Click en "Run"**

7. **Verifica que no hay errores**

---

## ✅ Verificación

Después de ejecutar la migración (cualquier método), verifica:

### 1. Verificar extensión pgvector:
```sql
SELECT * FROM pg_extension WHERE extname = 'vector';
```
Debe retornar 1 fila.

### 2. Verificar que las tablas existen:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'document%';
```

Debe retornar:
- documents
- document_files
- document_metadata
- document_relations
- document_sections
- document_versions

### 3. Verificar enums:
```sql
SELECT typname FROM pg_type WHERE typtype = 'e';
```

Debe incluir:
- DocumentType
- DocumentStatus
- DocumentRelationType
- ProcessingStatus
- DocumentScope

---

## 🐛 Troubleshooting

### Error: "extension 'vector' does not exist"

**Solución:**
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Error: "type vector does not exist"

**Causa:** pgvector no está instalado/habilitado.

**Solución:** Revisa `PGVECTOR_SETUP.md` en este mismo directorio.

### Error: "relation 'User' does not exist"

**Causa:** Las tablas de usuarios no existen.

**Solución:**
1. Primero ejecuta las migraciones anteriores:
   ```bash
   npx prisma migrate deploy
   ```
2. Luego ejecuta esta migración.

### Error de permisos

**Causa:** Tu usuario de Neon no tiene permisos.

**Solución:**
- Asegúrate de estar usando el usuario correcto (generalmente el owner)
- En Neon, el usuario que creas tiene todos los permisos por defecto

---

## 📝 Siguiente Paso

Una vez completada la migración exitosamente:

1. **Genera Prisma Client:**
   ```bash
   npx prisma generate
   ```

2. **Avisa a Claude Code que la migración está completa**
   - Claude Code continuará con la implementación del backend

---

## 🔍 Comandos Útiles

```bash
# Ver estado de migraciones
npx prisma migrate status

# Ver estructura de la base de datos
npx prisma studio

# Generar Prisma Client después de cambios
npx prisma generate

# Resetear base de datos (⚠️ CUIDADO: borra todos los datos)
npx prisma migrate reset

# Ver logs detallados de migración
npx prisma migrate dev --name add_document_models --create-only
# Esto crea el archivo SQL sin ejecutarlo, para que lo revises primero
```

---

## ❓ ¿Necesitas Ayuda?

Si encuentras algún problema:

1. Verifica que tu `.env` tiene `DATABASE_URL` correcta
2. Verifica que puedes conectarte a Neon: `psql "$DATABASE_URL" -c "SELECT version();"`
3. Revisa los logs de error completos
4. Comparte el error con Claude Code para ayuda específica

---

**Fecha de creación:** 2025-11-10
**Versión:** 1.0.0
