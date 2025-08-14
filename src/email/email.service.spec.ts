import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import * as nodemailer from 'nodemailer';

import { EmailService, EmailTemplate } from './email.service';

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}));

describe('EmailService', () => {
  let service: EmailService;
  let configService: jest.Mocked<ConfigService>;
  let mockTransporter: jest.Mocked<nodemailer.Transporter>;

  const mockConfig = {
    SMTP_HOST: 'smtp.test.com',
    SMTP_PORT: 587,
    SMTP_USER: 'test@example.com',
    SMTP_PASS: 'password',
    SMTP_FROM: 'noreply@twitterx.com',
    APP_URL: 'https://twitterx.com',
  };

  beforeEach(async () => {
    // Create mock transporter
    mockTransporter = {
      sendMail: jest.fn(),
      verify: jest.fn(),
    } as any;

    // Mock nodemailer.createTransport
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    // Create mock ConfigService
    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        return mockConfig[key] || defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize transporter with correct config', () => {
      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.test.com',
        port: 587,
        secure: false,
        auth: {
          user: 'test@example.com',
          pass: 'password',
        },
      });
    });

    it('should use secure connection for port 465', () => {
      // Create new service instance with port 465
      configService.get.mockImplementation(
        (key: string, defaultValue?: any) => {
          if (key === 'SMTP_PORT') return 465;
          return mockConfig[key] || defaultValue;
        },
      );

      // Create new service to trigger initialization
      new EmailService(configService);

      expect(nodemailer.createTransport).toHaveBeenLastCalledWith({
        host: 'smtp.test.com',
        port: 465,
        secure: true,
        auth: {
          user: 'test@example.com',
          pass: 'password',
        },
      });
    });
  });

  describe('sendEmail', () => {
    const mockTemplate: EmailTemplate = {
      subject: 'Test Subject',
      html: '<p>Test HTML</p>',
      text: 'Test Text',
    };

    it('should send email successfully', async () => {
      mockTransporter.sendMail.mockResolvedValueOnce({} as any);

      await service.sendEmail({
        to: 'user@example.com',
        template: mockTemplate,
      });

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'noreply@twitterx.com',
        to: 'user@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
        text: 'Test Text',
      });
    });

    it('should use SMTP_USER as from address when SMTP_FROM is not set', async () => {
      // Test the logic by checking what happens when SMTP_FROM is undefined
      // The service should call configService.get('SMTP_FROM', configService.get('SMTP_USER'))
      // When SMTP_FROM is undefined, it should use the default value which is SMTP_USER

      // Mock configService.get to track calls and return appropriate values
      const mockGet = jest.fn((key: string, defaultValue?: any) => {
        if (key === 'SMTP_FROM') return undefined;
        if (key === 'SMTP_USER') return 'test@example.com';
        return mockConfig[key] || defaultValue;
      });

      configService.get = mockGet;
      mockTransporter.sendMail.mockResolvedValueOnce({} as any);

      await service.sendEmail({
        to: 'user@example.com',
        template: mockTemplate,
      });

      // The service should call get('SMTP_FROM', get('SMTP_USER'))
      // Since SMTP_FROM returns undefined, it should use the default value
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'test@example.com',
        to: 'user@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
        text: 'Test Text',
      });
    });

    it('should retry on failure and succeed on second attempt', async () => {
      mockTransporter.sendMail
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({} as any);

      await service.sendEmail({
        to: 'user@example.com',
        template: mockTemplate,
        retries: 2,
      });

      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(2);
    });

    it('should fail after exhausting all retries', async () => {
      const error = new Error('Persistent error');
      mockTransporter.sendMail.mockRejectedValue(error);

      await expect(
        service.sendEmail({
          to: 'user@example.com',
          template: mockTemplate,
          retries: 2,
        }),
      ).rejects.toThrow(
        'Failed to send email after 2 attempts: Persistent error',
      );

      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(2);
    });

    it('should use default retry count when not specified', async () => {
      const error = new Error('Persistent error');
      mockTransporter.sendMail.mockRejectedValue(error);

      await expect(
        service.sendEmail({
          to: 'user@example.com',
          template: mockTemplate,
        }),
      ).rejects.toThrow(
        'Failed to send email after 3 attempts: Persistent error',
      );

      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(3);
    });
  });

  describe('sendVerificationEmail', () => {
    it('should send verification email with correct template', async () => {
      mockTransporter.sendMail.mockResolvedValueOnce({} as any);

      await service.sendVerificationEmail(
        'user@example.com',
        'token123',
        'testuser',
      );

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'noreply@twitterx.com',
        to: 'user@example.com',
        subject: 'Verify your TwitterX account',
        html: expect.stringContaining('testuser'),
        text: expect.stringContaining('testuser'),
      });

      const call = mockTransporter.sendMail.mock.calls[0][0];
      expect(call.html).toContain(
        'https://twitterx.com/v1/auth/verify-email?token=token123',
      );
      expect(call.text).toContain(
        'https://twitterx.com/v1/auth/verify-email?token=token123',
      );
    });

    it('should include username in email content', async () => {
      mockTransporter.sendMail.mockResolvedValueOnce({} as any);

      await service.sendVerificationEmail(
        'user@example.com',
        'token123',
        'johndoe',
      );

      const call = mockTransporter.sendMail.mock.calls[0][0];
      expect(call.html).toContain('Hi johndoe,');
      expect(call.text).toContain('Hi johndoe,');
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email with correct template', async () => {
      mockTransporter.sendMail.mockResolvedValueOnce({} as any);

      await service.sendPasswordResetEmail(
        'user@example.com',
        'reset123',
        'testuser',
      );

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'noreply@twitterx.com',
        to: 'user@example.com',
        subject: 'Reset your TwitterX password',
        html: expect.stringContaining('testuser'),
        text: expect.stringContaining('testuser'),
      });

      const call = mockTransporter.sendMail.mock.calls[0][0];
      expect(call.html).toContain(
        'https://twitterx.com/reset-password?token=reset123',
      );
      expect(call.text).toContain(
        'https://twitterx.com/reset-password?token=reset123',
      );
    });

    it('should include security warnings in email content', async () => {
      mockTransporter.sendMail.mockResolvedValueOnce({} as any);

      await service.sendPasswordResetEmail(
        'user@example.com',
        'reset123',
        'testuser',
      );

      const call = mockTransporter.sendMail.mock.calls[0][0];
      expect(call.html).toContain('expire in 1 hour');
      expect(call.text).toContain('expire in 1 hour');
      expect(call.html).toContain('Security Notice');
      expect(call.text).toContain('Security Notice');
    });
  });

  describe('sendLoginAlertEmail', () => {
    const mockTimestamp = new Date('2025-01-15T10:30:00Z');
    const deviceInfo = 'Chrome on Windows 10';
    const ipAddress = '192.168.1.100';

    it('should send login alert email with correct template', async () => {
      mockTransporter.sendMail.mockResolvedValueOnce({} as any);

      await service.sendLoginAlertEmail(
        'user@example.com',
        'testuser',
        deviceInfo,
        ipAddress,
        mockTimestamp,
      );

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'noreply@twitterx.com',
        to: 'user@example.com',
        subject: 'New login to your TwitterX account',
        html: expect.stringContaining('testuser'),
        text: expect.stringContaining('testuser'),
      });
    });

    it('should include login details in email content', async () => {
      mockTransporter.sendMail.mockResolvedValueOnce({} as any);

      await service.sendLoginAlertEmail(
        'user@example.com',
        'testuser',
        deviceInfo,
        ipAddress,
        mockTimestamp,
      );

      const call = mockTransporter.sendMail.mock.calls[0][0];
      expect(call.html).toContain(deviceInfo);
      expect(call.html).toContain(ipAddress);
      expect(call.text).toContain(deviceInfo);
      expect(call.text).toContain(ipAddress);
    });

    it('should include security recommendations', async () => {
      mockTransporter.sendMail.mockResolvedValueOnce({} as any);

      await service.sendLoginAlertEmail(
        'user@example.com',
        'testuser',
        deviceInfo,
        ipAddress,
        mockTimestamp,
      );

      const call = mockTransporter.sendMail.mock.calls[0][0];
      expect(call.html).toContain('Change your password immediately');
      expect(call.text).toContain('Change your password immediately');
      expect(call.html).toContain('two-factor authentication');
      expect(call.text).toContain('two-factor authentication');
    });
  });

  describe('verifyConnection', () => {
    it('should return true when connection is successful', async () => {
      mockTransporter.verify.mockResolvedValueOnce(true);

      const result = await service.verifyConnection();

      expect(result).toBe(true);
      expect(mockTransporter.verify).toHaveBeenCalled();
    });

    it('should return false when connection fails', async () => {
      mockTransporter.verify.mockRejectedValueOnce(
        new Error('Connection failed'),
      );

      const result = await service.verifyConnection();

      expect(result).toBe(false);
      expect(mockTransporter.verify).toHaveBeenCalled();
    });
  });

  describe('email templates', () => {
    beforeEach(() => {
      mockTransporter.sendMail.mockResolvedValue({} as any);
    });

    describe('verification email template', () => {
      it('should contain all required elements in HTML template', async () => {
        await service.sendVerificationEmail(
          'user@example.com',
          'token123',
          'testuser',
        );

        const call = mockTransporter.sendMail.mock.calls[0][0];
        const html = call.html;

        expect(html).toContain('Welcome to TwitterX!');
        expect(html).toContain('Hi testuser,');
        expect(html).toContain('verify your email address');
        expect(html).toContain(
          'https://twitterx.com/v1/auth/verify-email?token=token123',
        );
        expect(html).toContain('expire in 24 hours');
        expect(html).toContain('© 2025 TwitterX');
      });

      it('should contain all required elements in text template', async () => {
        await service.sendVerificationEmail(
          'user@example.com',
          'token123',
          'testuser',
        );

        const call = mockTransporter.sendMail.mock.calls[0][0];
        const text = call.text;

        expect(text).toContain('Welcome to TwitterX!');
        expect(text).toContain('Hi testuser,');
        expect(text).toContain('verify your email address');
        expect(text).toContain(
          'https://twitterx.com/v1/auth/verify-email?token=token123',
        );
        expect(text).toContain('expire in 24 hours');
        expect(text).toContain('© 2025 TwitterX');
      });
    });

    describe('password reset email template', () => {
      it('should contain all required elements in HTML template', async () => {
        await service.sendPasswordResetEmail(
          'user@example.com',
          'reset123',
          'testuser',
        );

        const call = mockTransporter.sendMail.mock.calls[0][0];
        const html = call.html;

        expect(html).toContain('Password Reset Request');
        expect(html).toContain('Hi testuser,');
        expect(html).toContain('reset your TwitterX password');
        expect(html).toContain(
          'https://twitterx.com/reset-password?token=reset123',
        );
        expect(html).toContain('expire in 1 hour');
        expect(html).toContain('Security Notice');
        expect(html).toContain('© 2025 TwitterX');
      });

      it('should contain all required elements in text template', async () => {
        await service.sendPasswordResetEmail(
          'user@example.com',
          'reset123',
          'testuser',
        );

        const call = mockTransporter.sendMail.mock.calls[0][0];
        const text = call.text;

        expect(text).toContain('Password Reset Request');
        expect(text).toContain('Hi testuser,');
        expect(text).toContain('reset your TwitterX password');
        expect(text).toContain(
          'https://twitterx.com/reset-password?token=reset123',
        );
        expect(text).toContain('expire in 1 hour');
        expect(text).toContain('Security Notice');
        expect(text).toContain('© 2025 TwitterX');
      });
    });

    describe('login alert email template', () => {
      const mockTimestamp = new Date('2025-01-15T10:30:00Z');

      it('should contain all required elements in HTML template', async () => {
        await service.sendLoginAlertEmail(
          'user@example.com',
          'testuser',
          'Chrome on Windows',
          '192.168.1.100',
          mockTimestamp,
        );

        const call = mockTransporter.sendMail.mock.calls[0][0];
        const html = call.html;

        expect(html).toContain('New Login Alert');
        expect(html).toContain('Hi testuser,');
        expect(html).toContain('new login to your TwitterX account');
        expect(html).toContain('Chrome on Windows');
        expect(html).toContain('192.168.1.100');
        expect(html).toContain("If this wasn't you");
        expect(html).toContain('Change your password immediately');
        expect(html).toContain('© 2025 TwitterX');
      });

      it('should contain all required elements in text template', async () => {
        await service.sendLoginAlertEmail(
          'user@example.com',
          'testuser',
          'Chrome on Windows',
          '192.168.1.100',
          mockTimestamp,
        );

        const call = mockTransporter.sendMail.mock.calls[0][0];
        const text = call.text;

        expect(text).toContain('New Login Alert');
        expect(text).toContain('Hi testuser,');
        expect(text).toContain('new login to your TwitterX account');
        expect(text).toContain('Chrome on Windows');
        expect(text).toContain('192.168.1.100');
        expect(text).toContain("If this wasn't you");
        expect(text).toContain('Change your password immediately');
        expect(text).toContain('© 2025 TwitterX');
      });
    });
  });

  describe('error handling', () => {
    it('should handle transporter initialization errors gracefully', () => {
      (nodemailer.createTransport as jest.Mock).mockImplementationOnce(() => {
        throw new Error('SMTP configuration error');
      });

      expect(() => new EmailService(configService)).toThrow(
        'SMTP configuration error',
      );
    });

    it('should handle missing configuration gracefully', () => {
      const mockConfigServiceEmpty = {
        get: jest.fn((key: string, defaultValue?: any) => {
          if (key === 'SMTP_PORT') return defaultValue; // Return default 587
          return undefined;
        }),
      };

      expect(
        () => new EmailService(mockConfigServiceEmpty as any),
      ).not.toThrow();
      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: undefined,
        port: 587,
        secure: false,
        auth: {
          user: undefined,
          pass: undefined,
        },
      });
    });
  });
});
