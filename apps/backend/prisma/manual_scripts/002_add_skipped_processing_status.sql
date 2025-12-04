-- Migration: Add SKIPPED value to ProcessingStatus enum
-- Purpose: Allow marking embedding as SKIPPED when PDF extraction fails
-- Date: 2025-11-25

-- Add SKIPPED to ProcessingStatus enum
ALTER TYPE "ProcessingStatus" ADD VALUE IF NOT EXISTS 'SKIPPED';

-- Verify the enum values
-- SELECT enum_range(NULL::"ProcessingStatus");
