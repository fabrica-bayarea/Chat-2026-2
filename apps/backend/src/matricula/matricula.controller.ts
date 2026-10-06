import { Controller, Get, Param } from '@nestjs/common';
import { MatriculaService, AlunoData } from './matricula.service';

@Controller('api/matriculas')
export class MatriculaController {
constructor(private readonly matriculaService: MatriculaService) {}

@Get(':id')
async getMatricula(@Param('id') id: string): Promise {
return this.matriculaService.consultarMatricula(id);
}
}