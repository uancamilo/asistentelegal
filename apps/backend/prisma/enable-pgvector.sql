-- Script para habilitar la extensión pgvector en PostgreSQL
-- Este script debe ejecutarse como superusuario (postgres)
--
-- Uso:
--   psql -U postgres -d asistentelegal -f enable-pgvector.sql
--
-- O desde psql:
--   \i enable-pgvector.sql

-- Habilitar la extensión pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Verificar que se instaló correctamente
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        RAISE NOTICE '✓ pgvector extension enabled successfully';
        RAISE NOTICE 'Version: %', (SELECT extversion FROM pg_extension WHERE extname = 'vector');
    ELSE
        RAISE EXCEPTION '✗ Failed to enable pgvector extension';
    END IF;
END $$;

-- Mostrar información de la extensión
SELECT
    extname AS "Extension Name",
    extversion AS "Version",
    extnamespace::regnamespace AS "Schema"
FROM pg_extension
WHERE extname = 'vector';
