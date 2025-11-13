'use client'

import DocumentList from '@/components/documents/DocumentList'

export default function EditorPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Gestión de Documentos</h1>
        <p className="text-gray-600 mt-2">
          Administra documentos legales del sistema
        </p>
      </div>

      <DocumentList
        showActions={true}
        basePath="/editor"
        canCreate={true}
        canEdit={true}
        canPublish={true}
        canArchive={true}
        autoLoad={true}
      />
    </div>
  )
}
