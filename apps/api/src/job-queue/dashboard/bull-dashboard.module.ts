import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { QUEUE_NAMES } from '../constants/queue-config.constants';

@Module({
  imports: [
    ConfigModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [],
  exports: [],
})
export class BullDashboardModule {
  static forRoot() {
    return {
      module: BullDashboardModule,
      providers: [
        {
          provide: 'BULL_BOARD',
          useFactory: (configService: ConfigService) => {
            const serverAdapter = new ExpressAdapter();
            serverAdapter.setBasePath('/admin/queues');

            const bullBoard = createBullBoard({
              queues: [
                new BullAdapter(QUEUE_NAMES.DRUG_PROCESSING as any),
                new BullAdapter(QUEUE_NAMES.CONTENT_REFRESH as any),
              ],
              serverAdapter: serverAdapter,
            });

            return {
              router: serverAdapter.getRouter(),
              bullBoard,
            };
          },
          inject: [ConfigService],
        },
      ],
      exports: ['BULL_BOARD'],
    };
  }
}