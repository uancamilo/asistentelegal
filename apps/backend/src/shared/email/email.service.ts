import { Injectable } from '@nestjs/common';
import { SecureLogger } from '../logging/secure-logger.util';

export interface SendInvitationEmailParams {
  to: string;
  accountName: string;
  inviterName: string;
  token: string;
  expiresAt: Date;
}

export interface SendUserInvitationEmailParams {
  to: string;
  firstName: string;
  lastName: string;
  accountName: string;
  role: string;
  inviterName: string;
  token: string;
  expiresAt: Date;
}

/**
 * Servicio de envío de emails
 *
 * NOTA: Esta es una implementación stub para desarrollo.
 * En producción, integrar con un servicio como:
 * - SendGrid
 * - AWS SES
 * - Mailgun
 * - Resend
 */
@Injectable()
export class EmailService {
  private readonly logger = new SecureLogger(EmailService.name);

  /**
   * Envía un email de invitación para ACCOUNT_OWNER
   */
  async sendInvitationEmail(params: SendInvitationEmailParams): Promise<void> {
    const { to, accountName, inviterName, token, expiresAt } = params;

    // URL del frontend (desde variable de entorno)
    const frontendUrl = process.env['FRONTEND_URL'] || 'http://localhost:3000';
    const activationLink = `${frontendUrl}/activate?token=${token}`;

    // Formato de la fecha de expiración
    const expirationDate = expiresAt.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Template del email (en producción, usar un template engine como Handlebars)
    const emailContent = `
═══════════════════════════════════════════════════════════
  INVITACIÓN PARA SER PROPIETARIO DE CUENTA
═══════════════════════════════════════════════════════════

Hola,

Has sido invitado por ${inviterName} para ser el propietario de la cuenta:

  📦 Cuenta: ${accountName}

Para aceptar esta invitación y configurar tu cuenta, haz clic en el siguiente enlace:

  🔗 ${activationLink}

⏰ Esta invitación expira el: ${expirationDate}

Al aceptar la invitación, podrás:
  ✓ Configurar tu contraseña
  ✓ Gestionar los usuarios de tu cuenta
  ✓ Acceder a todas las funcionalidades del sistema

Si no solicitaste esta invitación, puedes ignorar este mensaje.

---
AsistenciaLegal - Sistema de Gestión
    `;

    // TODO: En producción, reemplazar con servicio real de email
    // SECURITY: No loguear emails en producción (GDPR compliance)
    this.logger.emailStub(to, emailContent);

    // Simular delay de envío
    await new Promise((resolve) => setTimeout(resolve, 100));

    // En producción:
    // await this.emailProvider.send({
    //   to,
    //   subject: `Invitación para ser propietario de ${accountName}`,
    //   html: emailTemplate,
    // });
  }

  /**
   * Envía un email de bienvenida tras aceptar la invitación
   */
  async sendWelcomeEmail(params: {
    to: string;
    firstName: string;
    accountName: string;
  }): Promise<void> {
    const { to, firstName, accountName } = params;

    const emailContent = `
═══════════════════════════════════════════════════════════
  ¡BIENVENIDO A ASISTENCIALEGAL!
═══════════════════════════════════════════════════════════

Hola ${firstName},

Tu cuenta ha sido activada exitosamente.

  📦 Cuenta: ${accountName}
  👤 Rol: Propietario de Cuenta

Ya puedes acceder al sistema y comenzar a gestionar tu cuenta.

  🔗 Iniciar sesión: ${process.env['FRONTEND_URL'] || 'http://localhost:3000'}/login

---
AsistenciaLegal - Sistema de Gestión
    `;

    // SECURITY: No loguear emails en producción (GDPR compliance)
    this.logger.emailStub(to, emailContent);

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  /**
   * Envía un email de invitación para un usuario regular (no ACCOUNT_OWNER)
   */
  async sendUserInvitationEmail(
    params: SendUserInvitationEmailParams
  ): Promise<void> {
    const {
      to,
      firstName,
      lastName,
      accountName,
      role,
      inviterName,
      token,
      expiresAt,
    } = params;

    // URL del frontend (desde variable de entorno)
    const frontendUrl = process.env['FRONTEND_URL'] || 'http://localhost:3000';
    const activationLink = `${frontendUrl}/activate?token=${token}`;

    // Formato de la fecha de expiración
    const expirationDate = expiresAt.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Traducir rol al español
    const roleTranslations: Record<string, string> = {
      SUPER_ADMIN: 'Super Administrador',
      ADMIN: 'Administrador',
      EDITOR: 'Editor',
      MEMBER: 'Miembro',
    };
    const roleInSpanish = roleTranslations[role] || role;

    // Template del email
    const emailContent = `
═══════════════════════════════════════════════════════════
  INVITACIÓN PARA UNIRSE A UNA CUENTA
═══════════════════════════════════════════════════════════

Hola ${firstName} ${lastName},

Has sido invitado por ${inviterName} para unirte a la cuenta:

  📦 Cuenta: ${accountName}
  👤 Rol: ${roleInSpanish}

Para aceptar esta invitación y configurar tu contraseña, haz clic en el siguiente enlace:

  🔗 ${activationLink}

⏰ Esta invitación expira el: ${expirationDate}

Al aceptar la invitación, podrás acceder al sistema con el rol asignado.

Si no solicitaste esta invitación, puedes ignorar este mensaje.

---
AsistenciaLegal - Sistema de Gestión
    `;

    // TODO: En producción, reemplazar con servicio real de email
    // SECURITY: No loguear emails en producción (GDPR compliance)
    this.logger.emailStub(to, emailContent);

    // Simular delay de envío
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}
