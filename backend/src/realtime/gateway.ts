import { Server as HttpServer } from 'node:http';
import { Server, Socket } from 'socket.io';
import { ZodError } from 'zod';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { JwtPayload } from '../types';
import { AppError } from '../middleware/errorHandler';
import { SendMessageSchema, SendToConversationSchema, MarkReadSchema } from '../schemas/message';
import * as messageService from '../services/message.service';
import { MessageBroker } from './broker';
import { SOCKET_EVENTS, RealtimeEvent, roomForUser } from './events';

/** Résultat renvoyé au client via le callback d'acquittement (ack). */
export interface AckResult {
  ok: boolean;
  data?: unknown;
  error?: { code?: string; message: string };
}

/** Vérifie le JWT présenté dans le handshake. Renvoie le payload ou `null`. */
export function authenticateHandshake(token: unknown): JwtPayload | null {
  if (typeof token !== 'string' || token.length === 0) return null;
  try {
    return jwt.verify(token, config.jwt.accessSecret) as JwtPayload;
  } catch {
    return null;
  }
}

/** Normalise une erreur en payload d'ack (même contrat que l'errorHandler REST). */
export function toAckError(err: unknown): AckResult {
  if (err instanceof AppError) return { ok: false, error: { code: err.code, message: err.message } };
  if (err instanceof ZodError) return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Données invalides.' } };
  return { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Erreur interne.' } };
}

type Ack = ((result: AckResult) => void) | undefined;

/** Handler `message:send` — envoi direct : persiste puis publie le fan-out. */
export async function handleSend(
  broker: MessageBroker,
  user: JwtPayload,
  payload: unknown,
  ack: Ack,
): Promise<void> {
  try {
    const { recipientId, content } = SendMessageSchema.parse(payload);
    const { message, recipientIds } = await messageService.sendMessage(user.sub, recipientId, content);
    await broker.publish({
      type: SOCKET_EVENTS.MESSAGE_NEW,
      recipients: recipientIds,
      payload: message,
    });
    ack?.({ ok: true, data: message });
  } catch (err) {
    ack?.(toAckError(err));
  }
}

/** Handler `message:send-group` — envoi vers une conversation existante (groupe ou direct). */
export async function handleSendGroup(
  broker: MessageBroker,
  user: JwtPayload,
  payload: unknown,
  ack: Ack,
): Promise<void> {
  try {
    const { conversationId, content } = SendToConversationSchema.parse(payload);
    const { message, recipientIds } = await messageService.sendToConversation(user.sub, conversationId, content);
    await broker.publish({
      type: SOCKET_EVENTS.MESSAGE_NEW,
      recipients: recipientIds,
      payload: message,
    });
    ack?.({ ok: true, data: message });
  } catch (err) {
    ack?.(toAckError(err));
  }
}

/** Handler `message:read` — marque la conversation lue puis notifie l'autre participant. */
export async function handleRead(
  broker: MessageBroker,
  user: JwtPayload,
  payload: unknown,
  ack: Ack,
): Promise<void> {
  try {
    const { conversationId } = MarkReadSchema.parse(payload);
    const receipt = await messageService.markConversationRead(user.sub, conversationId);
    await broker.publish({
      type: SOCKET_EVENTS.CONVERSATION_READ,
      recipients: receipt.recipientIds,
      payload: { conversationId: receipt.conversationId, readerId: receipt.readerId },
    });
    ack?.({ ok: true, data: { conversationId, updated: receipt.updated } });
  } catch (err) {
    ack?.(toAckError(err));
  }
}

/** Diffuse un événement broker vers les rooms Socket.IO des destinataires. */
export function dispatchToRooms(io: Server, event: RealtimeEvent): void {
  for (const userId of event.recipients) {
    io.to(roomForUser(userId)).emit(event.type, event.payload);
  }
}

/** Câble les handlers d'un socket authentifié. */
export function registerSocket(broker: MessageBroker, socket: Socket): void {
  const user = socket.data.user as JwtPayload;
  socket.join(roomForUser(user.sub));

  socket.on(SOCKET_EVENTS.MESSAGE_SEND, (payload: unknown, ack: Ack) =>
    handleSend(broker, user, payload, ack),
  );
  socket.on(SOCKET_EVENTS.MESSAGE_SEND_GROUP, (payload: unknown, ack: Ack) =>
    handleSendGroup(broker, user, payload, ack),
  );
  socket.on(SOCKET_EVENTS.MESSAGE_READ, (payload: unknown, ack: Ack) =>
    handleRead(broker, user, payload, ack),
  );
}

/**
 * Attache la gateway Socket.IO au serveur HTTP.
 * - Middleware d'authentification JWT sur le handshake.
 * - Chaque socket rejoint sa room personnelle `user:<id>`.
 * - S'abonne au broker pour distribuer les événements entrants (Observer).
 */
export function createMessagingGateway(httpServer: HttpServer, broker: MessageBroker): Server {
  const io = new Server(httpServer, {
    cors: { origin: config.cors.origin },
  });

  io.use((socket, next) => {
    const user = authenticateHandshake(socket.handshake.auth?.token);
    if (!user) return next(new AppError(401, 'Token JWT manquant ou invalide.', 'UNAUTHORIZED'));
    socket.data.user = user;
    next();
  });

  io.on('connection', (socket) => registerSocket(broker, socket));
  broker.subscribe((event) => dispatchToRooms(io, event));

  return io;
}
