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
    md: 'text-sm', // Estandarizado a text-sm para consistencia
    lg: 'text-base' // Reducido de text-lg para consistencia
  };

  const containerClasses = cn(
    'flex items-center gap-3', // Gap estandarizado a 3
    center && !inline && 'justify-center',
    inline ? 'inline-flex' : 'flex',
    className
  );

  const textClasses = cn(
    'text-muted-foreground font-medium', // Color unificado
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
            'rounded-full bg-muted-foreground/40 animate-pulse', // Color unificado con opacity
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
            'rounded-full bg-muted-foreground/40 animate-pulse',
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
            'rounded-full bg-muted-foreground/40 animate-pulse',
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
export const PageLoadingIndicator: React.FC<Omit<LoadingIndicatorProps, 'center' | 'inline'> & {
  background?: 'default' | 'gradient' | 'error'
}> = ({
  message = 'Cargando página',
  size = 'lg',
  className,
  background = 'default'
}) => {
  const backgroundClasses = {
    default: 'bg-gray-50 dark:bg-gray-900',
    gradient: 'bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900 dark:to-indigo-900',
    error: 'bg-red-50 dark:bg-red-900'
  };

  return (
    <div className={cn('min-h-screen flex items-center justify-center', backgroundClasses[background], className)}>
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
export const ComponentLoadingIndicator: React.FC<Omit<LoadingIndicatorProps, 'center'> & {
  height?: 'sm' | 'md' | 'lg' | 'auto'
}> = ({
  message = 'Cargando contenido',
  size = 'md',
  className,
  inline = false,
  height = 'auto'
}) => {
  const heightClasses = {
    sm: 'h-32',    // 128px - Para componentes pequeños
    md: 'h-48',    // 192px - Para cards/formularios
    lg: 'h-64',    // 256px - Para dashboards/secciones grandes
    auto: ''       // Sin altura fija
  };

  return (
    <div className={cn(
      'flex items-center justify-center w-full',
      height !== 'auto' ? heightClasses[height] : 'py-6', // Espaciado estandarizado
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

// Variante para modales/diálogos
export const ModalLoadingIndicator: React.FC<Omit<LoadingIndicatorProps, 'center' | 'inline'> & {
  background?: 'white' | 'gray' | 'transparent'
}> = ({
  message = 'Cargando',
  size = 'md',
  className,
  background = 'white'
}) => {
  const backgroundClasses = {
    white: 'bg-white dark:bg-gray-800',
    gray: 'bg-gray-50 dark:bg-gray-900',
    transparent: 'bg-transparent'
  };

  return (
    <div className={cn(
      'rounded-lg shadow-lg p-6 max-w-md text-center', // Padding estandarizado
      backgroundClasses[background],
      className
    )}>
      <LoadingIndicator 
        message={message} 
        size={size} 
        center={true}
      />
    </div>
  );
};

export default LoadingIndicator;