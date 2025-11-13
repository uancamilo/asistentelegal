/**
 * Archivo de ejemplo para demostrar el uso de paquetes compartidos
 * Este archivo puede ser eliminado una vez que los paquetes estén en uso real
 */

import { UserRole, LoginDto } from '@asistencialegal/types';
import { emailSchema, passwordSchema } from '@asistencialegal/validators';
import { formatDate, API_ENDPOINTS } from '@asistencialegal/utils';

// Ejemplo de uso de tipos compartidos
const adminRole: UserRole = 'ADMIN';
const loginData: LoginDto = {
  email: 'admin@example.com',
  password: 'securePassword123',
};

// Ejemplo de uso de validadores compartidos
const isEmailValid = emailSchema.safeParse('test@example.com');
const isPasswordValid = passwordSchema.safeParse('password123');

// Ejemplo de uso de utilidades compartidas
const today = formatDate(new Date());
const loginEndpoint = API_ENDPOINTS.LOGIN;

console.log({
  adminRole,
  loginData,
  isEmailValid,
  isPasswordValid,
  today,
  loginEndpoint,
});
