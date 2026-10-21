import 'dotenv/config'
import 'reflect-metadata'
import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import cookieParser from 'cookie-parser'
import { AppModule } from './app.module'
import { AppExceptionFilter } from './common/http/app-exception.filter'
import { ResponseEnvelopeInterceptor } from './common/http/response-envelope.interceptor'
import { AppConfigService } from './config/app-config.service'

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true })
  const config = app.get(AppConfigService).values

  app.setGlobalPrefix('api/v1')
  app.use(cookieParser())
  app.enableCors({ origin: config.corsAllowedOrigins, credentials: true })
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  )
  app.useGlobalFilters(new AppExceptionFilter())
  app.useGlobalInterceptors(new ResponseEnvelopeInterceptor())
  app.enableShutdownHooks()

  await app.listen(config.port)
}

void bootstrap()
