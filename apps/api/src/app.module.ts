import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CacheModule } from '@nestjs/cache-manager'
import { DrugsModule } from './drugs/drugs.module'
import { AiContentModule } from './ai-content/ai-content.module'
import { SearchModule } from './search/search.module'
import { McpModule } from './mcp/mcp.module'
import { DatabaseModule } from './database/database.module'
import { JobQueueMainModule } from './job-queue/job-queue-main.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env']
    }),
    
    CacheModule.register({
      isGlobal: true,
      ttl: 300000, // 5 minutes default
      max: 1000
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: parseInt(configService.get('DB_PORT', '5432')),
        username: configService.get('DB_USERNAME', 'postgres'),
        password: configService.get('DB_PASSWORD', 'password'),
        database: configService.get('DB_NAME', 'druginfo'),
        autoLoadEntities: true,
        synchronize: configService.get('NODE_ENV') !== 'production',
        logging: configService.get('NODE_ENV') === 'development'
      }),
      inject: [ConfigService]
    }),

    DatabaseModule,
    DrugsModule,
    AiContentModule,
    SearchModule,
    McpModule,
    JobQueueMainModule
  ]
})
export class AppModule {}