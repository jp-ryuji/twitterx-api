import { Injectable, NestMiddleware, Logger } from '@nestjs/common';

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Define a custom request type
interface CustomRequest extends Request {
  requestId?: string;
  user?: {
    id: string;
  };
}

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestLoggingMiddleware.name);

  use(req: CustomRequest, res: Response, next: NextFunction): void {
    this.assignRequestId(req);
    this.logRequest(req);

    res.on('finish', () => {
      this.logResponse(req, res);
      if (res.statusCode >= 400) {
        this.logErrorResponse(req, res);
      }
    });

    next();
  }

  private assignRequestId(req: CustomRequest): void {
    const requestId = (req.headers['x-request-id'] as string) || uuidv4();
    req.requestId = requestId;
  }

  private logRequest(req: CustomRequest): void {
    const { method, originalUrl, ip, requestId } = req;
    const userAgent = req.get('user-agent') || '';
    const referer = req.get('referer') || '';
    const userId = req.user?.id || 'Guest';

    this.logger.log(
      `[${requestId}] ${method} ${originalUrl} - UserID: ${userId}, IP: ${ip}, User-Agent: ${userAgent}, Referer: ${referer}`,
    );
  }

  private logResponse(req: CustomRequest, res: Response): void {
    const { method, originalUrl, requestId } = req;
    const { statusCode } = res;
    const contentLength = res.get('content-length') || '0';
    const userId = req.user?.id || 'Guest';

    this.logger.log(
      `[${requestId}] ${method} ${originalUrl} ${statusCode} ${contentLength} - UserID: ${userId}`,
    );
  }

  private logErrorResponse(req: CustomRequest, res: Response): void {
    const { method, originalUrl, requestId } = req;
    const { statusCode } = res;
    const userId = req.user?.id || 'Guest';

    this.logger.error(
      `[${requestId}] ${method} ${originalUrl} ${statusCode} - UserID: ${userId} - An error occurred`,
    );
  }
}
