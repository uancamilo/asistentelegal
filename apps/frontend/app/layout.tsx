import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AsistenciaLegal',
  description: 'Sistema de gestión legal',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
