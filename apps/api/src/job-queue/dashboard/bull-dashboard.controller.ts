import { Controller, Get, Req, Res, Next, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiExcludeEndpoint } from '@nestjs/swagger';
import type { Request, Response, NextFunction } from 'express';

// Simple basic auth guard for Bull Dashboard
@Controller('admin/queues')
@ApiTags('Queue Dashboard')
export class BullDashboardController {
  constructor() {}

  @Get('*')
  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Bull Dashboard UI' })
  @ApiResponse({ status: 200, description: 'Dashboard UI rendered' })
  async dashboard(@Req() req: Request, @Res() res: Response, @Next() next: NextFunction) {
    // Basic authentication middleware
    const auth = req.headers.authorization;
    
    if (!auth) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Bull Dashboard"');
      return res.status(401).send('Authentication required');
    }

    const credentials = Buffer.from(auth.split(' ')[1], 'base64').toString().split(':');
    const username = credentials[0];
    const password = credentials[1];

    // Check credentials against environment variables
    const validUsername = process.env.BULL_BOARD_USERNAME || 'admin';
    const validPassword = process.env.BULL_BOARD_PASSWORD || 'password';

    if (username !== validUsername || password !== validPassword) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Bull Dashboard"');
      return res.status(401).send('Invalid credentials');
    }

    // If authenticated, proceed to the dashboard
    // Note: This would need to be integrated with the actual Bull Board router
    next();
  }
}