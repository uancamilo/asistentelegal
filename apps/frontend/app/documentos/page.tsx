'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/useAuth'
import DocumentList from '@/components/documents/DocumentList'
import { ComponentLoadingIndicator } from '@/components/ui/LoadingIndicator'

export default function PublicDocumentsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [isInitialLoading, setIsInitialLoading] = useState(true)

  useEffect(() => {
    if (!authLoading) {
      // Simular tiempo mínimo para mostrar el loader
      const timer = setTimeout(() => {
        setIsInitialLoading(false)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [authLoading])

  if (authLoading || isInitialLoading) {
    return (
      <ComponentLoadingIndicator 
        message="Cargando documentos legales" 
        size="lg"
        height="lg"
      />
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Documentos Legales</h1>
        <p className="text-muted-foreground text-sm mt-2">
          Consulta la base de conocimiento de documentos legales
        </p>
      </div>

      <DocumentList
        showActions={true}
        basePath="/documentos"
        canCreate={false}
        canEdit={false}
        canPublish={false}
        canArchive={false}
      />
    </div>
  )
}
