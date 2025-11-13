'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { ArrowLeft, Edit, Trash2, CheckCircle, Archive } from 'lucide-react'
import DocumentViewer from '@/components/documents/DocumentViewer'
import { getDocumentById, publishDocument, archiveDocument, deleteDocument } from '@/lib/api/documents'
import type { Document } from '@/lib/types'

export default function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // NEXT.JS 15 FIX: Unwrap params Promise using React.use()
  const { id } = use(params)

  const router = useRouter()
  const { addToast } = useToast()
  const [document, setDocument] = useState<Document | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDocument()
  }, [id])

  const fetchDocument = async () => {
    try {
      const doc = await getDocumentById(id)
      setDocument(doc)
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'No se pudo cargar el documento',
        variant: 'destructive',
      })
      router.push('/editor')
    } finally {
      setLoading(false)
    }
  }

  const handlePublish = async () => {
    try {
      await publishDocument(id)
      addToast({
        title: 'Documento publicado',
        description: 'El documento ahora es visible públicamente',
        variant: 'success',
      })
      fetchDocument()
    } catch (error: any) {
      addToast({
        title: 'Error',
        description: error.response?.data?.message || 'No se pudo publicar el documento',
        variant: 'destructive',
      })
    }
  }

  const handleArchive = async () => {
    try {
      await archiveDocument(id)
      addToast({
        title: 'Documento archivado',
        description: 'El documento ha sido archivado',
        variant: 'success',
      })
      fetchDocument()
    } catch (error: any) {
      addToast({
        title: 'Error',
        description: error.response?.data?.message || 'No se pudo archivar el documento',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async () => {
    if (!confirm('¿Está seguro de que desea eliminar este documento? Esta acción no se puede deshacer.')) {
      return
    }

    try {
      await deleteDocument(id)
      addToast({
        title: 'Documento eliminado',
        description: 'El documento ha sido eliminado exitosamente',
        variant: 'success',
      })
      router.push('/editor')
    } catch (error: any) {
      addToast({
        title: 'Error',
        description: error.response?.data?.message || 'No se pudo eliminar el documento',
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center text-gray-500">Cargando documento...</p>
      </div>
    )
  }

  if (!document) {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header Actions */}
      <div className="mb-6 flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => router.push('/editor')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Documentos
        </Button>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/editor/${id}/edit`)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>

          {document.status === 'DRAFT' && (
            <Button
              variant="default"
              onClick={handlePublish}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Publicar
            </Button>
          )}

          {document.status === 'PUBLISHED' && (
            <Button
              variant="outline"
              onClick={handleArchive}
            >
              <Archive className="h-4 w-4 mr-2" />
              Archivar
            </Button>
          )}

          <Button
            variant="destructive"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar
          </Button>
        </div>
      </div>

      {/* Document Content */}
      <DocumentViewer document={document} />
    </div>
  )
}
