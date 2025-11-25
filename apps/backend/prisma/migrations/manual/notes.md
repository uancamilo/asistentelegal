# Migration Notes: Processing & Review Fields

## Deployment Order (CRITICAL)
1. **Backup DB**: `pg_dump -Fc asistencialegal > backup_$(date +%Y%m%d).dump`
2. **Test in staging**: Run migration against staging DB first
3. **Run migration**: `psql -d asistencialegal -f 001_add_processing_fields.sql`
4. **Update schema.prisma**: Add fragment from `schema_fragment.prisma`
5. **Generate Prisma client**: `npx prisma generate`
6. **Update TS types**: Add fields to `DocumentCreateData` and `DocumentEntity`
7. **Apply repo patch**: Merge changes from `prismaRepositoryPatch.diff`
8. **Deploy services**: Rolling deployment to avoid downtime

## Verification After Migration
```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name='documents' AND column_name IN ('sourceUrl','processingStatus','embeddingStatus');
```

## Risks
- **Lock time**: ~1-5s on documents table (nullable columns are fast)
- **Rollback**: `ALTER TABLE documents DROP COLUMN [column_name]` for each new column
- **Enum sync**: TS `ProcessingStatus` enum must match Prisma after migration
