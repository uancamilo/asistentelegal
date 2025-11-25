'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import apiClient from '@/lib/api/client'
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Mail,
  User,
  Building2,
  Calendar
} from 'lucide-react'
import { LoadingIndicator, ButtonLoadingIndicator, PageLoadingIndicator } from '@/components/ui/LoadingIndicator'

interface InvitationData {
  valid: boolean
  email?: string
  accountId?: string
  accountName?: string
  expiresAt?: string
  error?: string
}

type PageState = 'validating' | 'valid' | 'invalid' | 'submitting' | 'success' | 'error'

function ActivatePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [pageState, setPageState] = useState<PageState>('validating')
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: ''
  })

  const [formErrors, setFormErrors] = useState({
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: ''
  })

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Validar token al cargar la página
  useEffect(() => {
    if (!token) {
      setPageState('invalid')
      setErrorMessage('Token de invitación no proporcionado')
      return
    }

    validateToken(token)
  }, [token])

  const validateToken = async (token: string) => {
    try {
      setPageState('validating')

      const response = await apiClient.get(`/invitations/validate?token=${token}`)

      if (response.data.valid) {
        setInvitationData(response.data)
        setPageState('valid')
      } else {
        setInvitationData(response.data)
        setPageState('invalid')
        setErrorMessage(response.data.error || 'Token inválido o expirado')
      }
    } catch (error: any) {
      setPageState('invalid')
      setErrorMessage(
        error.response?.data?.message ||
        'Error al validar el token de invitación'
      )
    }
  }

  // Validaciones en tiempo real
  const validateFirstName = (value: string): boolean => {
    if (!value.trim()) {
      setFormErrors(prev => ({ ...prev, firstName: 'El nombre es requerido' }))
      return false
    }
    if (value.trim().length < 2) {
      setFormErrors(prev => ({ ...prev, firstName: 'El nombre debe tener al menos 2 caracteres' }))
      return false
    }
    setFormErrors(prev => ({ ...prev, firstName: '' }))
    return true
  }

  const validateLastName = (value: string): boolean => {
    if (!value.trim()) {
      setFormErrors(prev => ({ ...prev, lastName: 'El apellido es requerido' }))
      return false
    }
    if (value.trim().length < 2) {
      setFormErrors(prev => ({ ...prev, lastName: 'El apellido debe tener al menos 2 caracteres' }))
      return false
    }
    setFormErrors(prev => ({ ...prev, lastName: '' }))
    return true
  }

  const validatePassword = (value: string): boolean => {
    if (!value) {
      setFormErrors(prev => ({ ...prev, password: 'La contraseña es requerida' }))
      return false
    }
    if (value.length < 8) {
      setFormErrors(prev => ({ ...prev, password: 'La contraseña debe tener al menos 8 caracteres' }))
      return false
    }
    if (!/[A-Z]/.test(value)) {
      setFormErrors(prev => ({ ...prev, password: 'Debe incluir al menos una mayúscula' }))
      return false
    }
    if (!/[a-z]/.test(value)) {
      setFormErrors(prev => ({ ...prev, password: 'Debe incluir al menos una minúscula' }))
      return false
    }
    if (!/[0-9]/.test(value)) {
      setFormErrors(prev => ({ ...prev, password: 'Debe incluir al menos un número' }))
      return false
    }
    setFormErrors(prev => ({ ...prev, password: '' }))
    return true
  }

  const validateConfirmPassword = (value: string): boolean => {
    if (!value) {
      setFormErrors(prev => ({ ...prev, confirmPassword: 'Debe confirmar la contraseña' }))
      return false
    }
    if (value !== formData.password) {
      setFormErrors(prev => ({ ...prev, confirmPassword: 'Las contraseñas no coinciden' }))
      return false
    }
    setFormErrors(prev => ({ ...prev, confirmPassword: '' }))
    return true
  }

  // Handlers de cambio con validación
  const handleFirstNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setFormData(prev => ({ ...prev, firstName: value }))
    if (value) validateFirstName(value)
  }

  const handleLastNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setFormData(prev => ({ ...prev, lastName: value }))
    if (value) validateLastName(value)
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setFormData(prev => ({ ...prev, password: value }))
    if (value) validatePassword(value)
    // Re-validar confirmPassword si ya tiene valor
    if (formData.confirmPassword) {
      validateConfirmPassword(formData.confirmPassword)
    }
  }

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setFormData(prev => ({ ...prev, confirmPassword: value }))
    if (value) validateConfirmPassword(value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validar todos los campos
    const isFirstNameValid = validateFirstName(formData.firstName)
    const isLastNameValid = validateLastName(formData.lastName)
    const isPasswordValid = validatePassword(formData.password)
    const isConfirmPasswordValid = validateConfirmPassword(formData.confirmPassword)

    if (!isFirstNameValid || !isLastNameValid || !isPasswordValid || !isConfirmPasswordValid) {
      return
    }

    if (!token) {
      setErrorMessage('Token no disponible')
      return
    }

    setPageState('submitting')

    try {
      const payload = {
        token,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        password: formData.password
      }

      await apiClient.post('/invitations/accept', payload)

      setPageState('success')

      // Redirigir al login después de 3 segundos
      setTimeout(() => {
        router.push('/login')
      }, 3000)

    } catch (error: any) {
      setPageState('error')

      const errorMsg = error.response?.data?.message

      if (errorMsg?.includes('already registered') || errorMsg?.includes('already exists')) {
        setErrorMessage('Este email ya está registrado en el sistema')
      } else if (errorMsg?.includes('expired')) {
        setErrorMessage('El token de invitación ha expirado')
      } else if (errorMsg?.includes('already accepted')) {
        setErrorMessage('Esta invitación ya ha sido aceptada')
      } else if (errorMsg?.includes('already has owner')) {
        setErrorMessage('Esta cuenta ya tiene un propietario asignado')
      } else {
        setErrorMessage(errorMsg || 'Error al activar la cuenta')
      }
    }
  }

  // Estado: Validando token
  if (pageState === 'validating') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <LoadingIndicator message="Validando invitación" size="lg" />
              <p className="text-muted-foreground">
                Por favor espera mientras verificamos tu invitación...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Estado: Token inválido o expirado
  if (pageState === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-2">Invitación inválida</h2>
                <p className="text-muted-foreground mb-4">
                  {errorMessage || 'El enlace de invitación no es válido o ha expirado.'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Por favor contacta al administrador para recibir una nueva invitación.
                </p>
              </div>
              <Button onClick={() => router.push('/login')} variant="outline">
                Ir al Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Estado: Registro exitoso
  if (pageState === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-2">¡Cuenta activada!</h2>
                <p className="text-muted-foreground mb-2">
                  Tu cuenta ha sido creada exitosamente.
                </p>
                <p className="text-sm text-muted-foreground">
                  Serás redirigido al login en unos segundos...
                </p>
              </div>
              <Button onClick={() => router.push('/login')}>
                Ir al Login ahora
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Estado: Error al registrar
  if (pageState === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-2">Error al activar cuenta</h2>
                <p className="text-muted-foreground mb-4">
                  {errorMessage}
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setPageState('valid')} variant="outline">
                  Intentar de nuevo
                </Button>
                <Button onClick={() => router.push('/login')} variant="default">
                  Ir al Login
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Estado: Formulario de registro (valid)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Activar Cuenta</CardTitle>
          <CardDescription>
            Completa tu registro para acceder a tu cuenta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Información de la invitación */}
          {invitationData && (
            <div className="bg-slate-50 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase">
                Información de la Invitación
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {invitationData.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="text-sm font-medium">{invitationData.email}</p>
                    </div>
                  </div>
                )}
                {invitationData.accountName && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Cuenta</p>
                      <p className="text-sm font-medium">{invitationData.accountName}</p>
                    </div>
                  </div>
                )}
                {invitationData.expiresAt && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Válido hasta</p>
                      <p className="text-sm font-medium">
                        {new Date(invitationData.expiresAt).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Formulario de registro */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nombre */}
              <div className="space-y-2">
                <Label htmlFor="firstName" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Nombre *
                </Label>
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  autoComplete="given-name"
                  value={formData.firstName}
                  onChange={handleFirstNameChange}
                  placeholder="Juan"
                  disabled={pageState === 'submitting'}
                  className={formErrors.firstName ? 'border-destructive' : ''}
                />
                {formErrors.firstName && (
                  <p className="text-xs text-destructive">{formErrors.firstName}</p>
                )}
              </div>

              {/* Apellido */}
              <div className="space-y-2">
                <Label htmlFor="lastName" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Apellido *
                </Label>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  value={formData.lastName}
                  onChange={handleLastNameChange}
                  placeholder="Pérez"
                  disabled={pageState === 'submitting'}
                  className={formErrors.lastName ? 'border-destructive' : ''}
                />
                {formErrors.lastName && (
                  <p className="text-xs text-destructive">{formErrors.lastName}</p>
                )}
              </div>
            </div>

            {/* Contraseña */}
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña *</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handlePasswordChange}
                  placeholder="Mínimo 8 caracteres"
                  disabled={pageState === 'submitting'}
                  className={formErrors.password ? 'border-destructive pr-10' : 'pr-10'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {formErrors.password && (
                <p className="text-xs text-destructive">{formErrors.password}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Debe incluir mayúsculas, minúsculas y números
              </p>
            </div>

            {/* Confirmar Contraseña */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Contraseña *</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  placeholder="Repite tu contraseña"
                  disabled={pageState === 'submitting'}
                  className={formErrors.confirmPassword ? 'border-destructive pr-10' : 'pr-10'}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {formErrors.confirmPassword && (
                <p className="text-xs text-destructive">{formErrors.confirmPassword}</p>
              )}
            </div>

            {/* Alert informativo */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Al activar tu cuenta, serás registrado como propietario y podrás acceder al sistema.
              </AlertDescription>
            </Alert>

            {/* Botones */}
            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={
                  pageState === 'submitting' ||
                  !!formErrors.firstName ||
                  !!formErrors.lastName ||
                  !!formErrors.password ||
                  !!formErrors.confirmPassword
                }
                className="flex-1"
              >
                {pageState === 'submitting' ? (
                  <ButtonLoadingIndicator message="Activando cuenta" size="sm" />
                ) : (
                  'Activar Cuenta'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}


export default function ActivatePage() {
  return (
    <Suspense fallback={
      <PageLoadingIndicator message="Cargando" background="gradient" />
    }>
      <ActivatePageContent />
    </Suspense>
  );
}
