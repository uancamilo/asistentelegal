/**
 * Text chunking utility for document processing
 *
 * Splits text into semantically coherent chunks suitable for embedding generation.
 * Ensures chunks don't break mid-sentence and maintains readability.
 */

export interface TextChunk {
  index: number;
  content: string;
}

export interface ChunkOptions {
  /** Target chunk size in characters (default: 1200) */
  targetSize?: number;
  /** Minimum chunk size in characters (default: 500) */
  minSize?: number;
  /** Maximum chunk size in characters (default: 1500) */
  maxSize?: number;
  /** Overlap between chunks in characters (default: 100) */
  overlap?: number;
}

const DEFAULT_OPTIONS: Required<ChunkOptions> = {
  targetSize: 1200,
  minSize: 500,
  maxSize: 1500,
  overlap: 100,
};

/**
 * Splits text into chunks optimized for embedding generation
 *
 * @param text - The text to split into chunks
 * @param options - Configuration options for chunking
 * @returns Array of text chunks with index and content
 */
export function chunkText(text: string, options?: ChunkOptions): TextChunk[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Normalize text: remove excessive whitespace, normalize line breaks
  const normalizedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();

  if (!normalizedText) {
    return [];
  }

  // If text is smaller than minSize, return as single chunk
  if (normalizedText.length <= opts.minSize) {
    return [{ index: 0, content: normalizedText }];
  }

  const chunks: TextChunk[] = [];
  let currentPosition = 0;
  let chunkIndex = 0;

  while (currentPosition < normalizedText.length) {
    // Calculate end position for this chunk
    let endPosition = Math.min(
      currentPosition + opts.targetSize,
      normalizedText.length,
    );

    // If we're not at the end, find a good break point
    if (endPosition < normalizedText.length) {
      endPosition = findBreakPoint(
        normalizedText,
        currentPosition,
        endPosition,
        opts.maxSize,
      );
    }

    // Extract chunk content
    const chunkContent = normalizedText.slice(currentPosition, endPosition).trim();

    // Only add non-empty chunks that meet minimum size (except for the last chunk)
    if (
      chunkContent.length > 0 &&
      (chunkContent.length >= opts.minSize ||
        endPosition >= normalizedText.length)
    ) {
      chunks.push({
        index: chunkIndex++,
        content: chunkContent,
      });
    }

    // Move position, accounting for overlap
    if (endPosition >= normalizedText.length) {
      break;
    }

    // Calculate next start position with overlap
    currentPosition = Math.max(
      currentPosition + 1,
      endPosition - opts.overlap,
    );

    // Ensure we don't go backwards
    if (currentPosition >= normalizedText.length) {
      break;
    }
  }

  return chunks;
}

/**
 * Finds the best break point in text, preferring sentence and paragraph boundaries
 */
function findBreakPoint(
  text: string,
  start: number,
  targetEnd: number,
  maxEnd: number,
): number {
  const searchStart = Math.max(start, targetEnd - 200);
  const searchEnd = Math.min(text.length, maxEnd);
  const searchText = text.slice(searchStart, searchEnd);

  // Priority 1: Paragraph break (double newline)
  const paragraphBreak = findLastMatch(searchText, /\n\n/g, targetEnd - searchStart);
  if (paragraphBreak !== -1) {
    return searchStart + paragraphBreak + 2; // After the double newline
  }

  // Priority 2: Single newline
  const lineBreak = findLastMatch(searchText, /\n/g, targetEnd - searchStart);
  if (lineBreak !== -1) {
    return searchStart + lineBreak + 1; // After the newline
  }

  // Priority 3: Sentence endings (., !, ?, followed by space or newline)
  const sentenceEnd = findLastMatch(
    searchText,
    /[.!?][\s\n]/g,
    targetEnd - searchStart,
  );
  if (sentenceEnd !== -1) {
    return searchStart + sentenceEnd + 2; // After the punctuation and space
  }

  // Priority 4: Semicolon or colon
  const semicolonBreak = findLastMatch(
    searchText,
    /[;:][\s\n]/g,
    targetEnd - searchStart,
  );
  if (semicolonBreak !== -1) {
    return searchStart + semicolonBreak + 2;
  }

  // Priority 5: Comma
  const commaBreak = findLastMatch(
    searchText,
    /,[\s\n]/g,
    targetEnd - searchStart,
  );
  if (commaBreak !== -1) {
    return searchStart + commaBreak + 2;
  }

  // Priority 6: Any whitespace
  const spaceBreak = findLastMatch(searchText, /\s/g, targetEnd - searchStart);
  if (spaceBreak !== -1) {
    return searchStart + spaceBreak + 1;
  }

  // Fallback: Use target end position
  return targetEnd;
}

/**
 * Finds the last match of a pattern before a given position
 */
function findLastMatch(
  text: string,
  pattern: RegExp,
  maxPosition: number,
): number {
  let lastMatch = -1;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index <= maxPosition) {
      lastMatch = match.index;
    } else {
      break;
    }
  }

  return lastMatch;
}

/**
 * Estimates the number of tokens in a chunk (rough approximation)
 * Useful for understanding embedding costs
 */
export function estimateTokenCount(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters for English text
  // For Spanish/mixed text, this might vary
  return Math.ceil(text.length / 4);
}

/**
 * Validates that chunks cover the original text adequately
 */
export function validateChunks(
  originalText: string,
  chunks: TextChunk[],
): { valid: boolean; coverage: number; issues: string[] } {
  const issues: string[] = [];

  if (chunks.length === 0) {
    if (originalText.trim().length > 0) {
      issues.push('No chunks generated for non-empty text');
    }
    return { valid: issues.length === 0, coverage: 0, issues };
  }

  // Check for empty chunks
  const emptyChunks = chunks.filter((c) => !c.content.trim());
  if (emptyChunks.length > 0) {
    issues.push(`Found ${emptyChunks.length} empty chunks`);
  }

  // Check index continuity
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (chunk && chunk.index !== i) {
      issues.push(`Chunk index mismatch at position ${i}`);
    }
  }

  // Calculate coverage (simplified - doesn't account for overlap)
  const totalChunkLength = chunks.reduce((sum, c) => sum + c.content.length, 0);
  const coverage = Math.min(1, totalChunkLength / originalText.length);

  return {
    valid: issues.length === 0,
    coverage,
    issues,
  };
}
