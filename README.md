# AsistenciaLegal - Sistema de Gestión Legal Multi-tenant

Sistema de gestión de usuarios con arquitectura multi-tenant y control de acceso basado en roles (RBAC) para plataforma SaaS de asistencia legal.

## 📋 Descripción del Proyecto

AsistenciaLegal es una plataforma B2B2C que permite gestionar múltiples cuentas de clientes (bufetes de abogados, empresas) y sus usuarios, con un sistema jerárquico de roles que garantiza aislamiento de datos y permisos granulares.

### Características Principales

- ✅ **Multi-tenancy:** Aislamiento completo de datos entre cuentas
- ✅ **RBAC Jerárquico:** 5 niveles de roles con permisos específicos
- ✅ **Autenticación JWT:** Access tokens (15min) + Refresh tokens (7 días)
- ✅ **Arquitectura Hexagonal:** Separación clara de capas (Domain/Application/Infrastructure)
- ✅ **Domain-Driven Design:** Lógica de negocio en entidades de dominio
- ✅ **Repository Pattern:** Desacoplamiento de persistencia
- ✅ **API REST:** Documentada con OpenAPI/Swagger
- ✅ **TypeScript Strict:** Type-safety completo
- ✅ **Seguridad:** Argon2 para passwords, validación de entradas, Guards

---

## 🏗️ Arquitectura del Proyecto

### Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| **Runtime** | Node.js | 22+ |
| **Lenguaje** | TypeScript | 5.7+ |
| **Framework** | NestJS | 10.4+ |
| **ORM** | Prisma | 6.17+ |
| **Base de Datos** | PostgreSQL | 14+ (Neon) |
| **Autenticación** | Passport.js + JWT | - |
| **Validación** | class-validator | 0.14+ |
| **Hashing** | Argon2 | 0.44+ |
| **Documentación** | Swagger/OpenAPI | 3.0 |

### Estructura de Carpetas

```
asistencialegal/
├── prisma/
│   ├── schema.prisma              # Schema de base de datos
│   ├── migrations/                # Migraciones aplicadas
│   └── erd/                       # Diagramas de entidad-relación
│
├── scripts/
│   ├── init-superadmin.ts         # Inicializa SUPER_ADMIN
│   ├── init-admins.ts             # Inicializa ADMIN y EDITOR
│   ├── apply-super-admin-constraint.ts
│   └── generate-openapi.ts        # Genera openapi.json
│
├── src/
│   ├── config/                    # Configuración centralizada
│   │   ├── app.config.ts          # Config de aplicación
│   │   ├── jwt.config.ts          # Config de JWT
│   │   └── env.validation.ts      # Validación de .env
│   │
│   ├── database/                  # Capa de datos
│   │   ├── prisma.service.ts      # Servicio Prisma
│   │   └── prisma.module.ts       # Módulo Prisma
│   │
│   ├── modules/                   # Módulos de dominio
│   │   ├── auth/                  # Módulo de autenticación
│   │   │   ├── application/
│   │   │   │   ├── dtos/          # Login, RefreshToken DTOs
│   │   │   │   └── use-cases/     # Login, RefreshToken use cases
│   │   │   ├── infrastructure/
│   │   │   │   ├── services/      # JwtService
│   │   │   │   └── strategies/    # Passport strategies
│   │   │   ├── interfaces/
│   │   │   │   └── Auth.controller.ts
│   │   │   └── auth.module.ts
│   │   │
│   │   ├── user/                  # Módulo de usuarios
│   │   │   ├── domain/
│   │   │   │   ├── entities/      # User.entity.ts (lógica RBAC)
│   │   │   │   ├── value-objects/ # Email.vo, Password.vo
│   │   │   │   ├── interfaces/    # IUserRepository
│   │   │   │   └── errors/        # user.errors.ts
│   │   │   ├── application/
│   │   │   │   ├── dtos/          # CreateUser, GetUser DTOs
│   │   │   │   └── use-cases/     # CreateUser, GetUser, ListUsers
│   │   │   ├── infrastructure/
│   │   │   │   ├── repositories/  # PrismaUser.repository.ts
│   │   │   │   └── services/      # Password.service.ts
│   │   │   ├── interfaces/
│   │   │   │   └── User.controller.ts
│   │   │   └── user.module.ts
│   │   │
│   │   └── account/               # Módulo de cuentas
│   │       ├── domain/
│   │       │   ├── entities/      # Account.entity.ts
│   │       │   └── interfaces/    # IAccountRepository
│   │       ├── infrastructure/
│   │       │   └── repositories/  # PrismaAccount.repository.ts
│   │       └── account.module.ts
│   │
│   ├── shared/                    # Componentes compartidos
│   │   ├── decorators/
│   │   │   ├── Roles.decorator.ts       # @Roles()
│   │   │   └── CurrentUser.decorator.ts # @CurrentUser()
│   │   ├── guards/
│   │   │   ├── JwtAuth.guard.ts         # Autenticación
│   │   │   ├── JwtRefresh.guard.ts      # Refresh tokens
│   │   │   └── Roles.guard.ts           # Autorización RBAC
│   │   └── filters/
│   │       └── HttpException.filter.ts  # Manejo de errores
│   │
│   ├── app.module.ts              # Módulo raíz
│   └── main.ts                    # Bootstrap de aplicación
│
├── .env                           # Variables de entorno (NO versionado)
├── .env.example                   # Template de variables
├── .gitignore                     # Archivos ignorados
├── nest-cli.json                  # Configuración NestJS CLI
├── openapi.json                   # Especificación OpenAPI generada
├── package.json                   # Dependencias y scripts
├── tsconfig.json                  # Configuración TypeScript
└── README.md                      # Este archivo
```

---

## 📐 Diagramas UML

### Diagrama de Clases - Entidades de Dominio

<!--
CORREGIDO: UserEntity contiene Email como Value Object mediante composición.
Password.vo existe pero solo se usa durante la creación de usuarios para validación.
UserEntity almacena passwordHash como string (no como VO Password).
Fuente: src/modules/user/domain/entities/User.entity.ts (línea 20: email: Email, línea 21: private _passwordHash: string)
-->

```mermaid
classDiagram
    class UserEntity {
        -id: string
        -email: Email
        -passwordHash: string
        -firstName: string
        -lastName: string
        -role: Role
        -status: UserStatus
        -accountId: string | null
        -createdAt: Date
        -updatedAt: Date

        +canCreateUser(targetRole: Role): boolean
        +canManageEmployees(): boolean
        +canEditAccount(accountId: string, accountName: string, ownerId: string): boolean
        +canViewContent(): boolean
        +canManageContent(): boolean
        +canViewAccountMembers(accountId: string): boolean
        +canEditUser(targetUser: UserEntity): boolean
        +canAccessAccount(accountId: string): boolean
        +suspend(): void
        +activate(): void
        +updateProfile(firstName: string, lastName: string): void
        +updatePasswordHash(newPasswordHash: string): void
    }

    class AccountEntity {
        -id: string
        -name: string
        -ownerId: string
        -createdAt: Date
        -updatedAt: Date

        +isEmployeesAccount(): boolean
        +updateName(newName: string): void
    }

    class Email {
        <<Value Object>>
        -value: string

        +create(email: string): Email
        +getValue(): string
        +equals(other: Email): boolean
        +toString(): string
        -isValid(email: string): boolean
    }

    class Role {
        <<enumeration>>
        SUPER_ADMIN
        ADMIN
        EDITOR
        ACCOUNT_OWNER
        MEMBER
    }

    class UserStatus {
        <<enumeration>>
        INVITED
        ACTIVE
        SUSPENDED
    }

    UserEntity *-- Email : composes
    UserEntity *-- Role : has
    UserEntity *-- UserStatus : has
    UserEntity "n" --> "0..1" AccountEntity : belongsTo
    AccountEntity "1" --> "1" UserEntity : ownedBy
```

### Diagrama de Estados - User Entity

La máquina de estados del usuario define los tres estados posibles y las transiciones válidas entre ellos, diferenciando entre empleados y clientes según la lógica de negocio.

```mermaid
stateDiagram-v2
    [*] --> INVITED : Crear usuario (ADMIN/EDITOR/ACCOUNT_OWNER/MEMBER)
    [*] --> ACTIVE : Crear SUPER_ADMIN (script inicialización)

    INVITED --> ACTIVE : activate() - PENDIENTE endpoint
    INVITED --> [*] : Usuario eliminado

    ACTIVE --> SUSPENDED : suspend()
    ACTIVE --> [*] : Usuario eliminado

    SUSPENDED --> ACTIVE : activate()
    SUSPENDED --> [*] : Usuario eliminado

    note right of INVITED
        Estado inicial para todos los usuarios
        excepto SUPER_ADMIN
        Sin acceso al sistema
        Login rechazado automáticamente

        FUNCIONALIDAD FALTANTE:
        No existe endpoint para activar usuarios
    end note

    note right of ACTIVE
        Acceso completo según rol
        Estado operativo normal
        Todas las funciones disponibles
        Login permitido
    end note

    note right of SUSPENDED
        Acceso temporalmente bloqueado
        Login rechazado en middleware
        Datos conservados para reactivación

        Razones de suspensión:
        Empleados: Violación de políticas internas
        Clientes: Violación de términos / Impago
    end note
```

**Explicación de la Máquina de Estados:**

1. **Estado INVITED** (Para todos excepto SUPER_ADMIN):
   - Todos los usuarios (ADMIN, EDITOR, ACCOUNT_OWNER, MEMBER) inician en estado INVITED
   - No pueden acceder al sistema - el login es rechazado automáticamente
   - ⚠️ **IMPORTANTE:** Actualmente NO existe endpoint para activar usuarios
   - Los usuarios quedan bloqueados permanentemente hasta implementar funcionalidad de activación
   - Pueden ser eliminados antes de activarse

2. **Estado ACTIVE** (Usuario operativo):
   - Solo SUPER_ADMIN se crea directamente en ACTIVE (via script de inicialización)
   - Estado operativo normal con acceso completo según rol
   - Login permitido y funciones disponibles según permisos de rol
   - Pueden ser suspendidos por diferentes razones según tipo de usuario

3. **Estado SUSPENDED** (Acceso temporalmente bloqueado):
   - **Para empleados:** Solo por violación de políticas internas de la empresa
   - **Para clientes:** Por violación de términos de servicio o impago de servicios
   - El login es rechazado automáticamente por el middleware de autenticación
   - Los datos se conservan para permitir reactivación posterior
   - Pueden ser reactivados usando el método `activate()` existente

**Estado Actual de Implementación:**

- **SUPER_ADMIN:** ✅ Funcional - Creación directa → ACTIVE (script de inicialización)
- **Empleados (ADMIN/EDITOR):** ⚠️ Bloqueados - Creación → INVITED (sin manera de activar)
- **Clientes (ACCOUNT_OWNER/MEMBER):** ⚠️ Bloqueados - Creación → INVITED (sin manera de activar)

**Funcionalidad Pendiente:**
- Implementar endpoint `POST /users/activate` para transición INVITED → ACTIVE
- Implementar sistema de tokens/links de activación para seguridad

### Diagrama de Secuencia - Login Flow

```mermaid
sequenceDiagram
    actor User
    participant Controller as Auth Controller
    participant UseCase as Login UseCase
    participant Entity as User Entity
    participant PwdService as Password Service
    participant JwtService as JWT Service
    participant Repo as User Repository
    participant DB as PostgreSQL

    User->>Controller: POST /auth/login<br/>{email, password}
    Controller->>UseCase: execute(LoginDto)

    UseCase->>UseCase: Validate Email VO
    UseCase->>Repo: findByEmail(email)
    Repo->>DB: SELECT * FROM User WHERE email = ?
    DB-->>Repo: User record
    Repo-->>UseCase: UserEntity | null

    alt User not found
        UseCase-->>Controller: UnauthorizedException
        Controller-->>User: 401 Unauthorized
    end

    UseCase->>Entity: Check status
    alt User is SUSPENDED or DELETED
        UseCase-->>Controller: UnauthorizedException
        Controller-->>User: 401 Unauthorized
    end

    UseCase->>PwdService: verify(hash, plainPassword)
    PwdService-->>UseCase: boolean

    alt Invalid password
        UseCase-->>Controller: UnauthorizedException
        Controller-->>User: 401 Unauthorized
    end

    UseCase->>JwtService: generateTokenPair({sub, email, role})
    JwtService-->>UseCase: {accessToken, refreshToken}

    UseCase-->>Controller: LoginResponseDto
    Controller-->>User: 200 OK<br/>{accessToken, refreshToken, user}
```

### Matriz de Permisos RBAC

```mermaid
graph TD
    subgraph "Jerarquía de Roles"
        SUPER[SUPER_ADMIN<br/>👑 Dios del Sistema]
        ADMIN[ADMIN<br/>👔 Gestor de Clientes]
        EDITOR[EDITOR<br/>📝 Gestor de Contenido]
        OWNER[ACCOUNT_OWNER<br/>🏢 Dueño de Cuenta]
        MEMBER[MEMBER<br/>👤 Usuario Final]
    end

    SUPER -.nivel 1.- ADMIN
    SUPER -.nivel 1.- EDITOR
    ADMIN -.nivel 2.- OWNER
    OWNER -.nivel 3.- MEMBER
```

**Matriz Detallada de Permisos (Actualizada):**

> **Principio Fundamental:** SUPER_ADMIN tiene acceso total a TODAS las funciones del sistema sin restricciones.

| Acción | SUPER_ADMIN | ADMIN | EDITOR | ACCOUNT_OWNER | MEMBER |
|--------|-------------|-------|--------|---------------|--------|
| **Gestión de Usuarios** |
| Crear SUPER_ADMIN | ✅ | ❌ | ❌ | ❌ | ❌ |
| Crear ADMIN | ✅ | ❌ | ❌ | ❌ | ❌ |
| Crear EDITOR | ✅ | ❌ | ❌ | ❌ | ❌ |
| Crear ACCOUNT_OWNER | ✅ | ✅ | ❌ | ❌ | ❌ |
| Crear MEMBER | ✅ | ❌ | ❌ | ✅ | ❌ |
| Ver todos los usuarios | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ver usuarios clientes | ✅ | ✅ | ❌ | ❌ | ❌ |
| Ver usuarios de su cuenta | ✅ | ❌ | ❌ | ✅ | ❌ |
| Ver su propio perfil | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Gestión de Cuentas** |
| Ver todas las cuentas | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ver cuentas de clientes | ✅ | ✅ | ❌ | ❌ | ❌ |
| Ver su propia cuenta | ✅ | ❌ | ❌ | ✅ | ✅ |
| Editar cuenta "Employees" | ✅ | ❌ | ❌ | ❌ | ❌ |
| Editar cuentas de clientes | ✅ | ✅ | ❌ | ❌ | ❌ |
| Editar su propia cuenta | ✅ | ❌ | ❌ | ✅ | ❌ |
| **Gestión de Contenido** |
| Ver contenido | ✅ | ❌ | ✅ | ✅ | ✅ |
| Crear/Editar contenido | ✅ | ❌ | ✅ | ❌ | ❌ |
| Eliminar contenido | ✅ | ❌ | ✅ | ❌ | ❌ |
| Generar reportes de contenido | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Reportes y Analytics** |
| Ver reportes de plataforma | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ver reportes de clientes | ✅ | ✅ | ❌ | ❌ | ❌ |
| Ver reportes de contenido | ✅ | ❌ | ✅ | ❌ | ❌ |
| Ver estadísticas de su cuenta | ✅ | ❌ | ❌ | ✅ | ❌ |

**Cambios Realizados en la Matriz:**

🔧 **Correcciones aplicadas a SUPER_ADMIN:**
- ✅ "Ver usuarios clientes" - ahora SUPER_ADMIN puede ver usuarios clientes
- ✅ "Ver usuarios de su cuenta" - ahora SUPER_ADMIN puede ver usuarios de cualquier cuenta
- ✅ "Ver cuentas de clientes" - ahora SUPER_ADMIN puede ver cuentas de clientes
- ✅ "Ver su propia cuenta" - ahora SUPER_ADMIN puede ver su propia cuenta
- ✅ "Editar su propia cuenta" - ahora SUPER_ADMIN puede editar su propia cuenta
- ✅ "Ver reportes de clientes" - ahora SUPER_ADMIN puede ver reportes de clientes
- ✅ "Ver estadísticas de su cuenta" - ahora SUPER_ADMIN puede ver estadísticas de cuentas

**Resultado:** SUPER_ADMIN ahora tiene ✅ en TODAS las filas de la matriz (acceso total sin excepciones).

**Notas Importantes:**

1. **SUPER_ADMIN:**
   - Único usuario de este rol (constraint en DB)
   - Pertenece a la cuenta "Employees"
   - **Acceso total sin restricciones a TODAS las funciones del sistema**
   - Puede realizar cualquier acción sobre usuarios, cuentas, contenido y reportes
   - Todos los permisos están centralizados en `src/shared/authorization/permissions.matrix.ts`

2. **ADMIN:**
   - Pertenece a la cuenta "Employees"
   - NO puede editar la cuenta "Employees" (solo SUPER_ADMIN)
   - Gestiona clientes (ACCOUNT_OWNER)
   - NO tiene acceso a contenido (no es su función)

3. **EDITOR:**
   - Pertenece a la cuenta "Employees"
   - 100% enfocado en contenido
   - NO ve ni gestiona cuentas/usuarios
   - Genera reportes de visualizaciones/descargas de contenido

4. **ACCOUNT_OWNER:**
   - Dueño de una cuenta de cliente
   - Puede invitar MEMBER a su cuenta
   - Ve miembros de su cuenta
   - NO puede editar su propia cuenta (solo ADMIN/SUPER_ADMIN)

5. **MEMBER:**
   - Usuario final de una cuenta de cliente
   - Solo ve contenido y su propio perfil
   - NO puede ver otros miembros de su cuenta

---

## 🚀 Instalación y Configuración

### Requisitos Previos

- **Node.js:** >= 18.x
- **npm:** >= 9.x
- **PostgreSQL:** 14+ (local o Neon.tech)
- **Git:** Para clonar el repositorio

### Pasos de Instalación

#### 1. Clonar el Repositorio

```bash
git clone <repository-url>
cd asistencialegal
```

#### 2. Instalar Dependencias

```bash
npm install
```

#### 3. Configurar Variables de Entorno

```bash
# Copiar template de ejemplo
cp .env.example .env

# Editar .env con tus credenciales
nano .env
```

**Variables requeridas en `.env`:**

```env
# Database
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"

# Application
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# JWT Configuration
JWT_SECRET="your-secret-key-here"
JWT_EXPIRATION=15m
JWT_REFRESH_SECRET="your-refresh-secret-here"
JWT_REFRESH_EXPIRATION=7d

# Super Admin Credentials (for init-superadmin.ts)
ADMIN_EMAIL="admin@email.com"
ADMIN_PASSWORD="admin123"
```

**Generar secretos JWT seguros:**

```bash
# Generar JWT_SECRET
openssl rand -base64 32

# Generar JWT_REFRESH_SECRET
openssl rand -base64 32
```

#### 4. Aplicar Migraciones de Base de Datos

```bash
# Aplicar todas las migraciones
npx prisma migrate deploy

# Generar Prisma Client
npx prisma generate
```

#### 5. Inicializar Datos Base

```bash
# Crear SUPER_ADMIN y cuenta "Employees"
npm run init-superadmin

# Crear ADMIN y EDITOR (empleados)
npm run init-admins

# Aplicar constraint único de SUPER_ADMIN
npm run apply-constraint
```

#### 6. Iniciar la Aplicación

```bash
# Desarrollo (con hot-reload)
npm run start:dev

# Producción
npm run build
npm run start:prod
```

**Servidor corriendo en:**
- API: http://localhost:3000/api
- Swagger UI: http://localhost:3000/api/docs

---

## 📚 Uso de la API

### Swagger Documentation

Acceder a la documentación interactiva en:
```
http://localhost:3000/api/docs
```

### Importar en Postman

```bash
# Generar archivo OpenAPI
npm run generate:openapi

# Importar openapi.json en Postman:
# File > Import > openapi.json
```

### Ejemplos de Endpoints

#### 1. Login

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@email.com",
  "password": "admin123"
}

# Respuesta:
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbWdyaDFmMTUwMDAxdzI3Z3h6a3FkYW1lIiwiZW1haWwiOiJhZG1pbkBlbWFpbC5jb20iLCJyb2xlIjoiU1VQRVJfQURNSU4iLCJpYXQiOjE3NjA4MTAwMDgsImV4cCI6MTc2MTQxNDgwOH0.OuQ5kDqdSIMPd5OgvGNSHdOf5c2T4CgHhkyfR5nD6SI",
  "user": {
    "id": "cuid123",
    "email": "admin@email.com",
    "firstName": "Super",
    "lastName": "Admin",
    "role": "SUPER_ADMIN",
    "status": "ACTIVE"
  }
}
```

#### 2. Refresh Token

```bash
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbWdyaDFmMTUwMDAxdzI3Z3h6a3FkYW1lIiwiZW1haWwiOiJhZG1pbkBlbWFpbC5jb20iLCJyb2xlIjoiU1VQRVJfQURNSU4iLCJpYXQiOjE3NjA4MTAwMDgsImV4cCI6MTc2MTQxNDgwOH0.OuQ5kDqdSIMPd5OgvGNSHdOf5c2T4CgHhkyfR5nD6SI"
}

# Respuesta:
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbWdyaDFmMTUwMDAxdzI3Z3h6a3FkYW1lIiwiZW1haWwiOiJhZG1pbkBlbWFpbC5jb20iLCJyb2xlIjoiU1VQRVJfQURNSU4iLCJpYXQiOjE3NjA4MTAwMDgsImV4cCI6MTc2MTQxNDgwOH0.OuQ5kDqdSIMPd5OgvGNSHdOf5c2T4CgHhkyfR5nD6SI"
}
```

#### 3. Crear Usuario

```bash
POST /api/users
Content-Type: application/json
Authorization: Bearer <access-token>

{
  "email": "owner@cliente.com",
  "password": "Password123!",
  "firstName": "Juan",
  "lastName": "Pérez",
  "role": "ACCOUNT_OWNER"
}

# Respuesta:
{
  "id": "cuid456",
  "email": "owner@cliente.com",
  "firstName": "Juan",
  "lastName": "Pérez",
  "role": "ACCOUNT_OWNER",
  "status": "ACTIVE",
  "accountId": null,
  "createdAt": "2025-10-18T12:00:00Z"
}
```

#### 4. Listar Usuarios

```bash
GET /api/users
Authorization: Bearer <access-token>

# Respuesta (según rol):
{
  "users": [
    {
      "id": "cuid123",
      "email": "admin@email.com",
      "firstName": "Super",
      "lastName": "Admin",
      "fullName": "Super Admin",
      "role": "SUPER_ADMIN",
      "status": "ACTIVE",
      "accountId": "cuid_employees",
      "createdAt": "2025-10-14T10:00:00Z",
      "updatedAt": "2025-10-14T10:00:00Z"
    }
  ],
  "total": 1
}
```

#### 5. Obtener Perfil Propio

```bash
GET /api/users/me
Authorization: Bearer <access-token>

# Respuesta:
{
  "id": "cuid123",
  "email": "admin@email.com",
  "firstName": "Super",
  "lastName": "Admin",
  "fullName": "Super Admin",
  "role": "SUPER_ADMIN",
  "status": "ACTIVE",
  "accountId": "cuid_employees",
  "createdAt": "2025-10-14T10:00:00Z",
  "updatedAt": "2025-10-14T10:00:00Z"
}
```

---

## 🧪 Scripts Disponibles

### Desarrollo

```bash
# Iniciar en modo desarrollo (hot-reload)
npm run start:dev

# Iniciar en modo debug
npm run start:debug

# Compilar TypeScript
npm run build

# Validar tipos sin compilar
npm run typecheck

# Linter
npm run lint
npm run lint:fix

# Formatear código
npm run format
npm run format:check
```

### Base de Datos

```bash
# Generar Prisma Client
npx prisma generate

# Crear nueva migración
npx prisma migrate dev --name <migration-name>

# Aplicar migraciones (producción)
npx prisma migrate deploy

# Abrir Prisma Studio (GUI)
npx prisma studio

# Generar diagrama ERD
npm run generate:erd
```

### Inicialización

```bash
# Inicializar SUPER_ADMIN
npm run init-superadmin

# Inicializar empleados (ADMIN, EDITOR)
npm run init-admins

# Aplicar constraint único de SUPER_ADMIN
npm run apply-constraint
```

### Testing (Pendiente - Fase 4)

```bash
# Ejecutar tests
npm run test

# Tests en modo watch
npm run test:watch

# Coverage
npm run test:coverage
```

### Documentación

```bash
# Generar openapi.json para Postman
npm run generate:openapi
```

---

## 🔐 Seguridad

### Medidas Implementadas

1. **Autenticación:**
   - JWT con tokens de corta duración (15min access, 7 días refresh)
   - Passport.js con estrategias personalizadas
   - Refresh token rotation

2. **Autorización:**
   - RBAC con Guards de NestJS
   - Permisos verificados en capa de dominio
   - Decorador `@Roles()` para control declarativo

3. **Passwords:**
   - Hashing con Argon2id (resistente a GPU cracking)
   - Configuración: 64MB memoria, 3 iteraciones, 4 threads
   - Nunca se almacenan en texto plano

4. **Validación de Entradas:**
   - class-validator en todos los DTOs
   - Sanitización automática con `whitelist: true`
   - Rechazo de propiedades no permitidas

5. **Variables de Entorno:**
   - `.env` nunca se versiona (en `.gitignore`)
   - `.env.example` como template seguro
   - Validación obligatoria al iniciar app

6. **Base de Datos:**
   - Constraint único para SUPER_ADMIN (solo 1 en sistema)
   - SSL requerido para conexiones (Neon)
   - Prisma SQL injection protection

### Mejores Prácticas

```bash
# NUNCA commitear credenciales
git add .env  # ❌ PROHIBIDO

# Usar .env.example como guía
git add .env.example  # ✅ OK

# Rotar secretos JWT periódicamente
openssl rand -base64 32  # Generar nuevo secret
```

---

## 🤝 Contribución

### Estándares de Código

1. **TypeScript Strict:** Todo el código debe compilar sin errores en modo strict
2. **Linting:** Ejecutar `npm run lint:fix` antes de commitear
3. **Formatting:** Usar Prettier (`npm run format`)
4. **Commits:** Usar [Conventional Commits](https://www.conventionalcommits.org/)

### Proceso de Desarrollo

```bash
# 1. Crear branch desde main
git checkout -b feature/nueva-funcionalidad

# 2. Desarrollar con commits atómicos
git commit -m "feat: agregar endpoint de búsqueda"

# 3. Validar antes de push
npm run typecheck && npm run lint && npm run test

# 4. Push y crear Pull Request
git push origin feature/nueva-funcionalidad
```

### Arquitectura

Al agregar nuevas funcionalidades, respetar la arquitectura hexagonal:

1. **Domain:** Entidades, value objects, interfaces de repositorios
2. **Application:** DTOs, use cases (lógica de aplicación)
3. **Infrastructure:** Implementaciones de repositorios, servicios técnicos
4. **Interfaces:** Controllers (entrada HTTP)

---

## 📝 Licencia

ISC

---

## 👥 Equipo

- **Desarrollo:** Camilo
- **Arquitectura:** Diseño hexagonal + DDD
- **Stack:** NestJS + Prisma + PostgreSQL

---

## 📞 Soporte

Para reportar bugs o solicitar features:
- Crear issue en el repositorio
- Email: [pendiente definir]

---

## 📖 Recursos Adicionales

### Documentación Técnica

- **Schema de Base de Datos:** `prisma/schema.prisma`
- **Diagramas ERD:** `prisma/erd/` (autogenerados)
- **OpenAPI Spec:** `openapi.json` (autogenerado)

### Referencias Externas

- [NestJS Documentation](https://docs.nestjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Passport.js](http://www.passportjs.org/)
- [Argon2 Spec](https://github.com/P-H-C/phc-winner-argon2)

---

**Última actualización:** 2025-10-18
**Versión:** 1.0.0
