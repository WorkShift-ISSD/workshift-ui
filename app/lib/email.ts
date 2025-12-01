// app/lib/email.ts
import { Resend } from 'resend';

// Inicializar Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Email de recuperación de contraseña
export async function sendPasswordResetEmail(
  email: string,
  resetToken: string,
  userName: string
) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password/${resetToken}`;

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'WorkShift <onboarding@resend.dev>',
      to: email,
      subject: 'Recuperación de Contraseña - WorkShift',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Recuperación de Contraseña</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">WorkShift</h1>
            </div>
            
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333; margin-top: 0;">Hola ${userName},</h2>
              
              <p style="font-size: 16px; color: #555;">
                Recibimos una solicitud para restablecer la contraseña de tu cuenta en WorkShift.
              </p>
              
              <p style="font-size: 16px; color: #555;">
                Si no solicitaste este cambio, puedes ignorar este correo de forma segura.
              </p>
              
              <div style="text-align: center; margin: 40px 0;">
                <a href="${resetUrl}" 
                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          color: white; 
                          padding: 15px 40px; 
                          text-decoration: none; 
                          border-radius: 5px; 
                          font-size: 16px; 
                          font-weight: bold;
                          display: inline-block;">
                  Restablecer Contraseña
                </a>
              </div>
              
              <p style="font-size: 14px; color: #777; border-top: 1px solid #ddd; padding-top: 20px; margin-top: 40px;">
                <strong>⏰ Este enlace expirará en 1 hora</strong>
              </p>
              
              <p style="font-size: 14px; color: #777;">
                Si el botón no funciona, copia y pega este enlace en tu navegador:
              </p>
              
              <p style="font-size: 12px; color: #999; word-break: break-all; background: white; padding: 10px; border-radius: 5px;">
                ${resetUrl}
              </p>
              
              <p style="font-size: 12px; color: #999; margin-top: 30px; text-align: center;">
                © ${new Date().getFullYear()} WorkShift. Todos los derechos reservados.
              </p>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Error enviando email:', error);
      throw new Error('Error al enviar el correo de recuperación');
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('Error en sendPasswordResetEmail:', error);
    throw error;
  }
}

// Email de confirmación de cambio de contraseña
export async function sendPasswordChangedEmail(
  email: string,
  userName: string
) {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'WorkShift <onboarding@resend.dev>',
      to: email,
      subject: 'Contraseña Actualizada - WorkShift',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Contraseña Actualizada</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">WorkShift</h1>
            </div>
            
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333; margin-top: 0;">Hola ${userName},</h2>
              
              <div style="background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <p style="margin: 0; color: #155724; font-size: 16px;">
                  ✅ <strong>Tu contraseña ha sido actualizada exitosamente</strong>
                </p>
              </div>
              
              <p style="font-size: 16px; color: #555;">
                Tu contraseña de WorkShift fue cambiada el ${new Date().toLocaleString('es-ES', {
                  dateStyle: 'long',
                  timeStyle: 'short'
                })}.
              </p>
              
              <p style="font-size: 16px; color: #555;">
                Si no realizaste este cambio, contacta inmediatamente a tu administrador o al equipo de soporte.
              </p>
              
              <div style="text-align: center; margin: 40px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}" 
                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          color: white; 
                          padding: 15px 40px; 
                          text-decoration: none; 
                          border-radius: 5px; 
                          font-size: 16px; 
                          font-weight: bold;
                          display: inline-block;">
                  Iniciar Sesión
                </a>
              </div>
              
              <p style="font-size: 12px; color: #999; margin-top: 30px; text-align: center;">
                © ${new Date().getFullYear()} WorkShift. Todos los derechos reservados.
              </p>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Error enviando email:', error);
      return { success: false };
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('Error en sendPasswordChangedEmail:', error);
    return { success: false };
  }
}

// Email de bienvenida (primer ingreso)
export async function sendWelcomeEmail(
  email: string,
  userName: string,
  temporaryPassword: string
) {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'WorkShift <onboarding@resend.dev>',
      to: email,
      subject: 'Bienvenido a WorkShift - Configura tu Cuenta',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Bienvenido a WorkShift</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">¡Bienvenido a WorkShift!</h1>
            </div>
            
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333; margin-top: 0;">Hola ${userName},</h2>
              
              <p style="font-size: 16px; color: #555;">
                Tu cuenta en WorkShift ha sido creada exitosamente. A continuación, encontrarás tus credenciales temporales:
              </p>
              
              <div style="background: white; border: 2px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <p style="margin: 5px 0; font-size: 14px;"><strong>Email:</strong> ${email}</p>
                <p style="margin: 5px 0; font-size: 14px;"><strong>Contraseña temporal:</strong> <code style="background: #f0f0f0; padding: 5px 10px; border-radius: 3px; font-size: 16px;">${temporaryPassword}</code></p>
              </div>
              
              <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <p style="margin: 0; color: #856404; font-size: 14px;">
                  ⚠️ <strong>Importante:</strong> Por seguridad, deberás cambiar tu contraseña en el primer inicio de sesión.
                </p>
              </div>
              
              <div style="text-align: center; margin: 40px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}" 
                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          color: white; 
                          padding: 15px 40px; 
                          text-decoration: none; 
                          border-radius: 5px; 
                          font-size: 16px; 
                          font-weight: bold;
                          display: inline-block;">
                  Iniciar Sesión Ahora
                </a>
              </div>
              
              <p style="font-size: 12px; color: #999; margin-top: 30px; text-align: center;">
                © ${new Date().getFullYear()} WorkShift. Todos los derechos reservados.
              </p>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Error enviando email:', error);
      return { success: false };
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('Error en sendWelcomeEmail:', error);
    return { success: false };
  }
}