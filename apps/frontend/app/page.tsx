import Link from 'next/link'

export default function Home() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>AsistenciaLegal</h1>
      <p>Sistema de gestión legal con autenticación JWT</p>
      <div style={{ marginTop: '2rem' }}>
        <Link href="/login" style={{ color: 'blue', textDecoration: 'underline' }}>
          Ir al Login
        </Link>
      </div>
    </main>
  )
}
