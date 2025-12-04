/**
 * Dependency Injection Tokens for Document Module
 *
 * These tokens are used to inject repository implementations
 * following the Dependency Inversion Principle (DIP).
 *
 * This allows the domain layer to depend on abstractions (interfaces)
 * rather than concrete implementations.
 */

export const DOCUMENT_REPOSITORY = Symbol('DOCUMENT_REPOSITORY');
export const DOCUMENT_FILE_REPOSITORY = Symbol('DOCUMENT_FILE_REPOSITORY');
export const DOCUMENT_RELATION_REPOSITORY = Symbol('DOCUMENT_RELATION_REPOSITORY');
export const DOCUMENT_VERSION_REPOSITORY = Symbol('DOCUMENT_VERSION_REPOSITORY');
export const DOCUMENT_SECTION_REPOSITORY = Symbol('DOCUMENT_SECTION_REPOSITORY');
export const DOCUMENT_CHUNK_REPOSITORY = Symbol('DOCUMENT_CHUNK_REPOSITORY');
