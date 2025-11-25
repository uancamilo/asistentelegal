'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { ButtonLoadingIndicator } from '@/components/ui/LoadingIndicator'
import { Save, ArrowLeft } from 'lucide-react'
import { createDocument, updateDocument } from '@/lib/api/documents'
import type { Document, DocumentType, DocumentScope, CreateDocumentRequest, UpdateDocumentRequest } from '@/lib/types'

interface DocumentFormProps {
  document?: Document
  mode: 'create' | 'edit'
  onSuccess?: (document: Document) => void
  redirectPath?: string
}

export default function DocumentForm({ document, mode, onSuccess, redirectPath }: DocumentFormProps) {
  const router = useRouter()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: document?.title || '',
    documentNumber: document?.documentNumber || '',
    type: document?.type || 'LEY_ORDINARIA' as DocumentType,
    scope: document?.scope || 'NACIONAL' as DocumentScope,
    issuingEntity: document?.issuingEntity || '',
    summary: document?.summary || '',
    fullText: document?.fullText || '',
    keywords: document?.keywords?.join(', ') || '',
  })

  useEffect(() => {
    if (document) {
      setFormData({
        title: document.title,
        documentNumber: document.documentNumber || '',
        type: document.type,
        scope: document.scope,
        issuingEntity: document.issuingEntity,
        summary: document.summary || '',
        fullText: document.fullText || '',
        keywords: document.keywords?.join(', ') || '',
      })
    }
  }, [document])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const keywordsArray = formData.keywords
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0)

      const payload = {
        title: formData.title,
        documentNumber: formData.documentNumber || undefined,
        type: formData.type,
        scope: formData.scope,
        issuingEntity: formData.issuingEntity,
        summary: formData.summary || undefined,
        fullText: formData.fullText || undefined,
        keywords: keywordsArray.length > 0 ? keywordsArray : undefined,
      }

      let result: Document

      if (mode === 'create') {
        result = await createDocument(payload as CreateDocumentRequest)
        addToast({
          title: 'Documento creado',
          description: 'El documento ha sido creado exitosamente',
          variant: 'success',
        })
      } else {
        result = await updateDocument(document!.id, payload as UpdateDocumentRequest)
        addToast({
          title: 'Documento actualizado',
          description: 'Los cambios han sido guardados exitosamente',
          variant: 'success',
        })
      }

      if (onSuccess) {
        onSuccess(result)
      } else if (redirectPath) {
        router.push(redirectPath)
      } else {
        router.back()
      }
    } catch (error: any) {
      addToast({
        title: 'Error',
        description: error.response?.data?.message || 'No se pudo guardar el documento',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{mode === 'create' ? 'Crear Documento' : 'Editar Documento'}</CardTitle>
            <CardDescription>
              {mode === 'create'
                ? 'Complete los campos para crear un nuevo documento legal'
                : 'Modifique los campos que desee actualizar'}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Ej: Ley Orgánica de Transparencia y Acceso a la Información"
              required
              maxLength={500}
            />
          </div>

          {/* Document Number */}
          <div className="space-y-2">
            <Label htmlFor="documentNumber">Número de Documento</Label>
            <Input
              id="documentNumber"
              value={formData.documentNumber}
              onChange={(e) => handleChange('documentNumber', e.target.value)}
              placeholder="Ej: LEY-001-2023"
              maxLength={100}
            />
          </div>

          {/* Type and Scope */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Tipo de Documento *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => handleChange('type', value)}
                name="type"
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CONSTITUCION">Constitución</SelectItem>
                  <SelectItem value="TRATADO_INTERNACIONAL">Tratado Internacional</SelectItem>
                  <SelectItem value="LEY_ORGANICA">Ley Orgánica</SelectItem>
                  <SelectItem value="LEY_ORDINARIA">Ley Ordinaria</SelectItem>
                  <SelectItem value="DECRETO_LEY">Decreto Ley</SelectItem>
                  <SelectItem value="DECRETO">Decreto</SelectItem>
                  <SelectItem value="REGLAMENTO">Reglamento</SelectItem>
                  <SelectItem value="ORDENANZA">Ordenanza</SelectItem>
                  <SelectItem value="RESOLUCION">Resolución</SelectItem>
                  <SelectItem value="ACUERDO">Acuerdo</SelectItem>
                  <SelectItem value="CIRCULAR">Circular</SelectItem>
                  <SelectItem value="DIRECTIVA">Directiva</SelectItem>
                  <SelectItem value="OTRO">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="scope">Ámbito *</Label>
              <Select
                value={formData.scope}
                onValueChange={(value) => handleChange('scope', value)}
                name="scope"
              >
                <SelectTrigger id="scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INTERNACIONAL">Internacional</SelectItem>
                  <SelectItem value="NACIONAL">Nacional</SelectItem>
                  <SelectItem value="REGIONAL">Regional</SelectItem>
                  <SelectItem value="MUNICIPAL">Municipal</SelectItem>
                  <SelectItem value="LOCAL">Local</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Issuing Entity */}
          <div className="space-y-2">
            <Label htmlFor="issuingEntity">Entidad Emisora *</Label>
            <Input
              id="issuingEntity"
              value={formData.issuingEntity}
              onChange={(e) => handleChange('issuingEntity', e.target.value)}
              placeholder="Ej: Asamblea Nacional"
              required
              maxLength={200}
            />
          </div>

          {/* Summary */}
          <div className="space-y-2">
            <Label htmlFor="summary">Resumen</Label>
            <textarea
              id="summary"
              name="summary"
              value={formData.summary}
              onChange={(e) => handleChange('summary', e.target.value)}
              placeholder="Breve descripción del documento..."
              className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={2000}
            />
            <p className="text-sm text-gray-500">{formData.summary.length}/2000 caracteres</p>
          </div>

          {/* Full Text */}
          <div className="space-y-2">
            <Label htmlFor="fullText">Texto Completo</Label>
            <textarea
              id="fullText"
              name="fullText"
              value={formData.fullText}
              onChange={(e) => handleChange('fullText', e.target.value)}
              placeholder="Contenido completo del documento legal..."
              className="w-full min-h-[300px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
          </div>

          {/* Keywords */}
          <div className="space-y-2">
            <Label htmlFor="keywords">Palabras Clave</Label>
            <Input
              id="keywords"
              value={formData.keywords}
              onChange={(e) => handleChange('keywords', e.target.value)}
              placeholder="transparencia, acceso, información (separadas por comas)"
            />
            <p className="text-sm text-gray-500">Ingrese las palabras clave separadas por comas</p>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <ButtonLoadingIndicator message="Guardando" size="sm" />
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {mode === 'create' ? 'Crear Documento' : 'Guardar Cambios'}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
