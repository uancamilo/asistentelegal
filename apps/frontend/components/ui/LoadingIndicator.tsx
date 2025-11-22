import React from 'react';
import { cn } from '@/lib/utils';

export interface LoadingIndicatorProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  center?: boolean;
  inline?: boolean;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  message = 'Cargando',
  size = 'md',
  className,
  center = true,
  inline = false
}) => {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const containerClasses = cn(
    'flex items-center gap-2',
    center && !inline && 'justify-center',
    inline ? 'inline-flex' : 'flex',
    className
  );

  const textClasses = cn(
    'text-gray-600 dark:text-gray-300 font-medium',
    sizeClasses[size]
  );

  return (
    <div className={containerClasses}>
      <span className={textClasses}>
        {message}
      </span>
      <div className="flex space-x-1">
        <div 
          className={cn(
            'rounded-full bg-gray-400 dark:bg-gray-500 animate-pulse',
            size === 'sm' ? 'w-1 h-1' : size === 'md' ? 'w-1.5 h-1.5' : 'w-2 h-2'
          )}
          style={{ 
            animationDelay: '0ms',
            animationDuration: '1.4s',
            animationIterationCount: 'infinite'
          }}
        />
        <div 
          className={cn(
            'rounded-full bg-gray-400 dark:bg-gray-500 animate-pulse',
            size === 'sm' ? 'w-1 h-1' : size === 'md' ? 'w-1.5 h-1.5' : 'w-2 h-2'
          )}
          style={{ 
            animationDelay: '200ms',
            animationDuration: '1.4s',
            animationIterationCount: 'infinite'
          }}
        />
        <div 
          className={cn(
            'rounded-full bg-gray-400 dark:bg-gray-500 animate-pulse',
            size === 'sm' ? 'w-1 h-1' : size === 'md' ? 'w-1.5 h-1.5' : 'w-2 h-2'
          )}
          style={{ 
            animationDelay: '400ms',
            animationDuration: '1.4s',
            animationIterationCount: 'infinite'
          }}
        />
      </div>
    </div>
  );
};

// Variante para loading de página completa
export const PageLoadingIndicator: React.FC<Omit<LoadingIndicatorProps, 'center' | 'inline'>> = ({
  message = 'Cargando página',
  size = 'lg',
  className
}) => {
  return (
    <div className={cn('min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900', className)}>
      <div className="text-center space-y-4">
        <LoadingIndicator 
          message={message} 
          size={size} 
          center={true}
        />
      </div>
    </div>
  );
};

// Variante para loading en componentes
export const ComponentLoadingIndicator: React.FC<Omit<LoadingIndicatorProps, 'center'>> = ({
  message = 'Cargando contenido',
  size = 'md',
  className,
  inline = false
}) => {
  return (
    <div className={cn(
      'py-8 text-center',
      !inline && 'w-full',
      className
    )}>
      <LoadingIndicator 
        message={message} 
        size={size} 
        center={true}
        inline={inline}
      />
    </div>
  );
};

// Variante para botones
export const ButtonLoadingIndicator: React.FC<{
  message?: string;
  size?: 'sm' | 'md';
}> = ({
  message = 'Procesando',
  size = 'sm'
}) => {
  return (
    <LoadingIndicator 
      message={message} 
      size={size} 
      center={false}
      inline={true}
      className="justify-center"
    />
  );
};

export default LoadingIndicator;