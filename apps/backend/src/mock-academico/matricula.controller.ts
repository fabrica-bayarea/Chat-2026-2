import { Controller, Get, Param } from '@nestjs/common';
import { MatriculaService, AlunoData } from './matricula.service.js';

@Controller('api/mock/academico/matricula')
export class MatriculaController {
  constructor(private readonly matriculaService: MatriculaService) {}

  @Get(':id')
  async getMatricula(@Param('id') id: string): Promise<AlunoData> {
    return this.matriculaService.consultarMatricula(id);
  }
}