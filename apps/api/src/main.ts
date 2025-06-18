import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import helmet from 'helmet'
import compression from 'compression'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: [
        'http://localhost:3000',
        'http://localhost:3001',
        process.env.FRONTEND_URL || 'http://localhost:3000'
      ],
      credentials: true
    }
  })

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }))

  // Compression middleware
  app.use(compression())

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true
      }
    })
  )

  // API prefix
  app.setGlobalPrefix('api')

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Drug Information Platform API')
    .setDescription('AI-enhanced drug information publishing platform API with MCP integration')
    .setVersion('1.0')
    .addTag('drugs', 'Drug information and search')
    .addTag('ai-content', 'AI-enhanced content generation')
    .addTag('search', 'Advanced search functionality')
    .addTag('mcp', 'Model Context Protocol tools')
    .build()

  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Drug Platform API Documentation',
    customCss: '.swagger-ui .topbar { display: none }'
  })

  const port = process.env.PORT || 3001
  await app.listen(port)
  
  console.log(`🚀 API server running on http://localhost:${port}`)
  console.log(`📚 API documentation available at http://localhost:${port}/api/docs`)
}

bootstrap()