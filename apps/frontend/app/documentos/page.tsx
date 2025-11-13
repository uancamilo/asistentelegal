'use client'

import DocumentList from '@/components/documents/DocumentList'

export default function PublicDocumentsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Documentos Legales</h1>
        <p className="text-gray-600 mt-2">
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
