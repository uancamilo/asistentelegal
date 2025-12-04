'use client'

import { Suspense } from 'react'
import DocumentList from '@/components/documents/DocumentList'
import { ComponentLoadingIndicator } from '@/components/ui/LoadingIndicator'

export default function PublicDocumentsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Documentos Legales</h1>
        <p className="text-muted-foreground text-sm mt-2">
          Consulta la base de conocimiento de documentos legales
        </p>
      </div>

      <Suspense fallback={<ComponentLoadingIndicator message="Cargando documentos" size="lg" height="lg" />}>
        <DocumentList
          showActions={true}
          basePath="/documentos"
          canCreate={false}
          canEdit={false}
          canPublish={false}
          canArchive={false}
        />
      </Suspense>
    </div>
  )
}
