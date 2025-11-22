'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { useEffect, useState, Suspense } from 'react';
import { ModalLoadingIndicator } from '@/components/ui/LoadingIndicator';

function AccesoDenegadoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const reason = searchParams.get('reason');
  const required = searchParams.get('required');
  const current = searchParams.get('current');

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const handleGoBack = () => {
    router.back();
  };

  const handleGoHome = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="bg-red-100 rounded-full p-6">
              <ShieldAlert className="text-red-600" size={64} />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Acceso Denegado
          </h1>

          {/* Description */}
          <div className="text-gray-600 mb-6 space-y-2">
            <p className="text-lg">
              No tienes permisos para acceder a esta página.
            </p>

            {reason === 'insufficient_permissions' && (
              <div className="mt-4 p-4 bg-red-50 rounded-lg text-sm text-left">
                <p className="font-semibold text-red-900 mb-2">Detalles:</p>
                {current && (
                  <p className="text-red-700 mb-1">
                    <span className="font-medium">Tu rol actual:</span> {translateRole(current)}
                  </p>
                )}
                {required && (
                  <p className="text-red-700">
                    <span className="font-medium">Roles requeridos:</span>{' '}
                    {required.split(',').map(translateRole).join(', ')}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleGoBack}
              className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft size={20} />
              Volver atrás
            </button>

            <button
              onClick={handleGoHome}
              className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              <Home size={20} />
              Ir al inicio
            </button>
          </div>

          {/* Footer */}
          <p className="mt-6 text-sm text-gray-500">
            Si crees que esto es un error, contacta al administrador del sistema.
          </p>
        </div>
      </div>
    </div>
  );
}

function translateRole(role: string): string {
  const translations: Record<string, string> = {
    'SUPER_ADMIN': 'Super Administrador',
    'ADMIN': 'Administrador',
    'EDITOR': 'Editor',
    'ACCOUNT_OWNER': 'Propietario de Cuenta',
    'MEMBER': 'Miembro',
  };

  return translations[role] || role;
}

export default function AccesoDenegadoPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-red-50">
        <ModalLoadingIndicator message="Cargando" size="lg" />
      </div>
    }>
      <AccesoDenegadoContent />
    </Suspense>
  );
}
