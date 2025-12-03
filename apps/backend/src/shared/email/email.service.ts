import { Injectable, OnModuleInit } from '@nestjs/common';
import { SecureLogger } from '../logging/secure-logger.util';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

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

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

/**
 * Servicio de envío de emails con soporte SMTP real
 *
 * Configuración via variables de entorno:
 * - SMTP_HOST: Servidor SMTP (smtp.sendgrid.net, etc.)
 * - SMTP_PORT: Puerto (587 para TLS, 465 para SSL)
 * - SMTP_USER: Usuario SMTP
 * - SMTP_PASS: Contraseña SMTP
 * - SMTP_FROM: Dirección de envío
 * - SMTP_SECURE: true para SSL (puerto 465)
 *
 * Si SMTP_HOST no está configurado, los emails solo se loguean (modo desarrollo)
 */
@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new SecureLogger(EmailService.name);
  private transporter: Transporter | null = null;
  private smtpConfig: SmtpConfig | null = null;
  private isConfigured = false;

  async onModuleInit(): Promise<void> {
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    const host = process.env['SMTP_HOST'];
    const port = parseInt(process.env['SMTP_PORT'] || '587', 10);
    const secure = process.env['SMTP_SECURE'] === 'true';
    const user = process.env['SMTP_USER'];
    const pass = process.env['SMTP_PASS'];
    const from = process.env['SMTP_FROM'] || 'AsistenciaLegal <noreply@asistencialegal.com>';

    if (!host || !user || !pass) {
      this.logger.warn(
        'SMTP not configured (SMTP_HOST, SMTP_USER, or SMTP_PASS missing). ' +
        'Emails will only be logged, not sent. Configure SMTP for production.'
      );
      this.isConfigured = false;
      return;
    }

    this.smtpConfig = { host, port, secure, user, pass, from };

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });

    this.isConfigured = true;
    this.logger.log(`Email service configured with SMTP host: ${host}`);
  }

  /**
   * Verifica la conexión SMTP
   */
  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      this.logger.log('SMTP connection verified successfully');
      return true;
    } catch (error) {
      this.logger.error('SMTP connection verification failed', error instanceof Error ? error : undefined);
      return false;
    }
  }

  /**
   * Envía un email usando el transporter configurado o loguea si no está configurado
   */
  private async sendEmail(params: {
    to: string;
    subject: string;
    text: string;
    html: string;
  }): Promise<boolean> {
    const { to, subject, text, html } = params;

    if (!this.isConfigured || !this.transporter || !this.smtpConfig) {
      // Modo desarrollo: solo loguear
      this.logger.emailStub(to, text);
      return true;
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.smtpConfig.from,
        to,
        subject,
        text,
        html,
      });

      this.logger.log(`Email sent successfully to ${to}. MessageId: ${info.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, error instanceof Error ? error : undefined);
      // En producción, no fallar silenciosamente - lanzar el error
      if (process.env['NODE_ENV'] === 'production') {
        throw error;
      }
      // En desarrollo, loguear y continuar
      this.logger.emailStub(to, text);
      return false;
    }
  }

  /**
   * Envía un email de invitación para ACCOUNT_OWNER
   */
  async sendInvitationEmail(params: SendInvitationEmailParams): Promise<void> {
    const { to, accountName, inviterName, token, expiresAt } = params;

    const frontendUrl = process.env['FRONTEND_URL'] || 'http://localhost:3000';
    const activationLink = `${frontendUrl}/activate?token=${token}`;

    const expirationDate = expiresAt.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const textContent = `
INVITACIÓN PARA SER PROPIETARIO DE CUENTA

Hola,

Has sido invitado por ${inviterName} para ser el propietario de la cuenta: ${accountName}

Para aceptar esta invitación y configurar tu cuenta, visita:
${activationLink}

Esta invitación expira el: ${expirationDate}

Al aceptar la invitación, podrás:
- Configurar tu contraseña
- Gestionar los usuarios de tu cuenta
- Acceder a todas las funcionalidades del sistema

Si no solicitaste esta invitación, puedes ignorar este mensaje.

---
AsistenciaLegal - Sistema de Gestión
    `;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Invitación para ser Propietario de Cuenta</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <p>Hola,</p>

    <p>Has sido invitado por <strong>${inviterName}</strong> para ser el propietario de la cuenta:</p>

    <div style="background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;">
      <strong style="color: #667eea;">📦 ${accountName}</strong>
    </div>

    <p>Para aceptar esta invitación y configurar tu cuenta, haz clic en el siguiente botón:</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${activationLink}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
        Aceptar Invitación
      </a>
    </div>

    <p style="color: #6b7280; font-size: 14px;">
      ⏰ Esta invitación expira el: <strong>${expirationDate}</strong>
    </p>

    <p>Al aceptar la invitación, podrás:</p>
    <ul style="color: #374151;">
      <li>✓ Configurar tu contraseña</li>
      <li>✓ Gestionar los usuarios de tu cuenta</li>
      <li>✓ Acceder a todas las funcionalidades del sistema</li>
    </ul>

    <p style="color: #9ca3af; font-size: 12px; margin-top: 30px;">
      Si no solicitaste esta invitación, puedes ignorar este mensaje.
    </p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">

    <p style="color: #9ca3af; font-size: 12px; text-align: center;">
      AsistenciaLegal - Sistema de Gestión Legal
    </p>
  </div>
</body>
</html>
    `;

    await this.sendEmail({
      to,
      subject: `Invitación para ser propietario de ${accountName}`,
      text: textContent,
      html: htmlContent,
    });
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
    const frontendUrl = process.env['FRONTEND_URL'] || 'http://localhost:3000';

    const textContent = `
¡BIENVENIDO A ASISTENCIALEGAL!

Hola ${firstName},

Tu cuenta ha sido activada exitosamente.

Cuenta: ${accountName}
Rol: Propietario de Cuenta

Ya puedes acceder al sistema y comenzar a gestionar tu cuenta.

Iniciar sesión: ${frontendUrl}/login

---
AsistenciaLegal - Sistema de Gestión
    `;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">¡Bienvenido a AsistenciaLegal!</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <p>Hola <strong>${firstName}</strong>,</p>

    <p>Tu cuenta ha sido activada exitosamente. 🎉</p>

    <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>📦 Cuenta:</strong> ${accountName}</p>
      <p style="margin: 5px 0;"><strong>👤 Rol:</strong> Propietario de Cuenta</p>
    </div>

    <p>Ya puedes acceder al sistema y comenzar a gestionar tu cuenta.</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${frontendUrl}/login" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
        Iniciar Sesión
      </a>
    </div>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">

    <p style="color: #9ca3af; font-size: 12px; text-align: center;">
      AsistenciaLegal - Sistema de Gestión Legal
    </p>
  </div>
</body>
</html>
    `;

    await this.sendEmail({
      to,
      subject: `¡Bienvenido a ${accountName}!`,
      text: textContent,
      html: htmlContent,
    });
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

    const frontendUrl = process.env['FRONTEND_URL'] || 'http://localhost:3000';
    const activationLink = `${frontendUrl}/activate?token=${token}`;

    const expirationDate = expiresAt.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const roleTranslations: Record<string, string> = {
      SUPER_ADMIN: 'Super Administrador',
      ADMIN: 'Administrador',
      EDITOR: 'Editor',
      MEMBER: 'Miembro',
      ACCOUNT_OWNER: 'Propietario de Cuenta',
    };
    const roleInSpanish = roleTranslations[role] || role;

    const textContent = `
INVITACIÓN PARA UNIRSE A UNA CUENTA

Hola ${firstName} ${lastName},

Has sido invitado por ${inviterName} para unirte a la cuenta: ${accountName}
Rol asignado: ${roleInSpanish}

Para aceptar esta invitación y configurar tu contraseña, visita:
${activationLink}

Esta invitación expira el: ${expirationDate}

Al aceptar la invitación, podrás acceder al sistema con el rol asignado.

Si no solicitaste esta invitación, puedes ignorar este mensaje.

---
AsistenciaLegal - Sistema de Gestión
    `;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Invitación para Unirse a una Cuenta</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <p>Hola <strong>${firstName} ${lastName}</strong>,</p>

    <p>Has sido invitado por <strong>${inviterName}</strong> para unirte a la cuenta:</p>

    <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>📦 Cuenta:</strong> ${accountName}</p>
      <p style="margin: 5px 0;"><strong>👤 Rol:</strong> ${roleInSpanish}</p>
    </div>

    <p>Para aceptar esta invitación y configurar tu contraseña, haz clic en el siguiente botón:</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${activationLink}" style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
        Aceptar Invitación
      </a>
    </div>

    <p style="color: #6b7280; font-size: 14px;">
      ⏰ Esta invitación expira el: <strong>${expirationDate}</strong>
    </p>

    <p style="color: #9ca3af; font-size: 12px; margin-top: 30px;">
      Si no solicitaste esta invitación, puedes ignorar este mensaje.
    </p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">

    <p style="color: #9ca3af; font-size: 12px; text-align: center;">
      AsistenciaLegal - Sistema de Gestión Legal
    </p>
  </div>
</body>
</html>
    `;

    await this.sendEmail({
      to,
      subject: `Invitación para unirte a ${accountName}`,
      text: textContent,
      html: htmlContent,
    });
  }
}
