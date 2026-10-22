import {
  Injectable,
  NotFoundException,
  InternalServerErrorException
} from '@nestjs/common';

export interface AlunoData {
  matricula: string;
  nome: string;
  curso: string;
  status: 'ATIVO' | 'TRANCADO' | 'CONCLUIDO';
  semestreAtual: number;
  cr: number;
}

@Injectable()
export class MatriculaService {
  private readonly mockDatabase: Record<string, AlunoData> = {
    '12345': {
      matricula: '12345',
      nome: 'João Silva',
      curso: 'Engenharia de Software',
      status: 'ATIVO',
      semestreAtual: 4,
      cr: 8.5,
    },
    '2023001': {
      matricula: '2023001',
      nome: 'Maria Souza',
      curso: 'Ciência da Computação',
      status: 'ATIVO',
      semestreAtual: 2,
      cr: 9.1,
    }
  };

  async consultarMatricula(id: string): Promise<AlunoData> {
    // Cenário 3: Simulação de erro interno do servidor
    if (id === 'ERROR500' || id === '99999') {
      throw new InternalServerErrorException(
        'Erro simulado na comunicação com o banco de dados legado do IESB.',
      );
    }

    const aluno = this.mockDatabase[id];

    // Cenário 2: Matrícula inexistente
    if (!aluno) {
      throw new NotFoundException(`Matrícula ${id} não encontrada no sistema.`);
    }

    // Cenário 1: Sucesso
    return aluno;
  }
}