# Deployment Notes (manual migration + repository patch)

1. Realizar backup completo de la base de datos antes de ejecutar la migración.
2. Probar previamente el archivo `001_add_processing_fields.sql` en un entorno de staging.
3. Ejecutar la migración usando la herramienta del proyecto o `psql`, verificando que la extensión pgvector ya exista.
4. Después de la migración, correr `npx prisma generate` para regenerar el cliente.
5. Verificar que las columnas nuevas existen:
   SELECT column_name FROM information_schema.columns WHERE table_name='documents';
6. Aplicar el patch del repositorio (`prismaRepositoryPatch.diff`) y asegurar que create/update persisten `embedding` y `issuingEntity`.
7. Reconstruir backend (`pnpm build` o equivalente) y ejecutar pruebas básicas de carga/lectura de documentos.
8. Confirmar que `toDomain()` mapea los nuevos campos sin romper compatibilidad con los casos de uso existentes.
9. Hacer deploy rolling para evitar downtime; no reiniciar todos los pods simultáneamente.
10. En caso de rollback, eliminar manualmente las columnas nuevas con ALTER TABLE DROP COLUMN.
