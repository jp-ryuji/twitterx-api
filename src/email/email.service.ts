import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface SendEmailOptions {
  to: string;
  template: EmailTemplate;
  retries?: number;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    const smtpConfig = {
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT', 587),
      secure: this.configService.get<number>('SMTP_PORT', 587) === 465,
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    };

    this.transporter = nodemailer.createTransport(smtpConfig);
    this.logger.log('Email transporter initialized');
  }

  async sendEmail(options: SendEmailOptions): Promise<void> {
    const { to, template, retries = this.maxRetries } = options;

    const mailOptions = {
      from:
        this.configService.get<string>('SMTP_FROM') ||
        this.configService.get<string>('SMTP_USER'),
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    };

    let lastError: Error;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await this.transporter.sendMail(mailOptions);
        this.logger.log(
          `Email sent successfully to ${to} on attempt ${attempt}`,
        );
        return;
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(
          `Email send attempt ${attempt} failed for ${to}: ${lastError.message}`,
        );

        if (attempt < retries) {
          await this.delay(this.retryDelay * attempt);
        }
      }
    }

    this.logger.error(
      `Failed to send email to ${to} after ${retries} attempts: ${lastError.message}`,
    );
    throw new Error(
      `Failed to send email after ${retries} attempts: ${lastError.message}`,
    );
  }

  async sendVerificationEmail(
    email: string,
    token: string,
    username: string,
  ): Promise<void> {
    const verificationUrl = `${this.configService.get<string>('APP_URL')}/v1/auth/verify-email?token=${token}`;

    const template: EmailTemplate = {
      subject: 'Verify your TwitterX account',
      html: this.getVerificationEmailHtml(username, verificationUrl),
      text: this.getVerificationEmailText(username, verificationUrl),
    };

    await this.sendEmail({ to: email, template });
  }

  async sendPasswordResetEmail(
    email: string,
    token: string,
    username: string,
  ): Promise<void> {
    const resetUrl = `${this.configService.get<string>('APP_URL')}/reset-password?token=${token}`;

    const template: EmailTemplate = {
      subject: 'Reset your TwitterX password',
      html: this.getPasswordResetEmailHtml(username, resetUrl),
      text: this.getPasswordResetEmailText(username, resetUrl),
    };

    await this.sendEmail({ to: email, template });
  }

  async sendLoginAlertEmail(
    email: string,
    username: string,
    deviceInfo: string,
    ipAddress: string,
    timestamp: Date,
  ): Promise<void> {
    const template: EmailTemplate = {
      subject: 'New login to your TwitterX account',
      html: this.getLoginAlertEmailHtml(
        username,
        deviceInfo,
        ipAddress,
        timestamp,
      ),
      text: this.getLoginAlertEmailText(
        username,
        deviceInfo,
        ipAddress,
        timestamp,
      ),
    };

    await this.sendEmail({ to: email, template });
  }

  private getVerificationEmailHtml(
    username: string,
    verificationUrl: string,
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Verify your TwitterX account</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #1da1f2; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f8f9fa; }
            .button { display: inline-block; padding: 12px 24px; background-color: #1da1f2; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to TwitterX!</h1>
            </div>
            <div class="content">
              <h2>Hi ${username},</h2>
              <p>Thank you for signing up for TwitterX! To complete your registration, please verify your email address by clicking the button below:</p>
              <p style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify Email Address</a>
              </p>
              <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
              <p><a href="${verificationUrl}">${verificationUrl}</a></p>
              <p>This verification link will expire in 24 hours for security reasons.</p>
              <p>If you didn't create an account with TwitterX, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>© 2025 TwitterX. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private getVerificationEmailText(
    username: string,
    verificationUrl: string,
  ): string {
    return `
Welcome to TwitterX!

Hi ${username},

Thank you for signing up for TwitterX! To complete your registration, please verify your email address by visiting the following link:

${verificationUrl}

This verification link will expire in 24 hours for security reasons.

If you didn't create an account with TwitterX, please ignore this email.

© 2025 TwitterX. All rights reserved.
    `.trim();
  }

  private getPasswordResetEmailHtml(
    username: string,
    resetUrl: string,
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Reset your TwitterX password</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #1da1f2; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f8f9fa; }
            .button { display: inline-block; padding: 12px 24px; background-color: #1da1f2; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
            .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <h2>Hi ${username},</h2>
              <p>We received a request to reset your TwitterX password. If you made this request, click the button below to reset your password:</p>
              <p style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </p>
              <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
              <p><a href="${resetUrl}">${resetUrl}</a></p>
              <div class="warning">
                <strong>Security Notice:</strong>
                <ul>
                  <li>This reset link will expire in 1 hour for security reasons</li>
                  <li>If you didn't request a password reset, please ignore this email</li>
                  <li>Your password will remain unchanged until you create a new one</li>
                </ul>
              </div>
            </div>
            <div class="footer">
              <p>© 2025 TwitterX. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private getPasswordResetEmailText(
    username: string,
    resetUrl: string,
  ): string {
    return `
Password Reset Request

Hi ${username},

We received a request to reset your TwitterX password. If you made this request, visit the following link to reset your password:

${resetUrl}

Security Notice:
- This reset link will expire in 1 hour for security reasons
- If you didn't request a password reset, please ignore this email
- Your password will remain unchanged until you create a new one

© 2025 TwitterX. All rights reserved.
    `.trim();
  }

  private getLoginAlertEmailHtml(
    username: string,
    deviceInfo: string,
    ipAddress: string,
    timestamp: Date,
  ): string {
    const formattedDate = timestamp.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>New login to your TwitterX account</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #1da1f2; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f8f9fa; }
            .info-box { background-color: #e3f2fd; border-left: 4px solid #1da1f2; padding: 15px; margin: 15px 0; }
            .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0; }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New Login Alert</h1>
            </div>
            <div class="content">
              <h2>Hi ${username},</h2>
              <p>We detected a new login to your TwitterX account. Here are the details:</p>

              <div class="info-box">
                <h3>Login Details:</h3>
                <ul>
                  <li><strong>Time:</strong> ${formattedDate}</li>
                  <li><strong>Device:</strong> ${deviceInfo}</li>
                  <li><strong>IP Address:</strong> ${ipAddress}</li>
                </ul>
              </div>

              <p>If this was you, no action is needed. Your account remains secure.</p>

              <div class="warning">
                <strong>If this wasn't you:</strong>
                <ol>
                  <li>Change your password immediately</li>
                  <li>Review your account settings</li>
                  <li>Check for any unauthorized activity</li>
                  <li>Consider enabling two-factor authentication</li>
                </ol>
              </div>

              <p>For your security, we recommend regularly reviewing your account activity and keeping your password strong and unique.</p>
            </div>
            <div class="footer">
              <p>© 2025 TwitterX. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private getLoginAlertEmailText(
    username: string,
    deviceInfo: string,
    ipAddress: string,
    timestamp: Date,
  ): string {
    const formattedDate = timestamp.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    return `
New Login Alert

Hi ${username},

We detected a new login to your TwitterX account. Here are the details:

Login Details:
- Time: ${formattedDate}
- Device: ${deviceInfo}
- IP Address: ${ipAddress}

If this was you, no action is needed. Your account remains secure.

If this wasn't you:
1. Change your password immediately
2. Review your account settings
3. Check for any unauthorized activity
4. Consider enabling two-factor authentication

For your security, we recommend regularly reviewing your account activity and keeping your password strong and unique.

© 2025 TwitterX. All rights reserved.
    `.trim();
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log('SMTP connection verified successfully');
      return true;
    } catch (error) {
      this.logger.error(
        `SMTP connection verification failed: ${(error as Error).message}`,
      );
      return false;
    }
  }
}
