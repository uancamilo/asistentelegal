# AsistenciaLegal - Backend API

Backend API RESTful para el sistema de gestión legal AsistenciaLegal, construido con NestJS 10.4+, TypeScript, Prisma ORM y PostgreSQL.

## 📋 Tabla de Contenidos

- [Tecnologías](#tecnologías)
- [Requisitos](#requisitos)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Ejecución](#ejecución)
- [API Endpoints](#api-endpoints)
  - [Autenticación](#autenticación-auth)
  - [Usuarios](#usuarios-users)
  - [Cuentas](#cuentas-accounts)
- [Arquitectura](#arquitectura)
- [Seguridad](#seguridad)
- [Tests](#tests)
- [Documentación](#documentación)

---

## 🚀 Tecnologías

- **Framework:** NestJS 10.4+
- **Lenguaje:** TypeScript 5.x
- **ORM:** Prisma 5.x
- **Base de datos:** PostgreSQL 14+
- **Autenticación:** JWT (JSON Web Tokens)
- **Validación:** class-validator, class-transformer
- **Rate Limiting:** @nestjs/throttler
- **Documentación:** Swagger/OpenAPI 3.0
- **Testing:** Jest + Supertest

---

## 📦 Requisitos

- Node.js >= 18.x
- npm >= 9.x
- PostgreSQL >= 14.x

---

## 🔧 Instalación

```bash
# Desde la raíz del monorepo
npm install

# O desde el directorio del backend
cd apps/backend
npm install
```

---

## ⚙️ Configuración

### Variables de Entorno

Crear archivo `.env` en `apps/backend/`:

```env
# Database
DATABASE_URL="postgresql://usuario:password@localhost:5432/asistencialegal?schema=public"

# JWT
JWT_SECRET="tu-secret-key-super-seguro-aqui"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="tu-refresh-secret-key-aqui"
JWT_REFRESH_EXPIRES_IN="7d"

# App
NODE_ENV="development"
PORT=3000
```

### Inicializar Base de Datos

```bash
# Ejecutar migraciones
npx prisma migrate dev

# Generar Prisma Client
npx prisma generate

# Inicializar SUPER_ADMIN
npm run init-superadmin
```

---

## ▶️ Ejecución

```bash
# Desarrollo con hot-reload
npm run start:dev

# Producción
npm run build
npm run start:prod

# Debug mode
npm run start:debug
```

La API estará disponible en: `http://localhost:3000/api`

---

## 📚 API Endpoints

### Base URL

```
http://localhost:3000/api
```

### Documentación Interactiva (Swagger)

```
http://localhost:3000/api/docs
```

---

## 🔐 Autenticación (Auth)

### POST `/auth/login`

Autenticar usuario y obtener tokens JWT.

**Request:**
```json
{
  "email": "admin@example.com",
  "password": "SecurePass123!"
}
```

**Response:** `200 OK`
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clwxyz123",
    "email": "admin@example.com",
    "firstName": "Admin",
    "lastName": "User",
    "role": "ADMIN",
    "status": "ACTIVE"
  }
}
```

**Errores:**
- `401 Unauthorized` - Credenciales inválidas
- `429 Too Many Requests` - Rate limit excedido (5 req/min)

---

### POST `/auth/refresh`

Renovar access token usando refresh token.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:** `200 OK`
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Rate Limit:** 10 req/min

---

### POST `/auth/logout`

Invalidar tokens del usuario (incrementa tokenVersion).

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response:** `200 OK`
```json
{
  "message": "Logout successful"
}
```

---

### GET `/auth/validate`

Validar token JWT y obtener datos del usuario actualizado.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response:** `200 OK`
```json
{
  "id": "clwxyz123",
  "email": "admin@example.com",
  "firstName": "Admin",
  "lastName": "User",
  "role": "ADMIN",
  "status": "ACTIVE"
}
```

---

## 👥 Usuarios (Users)

Todos los endpoints requieren autenticación JWT.

### POST `/users`

Crear nuevo usuario.

**Roles autorizados:** `SUPER_ADMIN`, `ADMIN`, `ACCOUNT_OWNER`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Request:**
```json
{
  "email": "nuevo@example.com",
  "password": "SecurePass123!",
  "firstName": "Nuevo",
  "lastName": "Usuario",
  "role": "MEMBER",
  "accountId": "acc_clwxyz123"
}
```

**Response:** `201 Created`
```json
{
  "id": "clwxyz456",
  "email": "nuevo@example.com",
  "firstName": "Nuevo",
  "lastName": "Usuario",
  "role": "MEMBER",
  "status": "ACTIVE",
  "accountId": "acc_clwxyz123"
}
```

**Restricciones por rol:**
- `SUPER_ADMIN`: Puede crear cualquier rol
- `ADMIN`: Solo puede crear `ACCOUNT_OWNER`
- `ACCOUNT_OWNER`: Solo puede crear `MEMBER` en su cuenta

**Errores:**
- `400 Bad Request` - Datos inválidos
- `403 Forbidden` - Sin permisos para crear ese rol
- `409 Conflict` - Email ya existe

---

### GET `/users`

Listar usuarios según permisos del rol.

**Roles autorizados:** `SUPER_ADMIN`, `ADMIN`, `ACCOUNT_OWNER`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response:** `200 OK`
```json
{
  "users": [
    {
      "id": "clwxyz123",
      "email": "user@example.com",
      "firstName": "User",
      "lastName": "Name",
      "role": "MEMBER",
      "status": "ACTIVE",
      "accountId": "acc_123"
    }
  ]
}
```

**Filtrado por rol:**
- `SUPER_ADMIN`: Ve todos los usuarios
- `ADMIN`: Solo ve usuarios de cuentas de cliente
- `ACCOUNT_OWNER`: Solo ve usuarios de su cuenta

---

### GET `/users/me`

Obtener perfil del usuario autenticado.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response:** `200 OK`
```json
{
  "id": "clwxyz123",
  "email": "admin@example.com",
  "firstName": "Admin",
  "lastName": "User",
  "role": "ADMIN",
  "status": "ACTIVE",
  "accountId": "acc_employees"
}
```

---

### GET `/users/:id`

Obtener usuario por ID.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response:** `200 OK`
```json
{
  "id": "clwxyz123",
  "email": "user@example.com",
  "firstName": "User",
  "lastName": "Name",
  "role": "MEMBER",
  "status": "ACTIVE",
  "accountId": "acc_123"
}
```

**Errores:**
- `403 Forbidden` - Sin permisos para ver este usuario
- `404 Not Found` - Usuario no encontrado

---

## 🏢 Cuentas (Accounts)

Gestión de cuentas de clientes. Todos los endpoints requieren autenticación JWT.

### POST `/accounts`

Crear nueva cuenta de cliente.

**Roles autorizados:** `SUPER_ADMIN`, `ADMIN`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Request:**
```json
{
  "name": "Acme Corporation",
  "ownerId": "clwxyz789"
}
```

**Response:** `201 Created`
```json
{
  "id": "acc_clwxyz123",
  "name": "Acme Corporation",
  "ownerId": "clwxyz789",
  "isSystemAccount": false,
  "createdAt": "2025-11-05T10:00:00.000Z",
  "updatedAt": "2025-11-05T10:00:00.000Z"
}
```

**Validaciones:**
- Nombre único (no puede existir otra cuenta con el mismo nombre)
- Mínimo 3 caracteres, máximo 100
- El `ownerId` debe existir y ser un usuario válido
- **SIEMPRE** se crea con `isSystemAccount = false` (seguridad)
- No se puede crear cuenta con nombre "Employees" (reservado)

**Errores:**
- `400 Bad Request` - Datos inválidos (nombre vacío, muy corto, etc.)
- `403 Forbidden` - Solo SUPER_ADMIN o ADMIN pueden crear cuentas
- `404 Not Found` - Usuario propietario no encontrado
- `409 Conflict` - Nombre de cuenta ya existe
- `429 Too Many Requests` - Rate limit excedido (30 req/min)

---

### GET `/accounts`

Listar cuentas según permisos del rol.

**Roles autorizados:** `SUPER_ADMIN`, `ADMIN`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response:** `200 OK`
```json
{
  "accounts": [
    {
      "id": "acc_clwxyz123",
      "name": "Acme Corporation",
      "ownerId": "clwxyz789",
      "isSystemAccount": false,
      "createdAt": "2025-11-05T10:00:00.000Z",
      "updatedAt": "2025-11-05T10:00:00.000Z"
    },
    {
      "id": "acc_clwxyz456",
      "name": "Tech Solutions",
      "ownerId": "clwxyz012",
      "isSystemAccount": false,
      "createdAt": "2025-11-04T15:30:00.000Z",
      "updatedAt": "2025-11-04T15:30:00.000Z"
    }
  ]
}
```

**Filtrado por rol:**
- `SUPER_ADMIN`: Ve **todas** las cuentas (incluida **Employees**)
- `ADMIN`: Solo ve cuentas de cliente (`isSystemAccount = false`), **NO** ve Employees

**Protección de cuenta Employees:**
- La cuenta "Employees" (`isSystemAccount = true`) es **invisible** para ADMIN
- Solo SUPER_ADMIN puede listar cuentas del sistema

**Errores:**
- `403 Forbidden` - Roles EDITOR, MEMBER, ACCOUNT_OWNER no pueden listar cuentas
- `429 Too Many Requests` - Rate limit excedido (30 req/min)

---

### GET `/accounts/:id`

Obtener cuenta por ID.

**Roles autorizados:** `SUPER_ADMIN`, `ADMIN`, `ACCOUNT_OWNER`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response:** `200 OK`
```json
{
  "id": "acc_clwxyz123",
  "name": "Acme Corporation",
  "ownerId": "clwxyz789",
  "isSystemAccount": false,
  "createdAt": "2025-11-05T10:00:00.000Z",
  "updatedAt": "2025-11-05T10:00:00.000Z"
}
```

**Autorización:**
- `SUPER_ADMIN`: Puede ver **cualquier** cuenta (incluida Employees)
- `ADMIN`: Solo puede ver cuentas de cliente, **NO** puede ver Employees
- `ACCOUNT_OWNER`: Solo puede ver **su propia cuenta**

**Ejemplo - ADMIN intenta ver Employees:**
```bash
GET /api/accounts/employees-account-id
Authorization: Bearer {adminToken}

Response: 403 Forbidden
{
  "statusCode": 403,
  "message": "Access denied. ADMIN users cannot access system accounts"
}
```

**Errores:**
- `403 Forbidden` - Sin permisos para ver esta cuenta
- `404 Not Found` - Cuenta no encontrada
- `429 Too Many Requests` - Rate limit excedido (30 req/min)

---

### PATCH `/accounts/:id`

Actualizar información de cuenta (actualmente solo nombre).

**Roles autorizados:** `SUPER_ADMIN`, `ADMIN`, `ACCOUNT_OWNER`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Request:**
```json
{
  "name": "Acme Corporation Updated"
}
```

**Response:** `200 OK`
```json
{
  "id": "acc_clwxyz123",
  "name": "Acme Corporation Updated",
  "ownerId": "clwxyz789",
  "isSystemAccount": false,
  "createdAt": "2025-11-05T10:00:00.000Z",
  "updatedAt": "2025-11-05T12:30:00.000Z"
}
```

**Autorización:**
- `SUPER_ADMIN`: Puede editar cualquier cuenta (incluida Employees, pero **NO puede renombrarla**)
- `ADMIN`: Solo puede editar cuentas de cliente, **NO** puede editar Employees
- `ACCOUNT_OWNER`: Solo puede editar **su propia cuenta**

**Protección de cuentas del sistema:**
```bash
# SUPER_ADMIN intenta renombrar Employees
PATCH /api/accounts/employees-account-id
{
  "name": "New Name"
}

Response: 403 Forbidden
{
  "statusCode": 403,
  "message": "System accounts cannot be renamed"
}
```

**Validaciones:**
- Nombre único (no puede existir otra cuenta con el mismo nombre)
- Mínimo 3 caracteres, máximo 100
- Se puede actualizar al mismo nombre (sin cambios)
- **NO** se puede cambiar `isSystemAccount` desde la API (inmutable)
- **NO** se pueden renombrar cuentas del sistema

**Errores:**
- `400 Bad Request` - Datos inválidos
- `403 Forbidden` - Sin permisos o intento de renombrar cuenta del sistema
- `404 Not Found` - Cuenta no encontrada
- `409 Conflict` - Nombre de cuenta ya existe
- `429 Too Many Requests` - Rate limit excedido (30 req/min)

---

### DELETE `/accounts/:id`

Eliminar cuenta permanentemente.

**Roles autorizados:** `SUPER_ADMIN` **únicamente**

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response:** `200 OK`
```json
{
  "message": "Account deleted successfully",
  "id": "acc_clwxyz123"
}
```

**Restricciones críticas:**
- **SOLO** `SUPER_ADMIN` puede eliminar cuentas
- **NO** se pueden eliminar cuentas del sistema (`isSystemAccount = true`)
- **NO** se pueden eliminar cuentas con usuarios activos

**Ejemplo - Intentar eliminar Employees:**
```bash
DELETE /api/accounts/employees-account-id
Authorization: Bearer {superAdminToken}

Response: 403 Forbidden
{
  "statusCode": 403,
  "message": "Cannot delete system account"
}
```

**Ejemplo - Cuenta con usuarios activos:**
```bash
DELETE /api/accounts/acc_with_users
Authorization: Bearer {superAdminToken}

Response: 403 Forbidden
{
  "statusCode": 403,
  "message": "Cannot delete account with 5 active user(s)"
}
```

**Errores:**
- `403 Forbidden` - Solo SUPER_ADMIN, o cuenta del sistema, o cuenta con usuarios activos
- `404 Not Found` - Cuenta no encontrada
- `429 Too Many Requests` - Rate limit excedido (10 req/min)

**Rate Limiting:** 10 req/min (más restrictivo que otros endpoints)

---

## 🏗️ Arquitectura

### Clean Architecture + DDD

```
src/
├── modules/
│   ├── account/
│   │   ├── application/         # Casos de uso (lógica de negocio)
│   │   │   └── use-cases/
│   │   │       ├── CreateAccount/
│   │   │       ├── ListAccounts/
│   │   │       ├── GetAccount/
│   │   │       ├── UpdateAccount/
│   │   │       └── DeleteAccount/
│   │   ├── domain/              # Entidades y lógica de dominio
│   │   │   ├── entities/
│   │   │   │   └── Account.entity.ts
│   │   │   ├── interfaces/
│   │   │   │   └── IAccountRepository.ts
│   │   │   └── constants/
│   │   └── infrastructure/      # Implementaciones técnicas
│   │       ├── controllers/
│   │       │   └── Account.controller.ts
│   │       └── repositories/
│   │           └── PrismaAccount.repository.ts
│   ├── auth/
│   └── user/
├── shared/                      # Código compartido
│   ├── guards/
│   │   ├── JwtAuth.guard.ts
│   │   └── Roles.guard.ts
│   ├── decorators/
│   └── types/
└── database/
    └── prisma.service.ts
```

### Capas

1. **Domain Layer:** Entidades, interfaces, lógica de negocio
2. **Application Layer:** Casos de uso, DTOs
3. **Infrastructure Layer:** Controllers, repositories, servicios externos

---

## 🔒 Seguridad

### Autenticación y Autorización

- **JWT Tokens:** Access tokens (15 min) + Refresh tokens (7 días)
- **Guards:**
  - `JwtAuthGuard`: Verifica token JWT válido
  - `RolesGuard`: Verifica permisos por rol
  - `ThrottlerGuard`: Rate limiting anti-brute force

### Rate Limiting

| Endpoint | Límite |
|----------|--------|
| `/auth/login` | 5 req/min |
| `/auth/refresh` | 10 req/min |
| `/users/*` | 30 req/min |
| `/accounts/*` (general) | 30 req/min |
| `/accounts/:id` (DELETE) | 10 req/min |

### Protección de Cuenta Employees

La cuenta **"Employees"** (`isSystemAccount = true`) está protegida en **TODOS** los niveles:

#### Nivel 1: Entity (Domain)
```typescript
// AccountEntity.canBeDeleted()
canBeDeleted(): boolean {
  return !this.isSystemAccount; // Employees retorna false
}

// AccountEntity.updateName()
updateName(newName: string): void {
  if (this.isSystemAccount) {
    throw new Error('System accounts cannot be renamed');
  }
}
```

#### Nivel 2: Use Cases (Application)
```typescript
// ListAccountsUseCase
if (currentUser.role === Role.ADMIN) {
  // ADMIN no ve Employees
  accounts = accounts.filter(acc => !acc.isSystemAccount);
}

// DeleteAccountUseCase
if (!account.canBeDeleted()) {
  throw new ForbiddenException('Cannot delete system account');
}
```

#### Nivel 3: API (Infrastructure)
```typescript
// AccountController
@Roles(Role.SUPER_ADMIN) // Solo SUPER_ADMIN para DELETE
@Delete(':id')
async deleteAccount(...) { ... }
```

### Validación de DTOs

- **class-validator:** Validación automática de tipos y formatos
- **class-transformer:** Transformación y sanitización
- **ValidationPipe:** Aplicado globalmente en `main.ts`

---

## 🧪 Tests

### Tests Unitarios

```bash
# Ejecutar todos los tests unitarios
npm test

# Tests con cobertura
npm run test:coverage

# Tests en watch mode
npm run test:watch

# Tests específicos
npm test account
npm test user
```

### Tests E2E

```bash
# Tests End-to-End
npm run test:e2e

# Tests E2E específicos
npm test -- account-authorization.e2e.test
```

### Cobertura Actual

- **Tests unitarios:** 108 tests pasando
- **Cobertura de use cases:** 100%
- **Tests E2E:** 56 tests implementados (requieren BD de prueba)

---

## 📖 Documentación

### Swagger UI

Documentación interactiva disponible en:

```
http://localhost:3000/api/docs
```

### OpenAPI JSON

Especificación OpenAPI 3.0 exportable:

```
http://localhost:3000/api/docs-json
```

### Características de la Documentación

- ✅ Todos los endpoints documentados
- ✅ Schemas de DTOs con ejemplos
- ✅ Códigos de respuesta HTTP
- ✅ Autenticación JWT Bearer configurada
- ✅ Descripciones detalladas de cada endpoint
- ✅ Validaciones y restricciones explicadas

---

## 📊 Modelo de Datos

### Roles de Usuario

```typescript
enum Role {
  SUPER_ADMIN  // Acceso completo a todo
  ADMIN        // Gestión de cuentas de cliente y usuarios
  EDITOR       // Permisos de edición limitados
  ACCOUNT_OWNER // Propietario de una cuenta específica
  MEMBER       // Usuario básico de una cuenta
}
```

### Estados de Usuario

```typescript
enum UserStatus {
  ACTIVE     // Usuario activo (puede iniciar sesión)
  SUSPENDED  // Usuario suspendido (no puede iniciar sesión)
}
```

### Jerarquía de Permisos

```
SUPER_ADMIN
    ↓
  ADMIN
    ↓
ACCOUNT_OWNER
    ↓
  EDITOR
    ↓
  MEMBER
```

---

## 🚨 Troubleshooting

### Error: "Unique constraint failed on the fields: (`role`)"

**Causa:** Solo puede existir un usuario SUPER_ADMIN en el sistema.

**Solución:** Usar script de inicialización:
```bash
npm run init-superadmin
```

### Error: "Cannot delete system account"

**Causa:** Intentando eliminar la cuenta "Employees" u otra cuenta del sistema.

**Solución:** Las cuentas del sistema están protegidas y no pueden ser eliminadas.

### Error: "ADMIN users cannot access system accounts"

**Causa:** Usuario ADMIN intentando acceder a cuenta Employees.

**Solución:** Solo SUPER_ADMIN puede acceder a cuentas del sistema.

---

## 📝 Licencia

Proyecto privado - AsistenciaLegal © 2025

---

## 👥 Equipo

Backend desarrollado siguiendo principios de Clean Architecture, DDD y mejores prácticas de seguridad.

---

## 📞 Soporte

Para consultas técnicas o reportar issues, contactar al equipo de desarrollo.
