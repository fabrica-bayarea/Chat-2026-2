import {
Injectable,
NotFoundException,
InternalServerErrorException
} from '@nestjs/common';

// Interfaces de tipagem para o contrato da API
export interface AlunoData {
matricula: string;
nome: string;
curso: string;
status: 'ATIVO' | 'TRANCADO' | 'CONCLUIDO';
semestreAtual: number;
cr: number; // Coeficiente de Rendimento
}

@Injectable()
export class MatriculaService {
// Mock em memória simulando o banco de dados
private readonly mockDatabase: Record<string, AlunoData> = {
'12345': {
matricula: '12345',
nome: 'João Silva',
curso: 'Engenharia de Software',
status: 'ATIVO',
semestreAtual: 4,
cr: 8.5,
},
// Você pode adicionar mais mocks de sucesso aqui se precisar
};

async consultarMatricula(id: string): Promise {
// Cenário 3: Simulação de erro interno do servidor
if (id === '99999') {
throw new InternalServerErrorException(
'Erro simulado na comunicação com o banco de dados legado do IESB.',
);
}

// Busca no "banco de dados"
const aluno = this.mockDatabase[id];

// Cenário 2: Matrícula inexistente
if (!aluno) {
  throw new NotFoundException(`Matrícula ${id} não encontrada no sistema.`);
}

// Cenário 1: Sucesso
return aluno;


}
}