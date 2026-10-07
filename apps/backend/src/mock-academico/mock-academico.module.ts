import { Module } from '@nestjs/common';
import { MatriculaController } from './matricula.controller.js';
import { MatriculaService } from './matricula.service.js';

@Module({
  controllers: [MatriculaController],
  providers: [MatriculaService],
  exports: [MatriculaService],
})
export class MockAcademicoModule {}