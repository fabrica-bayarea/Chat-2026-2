import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { loadAuthConfig } from './auth.config.js';
import { AuthService, type AlunoLogado } from './auth.service.js';

export const SESSION_COOKIE = 'chat_session';

// Lê o cookie da sessão sem depender de biblioteca de cookies
export function readSessionCookie(cookieHeader: string | undefined): string | undefined {
  if (!cookieHeader) return undefined;
  for (const piece of cookieHeader.split(';')) {
    const [name, ...rest] = piece.trim().split('=');
    if (name === SESSION_COOKIE) return rest.join('=') || undefined;
  }
  return undefined;
}

const MAX_CAMPO = 100;

function campoTexto(body: unknown, campo: string): string {
  const valor = (body as Record<string, unknown> | null)?.[campo];
  if (typeof valor !== 'string' || !valor.trim() || valor.length > MAX_CAMPO) {
    throw new BadRequestException(`Campo ${campo} obrigatório.`);
  }
  return valor.trim();
}

@Controller('api/auth')
export class AuthController {
  private readonly config = loadAuthConfig();

  constructor(private readonly auth: AuthService) {}

  // O token vai só no cookie httponly: o JavaScript da página não consegue ler
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ aluno: AlunoLogado }> {
    const matricula = campoTexto(body, 'matricula');
    const senha = campoTexto(body, 'senha');

    const { token, aluno } = await this.auth.login(matricula, senha);
    res.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.cookieSecure,
      path: '/',
      maxAge: this.config.sessionHours * 60 * 60 * 1000,
    });
    return { aluno };
  }

  // Usado pelo front (quem está logado?) e pelo mastra-core (de quem é este cookie?)
  @Get('me')
  async me(@Req() req: Request): Promise<{ aluno: AlunoLogado }> {
    const aluno = await this.auth.verificarSessao(readSessionCookie(req.headers.cookie));
    if (!aluno) throw new UnauthorizedException('Sessão inválida ou expirada.');
    return { aluno };
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response): void {
    res.clearCookie(SESSION_COOKIE, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.cookieSecure,
      path: '/',
    });
  }
}
