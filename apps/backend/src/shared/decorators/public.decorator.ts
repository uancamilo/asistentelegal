import { SetMetadata } from '@nestjs/common';

/**
 * Marca una ruta como pública (sin requerir autenticación JWT)
 *
 * Uso:
 * @Public()
 * @Get('public-route')
 * async publicRoute() {
 *   return 'This is public';
 * }
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
