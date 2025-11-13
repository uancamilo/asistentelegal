'use client'

import DocumentForm from '@/components/documents/DocumentForm'

export default function NewDocumentPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <DocumentForm
        mode="create"
        redirectPath="/editor"
      />
    </div>
  )
}
