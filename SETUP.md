# AsistenciaLegal - Setup Guide

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Database Setup](#database-setup)
4. [Environment Configuration](#environment-configuration)
5. [Initialization Scripts](#initialization-scripts)
6. [Development](#development)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have:

- **Node.js** >= 18.x
- **npm** >= 9.x
- **PostgreSQL** database (Neon.tech recommended)
- **Git** for version control

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd asistencialegal

# Install dependencies
npm install

# Generate Prisma Client
npx prisma generate
```

## Database Setup

### 1. Create Database

If using Neon.tech:
1. Go to https://console.neon.tech
2. Create a new project
3. Copy the connection string

If using local PostgreSQL:
```bash
createdb asistencialegal
```

### 2. Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your credentials
# Required variables:
# - DATABASE_URL
# - ADMIN_EMAIL
# - ADMIN_PASSWORD
# - SECONDARY_ADMIN_PASSWORD
# - EDITOR_PASSWORD
```

### 3. Run Migrations

```bash
# Apply all migrations
npx prisma migrate deploy

# Or for development
npx prisma migrate dev
```

## Environment Configuration

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `ADMIN_EMAIL` | Super admin email | `admin@example.com` |
| `ADMIN_PASSWORD` | Super admin password | `SecurePassword123!` |
| `SECONDARY_ADMIN_PASSWORD` | Admin user password | `AdminPass456!` |
| `EDITOR_PASSWORD` | Editor user password | `EditorPass789!` |

### Security Best Practices

- **Never commit `.env`** to version control
- Use **strong passwords** (min 12 characters, mixed case, numbers, symbols)
- **Rotate passwords** every 90 days in production
- Use **different passwords** for each environment (dev/staging/prod)

## Initialization Scripts

### Overview

The initialization process creates the initial user hierarchy:

```
SUPER_ADMIN (admin@email.com)
    ↓
Employees Account
    ├── SUPER_ADMIN
    ├── ADMIN (admin@asistencialegal.com)
    └── EDITOR (editor@asistencialegal.com)
```

### Step-by-Step Initialization

#### Step 1: Initialize Super Admin

```bash
npm run init-superadmin
```

**What it does:**
- Creates the first `SUPER_ADMIN` user
- Creates the `Employees` account
- Links `SUPER_ADMIN` to `Employees` account
- Uses credentials from `ADMIN_EMAIL` and `ADMIN_PASSWORD`

**Expected Output:**
```
✅ SUPER_ADMIN initialization completed successfully!

📊 Summary:
   User ID: cmgrh1f150001w27gxzkqdame
   Email: admin@email.com
   Role: SUPER_ADMIN
   Status: ACTIVE
   Account ID: cmgrh1f170002w27g5k3lqrst
   Account Name: Employees
```

#### Step 2: Initialize Employees

```bash
npm run init-admins
```

**What it does:**
- Creates `ADMIN` user (admin@asistencialegal.com)
- Creates `EDITOR` user (editor@asistencialegal.com)
- Assigns both to `Employees` account
- Uses `SECONDARY_ADMIN_PASSWORD` and `EDITOR_PASSWORD`

**Expected Output:**
```
✅ Employee initialization completed!

📊 Summary:
   Total users in database: 3
   Users in "Employees" account: 3

   Users by role:
   - SUPER_ADMIN: 1
   - ADMIN: 1
   - EDITOR: 1
```

#### Step 3: Apply SUPER_ADMIN Constraint

```bash
npm run apply-constraint
```

**What it does:**
- Creates a PostgreSQL partial unique index
- Enforces only **ONE** `SUPER_ADMIN` can exist
- Verifies current database state

**Expected Output:**
```
✅ Partial unique index created successfully!
   Index name: User_role_super_admin_unique
   Constraint: Only one SUPER_ADMIN allowed

📊 Current SUPER_ADMINs in database: 1
   - admin@email.com (ID: cmgrh1f150001w27gxzkqdame)

✅ Database is in a consistent state!
```

### Script Behavior

| Script | Idempotent | Safe to Re-run | Notes |
|--------|-----------|----------------|-------|
| `init-superadmin` | ✅ Yes | ✅ Yes | Skips if SUPER_ADMIN exists |
| `init-admins` | ✅ Yes | ✅ Yes | Skips existing users |
| `apply-constraint` | ✅ Yes | ✅ Yes | Uses `IF NOT EXISTS` |

## Development

### Available Scripts

```bash
# Linting and Formatting
npm run lint              # Check code with ESLint
npm run lint:fix          # Auto-fix ESLint issues
npm run format            # Format code with Prettier
npm run format:check      # Check formatting
npm run typecheck         # Check TypeScript types

# Testing
npm test                  # Run all tests
npm run test:watch        # Run tests in watch mode
npm run test:coverage     # Generate coverage report

# Database
npx prisma generate       # Generate Prisma Client
npx prisma migrate dev    # Create and apply migrations
npx prisma studio         # Open Prisma Studio (GUI)
```

### Development Workflow

1. **Make changes** to code
2. **Run linter**: `npm run lint:fix`
3. **Run tests**: `npm test`
4. **Check types**: `npm run typecheck`
5. **Commit** changes with conventional commit format

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**Example:**
```
feat(auth): add password reset functionality

Implement password reset via email with JWT tokens.
Tokens expire after 1 hour.

Closes #123
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test environment.test.ts

# Run with coverage
npm run test:coverage
```

### Test Structure

```
tests/
├── environment.test.ts           # Environment variable tests
├── prisma-connection.test.ts     # Database connection tests
└── ...                           # Additional test files
```

### Current Test Coverage

- ✅ Environment variable loading
- ✅ Database connection
- ✅ Prisma model access
- ✅ SUPER_ADMIN unique constraint

## Troubleshooting

### Common Issues

#### 1. `ADMIN_EMAIL` not found in .env

**Error:**
```
❌ ERROR: ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env file
```

**Solution:**
```bash
# Ensure .env exists and has correct variables
cp .env.example .env
# Edit .env and set ADMIN_EMAIL and ADMIN_PASSWORD
```

#### 2. Database connection failed

**Error:**
```
Error: P1001: Can't reach database server
```

**Solution:**
- Verify `DATABASE_URL` is correct in `.env`
- Check database is running (if local)
- Verify network connectivity (if remote)
- Check firewall settings

#### 3. Migration failed

**Error:**
```
Error: P3009: migrate found failed migrations
```

**Solution:**
```bash
# Reset database (⚠️ deletes all data)
npx prisma migrate reset

# Re-run initialization
npm run init-superadmin
npm run init-admins
```

#### 4. Multiple SUPER_ADMINs detected

**Error:**
```
⚠️  WARNING: Multiple SUPER_ADMINs detected!
```

**Solution:**
```bash
# Connect to database
npx prisma studio

# Manually change extra SUPER_ADMINs to ADMIN role
# Or use SQL:
UPDATE "User" SET "role" = 'ADMIN' WHERE "role" = 'SUPER_ADMIN' AND "email" != 'admin@email.com';
```

#### 5. Pre-commit hook blocking commit

**Error:**
```
❌ ERROR: .env file detected in staging area!
```

**Solution:**
```bash
# This is intentional! Never commit .env
git reset HEAD .env

# If you need to commit other files:
git add <specific-files>
git commit -m "your message"
```

### Getting Help

- Check the [AUDIT_REPORT.md](./AUDIT_REPORT.md) for detailed findings (local only)
- Review Prisma logs: `npx prisma studio`
- Enable debug mode: `DEBUG=* npm run init-superadmin`

## Security Checklist

Before deploying to production:

- [ ] Rotate all passwords from `.env.example` defaults
- [ ] Enable 2FA for super admin accounts
- [ ] Set up regular database backups
- [ ] Configure SSL/TLS for database connection
- [ ] Review and update `.env` variables
- [ ] Run security audit: `npm audit`
- [ ] Verify pre-commit hooks are active
- [ ] Ensure `.env` is in `.gitignore`
- [ ] Test password reset functionality
- [ ] Configure rate limiting

## Next Steps

After initialization:

1. **Implement authentication** (JWT + refresh tokens)
2. **Create API endpoints** (NestJS/Express)
3. **Add RBAC middleware** (role-based access control)
4. **Implement audit logging**
5. **Set up CI/CD pipeline**
6. **Configure monitoring** (Sentry, DataDog, etc.)

---

**Last Updated:** October 17, 2025
**Version:** 1.0.0
