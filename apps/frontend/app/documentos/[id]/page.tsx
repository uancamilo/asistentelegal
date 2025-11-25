'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { ArrowLeft } from 'lucide-react'
import DocumentViewer from '@/components/documents/DocumentViewer'
import { getDocumentById } from '@/lib/api/documents'
import type { Document } from '@/lib/types'
import { ComponentLoadingIndicator } from '@/components/ui/LoadingIndicator'

export default function PublicDocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
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
    } catch (error: any) {
      const message = error.response?.status === 403
        ? 'No tiene permisos para ver este documento'
        : 'No se pudo cargar el documento'
      addToast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      })
      router.push('/documentos')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <ComponentLoadingIndicator
        message="Cargando documento"
        size="lg"
        height="lg"
      />
    )
  }

  if (!document) {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header Actions */}
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Documentos
        </Button>
      </div>

      {/* Document Content */}
      <DocumentViewer document={document} />
    </div>
  )
}
