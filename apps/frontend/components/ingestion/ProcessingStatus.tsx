'use client';

import {
  ProcessingStatus as ProcessingStatusEnum,
  PROCESSING_STATUS_LABELS,
} from '../../lib/api/ingestion';

interface ProcessingStatusProps {
  label: string;
  status: ProcessingStatusEnum | undefined;
  error?: string | null;
}

/**
 * ProcessingStatus - Visual indicator for async processing status
 *
 * Shows a colored badge with icon indicating the current processing state.
 */
export function ProcessingStatus({ label, status, error }: ProcessingStatusProps) {
  if (!status) return null;

  const getStatusStyles = () => {
    switch (status) {
      case ProcessingStatusEnum.PENDING:
        return {
          bg: 'bg-gray-100 dark:bg-gray-700',
          text: 'text-gray-600 dark:text-gray-300',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        };
      case ProcessingStatusEnum.PROCESSING:
        return {
          bg: 'bg-blue-100 dark:bg-blue-900/30',
          text: 'text-blue-600 dark:text-blue-400',
          icon: (
            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ),
        };
      case ProcessingStatusEnum.COMPLETED:
        return {
          bg: 'bg-green-100 dark:bg-green-900/30',
          text: 'text-green-600 dark:text-green-400',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ),
        };
      case ProcessingStatusEnum.FAILED:
        return {
          bg: 'bg-red-100 dark:bg-red-900/30',
          text: 'text-red-600 dark:text-red-400',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ),
        };
      case ProcessingStatusEnum.SKIPPED:
        return {
          bg: 'bg-yellow-100 dark:bg-yellow-900/30',
          text: 'text-yellow-600 dark:text-yellow-400',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ),
        };
      default:
        return {
          bg: 'bg-gray-100 dark:bg-gray-700',
          text: 'text-gray-600 dark:text-gray-300',
          icon: null,
        };
    }
  };

  const styles = getStatusStyles();

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 dark:text-gray-400 min-w-[100px]">
          {label}:
        </span>
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${styles.bg} ${styles.text}`}
        >
          {styles.icon}
          {PROCESSING_STATUS_LABELS[status]}
        </span>
      </div>
      {error && status === ProcessingStatusEnum.FAILED && (
        <p className="text-xs text-red-500 dark:text-red-400 ml-[108px]">
          {error}
        </p>
      )}
    </div>
  );
}

export default ProcessingStatus;
