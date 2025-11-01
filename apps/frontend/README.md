# AsistenciaLegal Frontend

Frontend Next.js con TypeScript y App Router para el sistema AsistenciaLegal.

## Tecnologías

- Next.js 15 (App Router)
- TypeScript
- React Hook Form + Zod
- Axios

## Desarrollo

### Instalación

Desde la raíz del monorepo:

```bash
npm install
```

### Variables de Entorno

Crear archivo `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

### Ejecutar en Desarrollo

Desde la raíz del monorepo:

```bash
npm run dev
```

O solo el frontend:

```bash
cd apps/frontend
npm run dev
```

El frontend estará disponible en: http://localhost:3001

## Estructura

```
apps/frontend/
├── app/
│   ├── layout.tsx          # Layout principal
│   ├── page.tsx             # Página home
│   ├── login/
│   │   └── page.tsx         # Página de login
│   └── dashboard/
│       └── page.tsx         # Página dashboard (protegida)
├── lib/
│   └── useAuth.ts           # Hook de autenticación
├── .env.local               # Variables de entorno
└── next.config.js           # Configuración Next.js (proxy)
```

## Funcionalidades

### Login

- Formulario con validación (email, password)
- POST a `/api/auth/login` (proxied a backend en puerto 3000)
- Almacena tokens en localStorage
- Redirección a `/dashboard` tras login exitoso

### Dashboard

- Página protegida
- Verifica autenticación con hook `useAuth`
- Redirección a `/login` si no hay token
- Botón de logout

## Proxy de Desarrollo

El frontend tiene configurado un proxy en `next.config.js`:

```javascript
async rewrites() {
  return [
    {
      source: '/api/:path*',
      destination: 'http://localhost:3000/api/:path*',
    },
  ];
}
```

Esto permite que las peticiones a `/api/*` se redirijan al backend en `localhost:3000`.

## Build para Producción

```bash
npm run build
npm run start
```
