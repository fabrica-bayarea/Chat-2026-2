import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ConversationsService } from './conversations.service.js';
import type { ConversationDetail, ConversationSummary } from './conversations.types.js';
import {
  parseConversationId,
  parseFeedback,
  parseMessageId,
  parseMessages,
  parseTitle,
} from './conversations.validation.js';

// Quem é o dono das conversas. Ainda não há login no projeto: cada navegador recebe um
// usuário anônimo, identificado por um id aleatório num cookie httponly (o JavaScript da
// página não lê). Quando o login existir, o id passa a vir da sessão do usuário.
export const USER_COOKIE = 'chat_usuario';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export function readUserCookie(cookieHeader: string | undefined): string | undefined {
  if (!cookieHeader) return undefined;
  for (const piece of cookieHeader.split(';')) {
    const [name, ...rest] = piece.trim().split('=');
    if (name !== USER_COOKIE) continue;
    const value = rest.join('=');
    return UUID.test(value) ? value : undefined;
  }
  return undefined;
}

@Controller('api/conversations')
export class ConversationsController {
  constructor(private readonly conversations: ConversationsService) {}

  // Garante um usuário para gravar e, se ele é novo, manda o cookie
  private async userForWrite(req: Request, res: Response): Promise<string> {
    const { userId, created } = await this.conversations.ensureUser(
      readUserCookie(req.headers.cookie),
    );
    if (created) {
      res.cookie(USER_COOKIE, userId, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: ONE_YEAR_MS,
      });
    }
    return userId;
  }

  @Get()
  list(@Req() req: Request): Promise<ConversationSummary[]> {
    return this.conversations.list(readUserCookie(req.headers.cookie));
  }

  @Post()
  async create(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: unknown,
  ): Promise<ConversationSummary> {
    const requestedId = (body as { id?: unknown } | undefined)?.id;
    const conversationId = requestedId === undefined ? undefined : parseConversationId(requestedId);
    const userId = await this.userForWrite(req, res);
    return this.conversations.create(userId, conversationId);
  }

  @Get(':id')
  get(@Req() req: Request, @Param('id') id: string): Promise<ConversationDetail> {
    return this.conversations.get(readUserCookie(req.headers.cookie), parseConversationId(id));
  }

  // Grava a conversa inteira (cria se ainda não existe). Usado depois de cada resposta.
  @Put(':id/messages')
  @HttpCode(204)
  async saveMessages(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<void> {
    const conversationId = parseConversationId(id);
    const messages = parseMessages(body);
    const userId = await this.userForWrite(req, res);
    await this.conversations.saveMessages(userId, conversationId, messages);
  }

  @Patch(':id')
  @HttpCode(204)
  rename(@Req() req: Request, @Param('id') id: string, @Body() body: unknown): Promise<void> {
    return this.conversations.rename(
      readUserCookie(req.headers.cookie),
      parseConversationId(id),
      parseTitle(body),
    );
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Req() req: Request, @Param('id') id: string): Promise<void> {
    return this.conversations.remove(readUserCookie(req.headers.cookie), parseConversationId(id));
  }

  @Put(':id/messages/:messageId/feedback')
  @HttpCode(204)
  setFeedback(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('messageId') messageId: string,
    @Body() body: unknown,
  ): Promise<void> {
    return this.conversations.setFeedback(
      readUserCookie(req.headers.cookie),
      parseConversationId(id),
      parseMessageId(messageId),
      parseFeedback(body),
    );
  }
}
