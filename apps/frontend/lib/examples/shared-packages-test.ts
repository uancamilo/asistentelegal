/**
 * Archivo de ejemplo para demostrar el uso de paquetes compartidos
 * Este archivo puede ser eliminado una vez que los paquetes estén en uso real
 */

import type { UserRole, LoginDto } from '@asistencialegal/types';
import { emailSchema, passwordSchema } from '@asistencialegal/validators';
import { formatDate, API_ENDPOINTS } from '@asistencialegal/utils';

// Ejemplo de uso de tipos compartidos
const userRole: UserRole = 'MEMBER';
const loginForm: LoginDto = {
  email: 'user@example.com',
  password: 'password123',
};

// Ejemplo de uso de validadores compartidos en el frontend
export const validateEmail = (email: string) => emailSchema.safeParse(email);
export const validatePassword = (password: string) => passwordSchema.safeParse(password);

// Ejemplo de uso de utilidades compartidas
export const formattedDate = formatDate(new Date());
export const apiUrl = API_ENDPOINTS.LOGIN;

console.log({
  userRole,
  loginForm,
  formattedDate,
  apiUrl,
});
