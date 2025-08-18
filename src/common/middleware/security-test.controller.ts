import { Controller, Get, Post, Req, Res } from '@nestjs/common';

import { Request, Response } from 'express';

// Define a custom request type that includes user, session, and CSRF properties
interface CustomRequest extends Request {
  user?: { id: string };
  session: {
    testData?: string;
    [key: string]: any;
  };
  csrfToken: () => string;
}

@Controller('security-test')
export class SecurityTestController {
  @Get('user')
  getUser(@Req() req: CustomRequest) {
    return { userId: req.user?.id || 'No user' };
  }

  @Post('session')
  updateSession(@Req() req: CustomRequest) {
    req.session.testData = 'Hello from session';
    return { message: 'Session updated' };
  }

  @Get('session')
  getSession(@Req() req: CustomRequest) {
    const testData: string = req.session.testData || 'No data';
    return { testData };
  }

  @Get('csrf')
  getCsrfToken(@Req() req: CustomRequest, @Res() res: Response) {
    const csrfToken: string = req.csrfToken();
    res.json({ csrfToken });
  }

  @Post('csrf')
  postWithCsrf(@Req() req: CustomRequest, @Res() res: Response) {
    const userId = req.user?.id;
    const sessionData: string | undefined = req.session.testData;
    res.json({
      message: 'CSRF token is valid',
      userId,
      sessionData,
    });
  }
}
