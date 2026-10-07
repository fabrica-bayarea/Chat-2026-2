import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { MockAcademicoModule } from './mock-academico/mock-academico.module.js'; 

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    // Telemetria original mantida intacta
    ObserveModule.forRoot({
      appKey: 'YOUR_APP_KEY',
      appSecret: 'YOUR_APP_SECRET',
      serviceId: 'backend',
    }),
    MockAcademicoModule, 
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}