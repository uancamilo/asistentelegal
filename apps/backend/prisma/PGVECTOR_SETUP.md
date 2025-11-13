# Configuración de pgvector para PostgreSQL

Este documento explica cómo configurar pgvector en PostgreSQL para habilitar búsqueda vectorial con embeddings.

## ¿Qué es pgvector?

pgvector es una extensión de PostgreSQL que permite almacenar y buscar vectores de embeddings de manera eficiente. Es necesario para el sistema RAG (Retrieval-Augmented Generation) que permite búsquedas semánticas con IA.

## Requisitos

- PostgreSQL 12 o superior
- Permisos de superusuario en PostgreSQL

## Instalación de pgvector

### Opción 1: Docker (Recomendado para desarrollo)

Si usas Docker, usa la imagen oficial de PostgreSQL con pgvector pre-instalado:

```yaml
# docker-compose.yml
services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: asistentelegal
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Opción 2: Instalación manual en Linux (Ubuntu/Debian)

```bash
# Instalar dependencias
sudo apt-get update
sudo apt-get install -y postgresql-server-dev-all build-essential git

# Clonar y compilar pgvector
cd /tmp
git clone --branch v0.5.1 https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install

# Reiniciar PostgreSQL
sudo systemctl restart postgresql
```

### Opción 3: Instalación manual en macOS

```bash
# Con Homebrew
brew install pgvector
```

### Opción 4: Instalación manual en Windows

Descarga el instalador desde: https://github.com/pgvector/pgvector/releases

## Habilitar la extensión en la base de datos

Una vez instalado pgvector, ejecuta el siguiente SQL como superusuario:

```sql
-- Conectar a tu base de datos
psql -U postgres -d asistentelegal

-- Habilitar la extensión
CREATE EXTENSION IF NOT EXISTS vector;

-- Verificar que se instaló correctamente
SELECT * FROM pg_extension WHERE extname = 'vector';
```

## Script automatizado

También puedes ejecutar el script provisto:

```bash
cd /home/user/asistentelegal/apps/backend/prisma
psql -U postgres -d asistentelegal -f enable-pgvector.sql
```

## Verificación

Para verificar que pgvector está funcionando:

```sql
-- Crear una tabla de prueba
CREATE TABLE test_vectors (id bigserial PRIMARY KEY, embedding vector(3));

-- Insertar datos
INSERT INTO test_vectors (embedding) VALUES ('[1,2,3]'), ('[4,5,6]');

-- Buscar vectores similares
SELECT * FROM test_vectors ORDER BY embedding <-> '[3,2,1]' LIMIT 1;

-- Limpiar
DROP TABLE test_vectors;
```

## Notas importantes

1. **Dimensión de vectores**: Los embeddings de OpenAI `text-embedding-3-small` tienen 1536 dimensiones
2. **Tipo de datos**: En Prisma, los vectores se almacenan como `Float[]`
3. **Índices**: Para mejorar performance, se pueden crear índices IVFFlat o HNSW
4. **Límites**: pgvector soporta hasta 16,000 dimensiones por vector

## Troubleshooting

### Error: "extension 'vector' does not exist"
- Verifica que pgvector esté instalado correctamente
- Asegúrate de tener permisos de superusuario
- Reinicia PostgreSQL después de la instalación

### Error: "type 'vector' does not exist"
- La extensión no está habilitada en la base de datos
- Ejecuta `CREATE EXTENSION vector;`

### Performance lento en búsquedas
- Crea índices IVFFlat para grandes volúmenes de datos:
  ```sql
  CREATE INDEX ON documents USING ivfflat (embedding vector_cosine_ops);
  ```

## Referencias

- Documentación oficial: https://github.com/pgvector/pgvector
- Prisma + pgvector: https://www.prisma.io/docs/orm/prisma-schema/data-model/unsupported-database-features
