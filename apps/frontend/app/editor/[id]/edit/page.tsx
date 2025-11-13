'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/toast'
import DocumentForm from '@/components/documents/DocumentForm'
import { getDocumentById } from '@/lib/api/documents'
import type { Document } from '@/lib/types'

export default function EditDocumentPage({ params }: { params: Promise<{ id: string }> }) {
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
      <DocumentForm
        document={document}
        mode="edit"
        redirectPath={`/editor/${id}`}
      />
    </div>
  )
}
