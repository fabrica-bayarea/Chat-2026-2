import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ALUNOS_DE_DESENVOLVIMENTO, type AlunoConta } from './alunos.js';
import { hashPassword, verifyPassword } from './password.js';

export type AlunoLogado = {
  matricula: string;
  nome: string;
};

type SessionPayload = {
  sub: string;
  nome: string;
  perfil: 'aluno';
};

// Mesma mensagem para matrícula inexistente e senha errada: não revela quais matrículas existem
export const LOGIN_INVALIDO = 'Matrícula ou senha inválidas.';
export const MUITAS_TENTATIVAS =
  'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.';

// Proteção simples contra tentativa e erro de senha, por matrícula, em memória
const MAX_FALHAS = 5;
const JANELA_FALHAS_MS = 15 * 60 * 1000;

// Hash usado quando a matrícula não existe, para o tempo de resposta ser igual ao de senha errada
const HASH_DE_MENTIRA = hashPassword('senha-que-nao-existe');

@Injectable()
export class AuthService {
  private readonly falhasPorMatricula = new Map<string, { falhas: number; desde: number }>();

  constructor(private readonly jwt: JwtService) {}

  async login(matricula: string, senha: string): Promise<{ token: string; aluno: AlunoLogado }> {
    if (this.bloqueadoPorTentativas(matricula)) {
      throw new HttpException(MUITAS_TENTATIVAS, HttpStatus.TOO_MANY_REQUESTS);
    }

    const conta = this.buscarConta(matricula);
    const senhaConfere = verifyPassword(senha, conta?.senhaHash ?? HASH_DE_MENTIRA);

    if (!conta || !senhaConfere) {
      this.registrarFalha(matricula);
      throw new UnauthorizedException(LOGIN_INVALIDO);
    }

    this.falhasPorMatricula.delete(matricula);
    const payload: SessionPayload = { sub: conta.matricula, nome: conta.nome, perfil: 'aluno' };
    const token = await this.jwt.signAsync(payload);
    return { token, aluno: { matricula: conta.matricula, nome: conta.nome } };
  }

  // Devolve o aluno da sessão, ou undefined se o token for inválido, vencido ou de outra conta
  async verificarSessao(token: string | undefined): Promise<AlunoLogado | undefined> {
    if (!token) return undefined;

    let payload: SessionPayload;
    try {
      payload = await this.jwt.verifyAsync<SessionPayload>(token, { algorithms: ['HS256'] });
    } catch {
      return undefined;
    }

    if (payload.perfil !== 'aluno') return undefined;
    // A conta precisa continuar existindo
    const conta = this.buscarConta(payload.sub);
    if (!conta) return undefined;
    return { matricula: conta.matricula, nome: conta.nome };
  }

  private buscarConta(matricula: string): AlunoConta | undefined {
    return ALUNOS_DE_DESENVOLVIMENTO.find((conta) => conta.matricula === matricula);
  }

  private bloqueadoPorTentativas(matricula: string): boolean {
    const registro = this.falhasPorMatricula.get(matricula);
    if (!registro) return false;

    const janelaPassou = Date.now() - registro.desde > JANELA_FALHAS_MS;
    if (janelaPassou) {
      this.falhasPorMatricula.delete(matricula);
      return false;
    }
    return registro.falhas >= MAX_FALHAS;
  }

  private registrarFalha(matricula: string) {
    // Não deixa o mapa crescer sem limite com matrículas inventadas
    if (this.falhasPorMatricula.size > 10_000) this.apagarRegistrosVencidos();

    const registro = this.falhasPorMatricula.get(matricula);
    if (registro) {
      registro.falhas += 1;
      return;
    }
    this.falhasPorMatricula.set(matricula, { falhas: 1, desde: Date.now() });
  }

  private apagarRegistrosVencidos() {
    const agora = Date.now();
    for (const [matricula, registro] of this.falhasPorMatricula) {
      if (agora - registro.desde > JANELA_FALHAS_MS) this.falhasPorMatricula.delete(matricula);
    }
  }
}
