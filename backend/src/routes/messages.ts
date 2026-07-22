import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import {
  SendMessageSchema,
  SendToConversationSchema,
  CreateGroupSchema,
  RenameGroupSchema,
  AddMemberSchema,
} from '../schemas/message';
import { PaginationQuerySchema } from '../schemas/pagination';
import * as messageService from '../services/message.service';
import { publishRealtime, SOCKET_EVENTS } from '../realtime';

const router = Router();

// Toutes les routes de messagerie sont réservées aux utilisateurs authentifiés.

// Liste des conversations de l'utilisateur (directs + groupes, dernier message + non-lus)
router.get('/conversations', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = PaginationQuerySchema.parse(req.query);
    const result = await messageService.listConversations(req.user!.sub, page, limit);
    res.json(result);
  } catch (err) { next(err); }
});

// Historique paginé d'une conversation
router.get('/conversations/:conversationId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = PaginationQuerySchema.parse(req.query);
    const result = await messageService.getMessages(req.user!.sub, req.params.conversationId, page, limit);
    res.json(result);
  } catch (err) { next(err); }
});

// Marquer une conversation comme lue + notifier les autres participants
router.post('/conversations/:conversationId/read', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const receipt = await messageService.markConversationRead(req.user!.sub, req.params.conversationId);
    await publishRealtime({
      type: SOCKET_EVENTS.CONVERSATION_READ,
      recipients: [...receipt.recipientIds, receipt.readerId],
      payload: { conversationId: receipt.conversationId, readerId: receipt.readerId },
    });
    res.json({ conversationId: receipt.conversationId, updated: receipt.updated });
  } catch (err) { next(err); }
});

// Envoi vers une conversation existante (direct ou groupe) + fan-out temps réel
router.post('/conversations/:conversationId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { conversationId, content } = SendToConversationSchema.parse({
      conversationId: req.params.conversationId,
      content: req.body?.content,
    });
    const { message, recipientIds } = await messageService.sendToConversation(req.user!.sub, conversationId, content);
    await publishRealtime({ type: SOCKET_EVENTS.MESSAGE_NEW, recipients: recipientIds, payload: message });
    res.status(201).json(message);
  } catch (err) { next(err); }
});

// Envoi d'un message direct (get-or-create) — repli REST du canal socket
router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { recipientId, content } = SendMessageSchema.parse(req.body);
    const { message, recipientIds } = await messageService.sendMessage(
      req.user!.sub,
      req.user!.role,
      recipientId,
      content,
    );
    await publishRealtime({ type: SOCKET_EVENTS.MESSAGE_NEW, recipients: recipientIds, payload: message });
    res.status(201).json(message);
  } catch (err) { next(err); }
});

// ─── Groupes ────────────────────────────────────────────────────────────────────

// Création d'un groupe (créateur = admin ; membres = amis) → notifie les membres
router.post('/groups', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, memberIds } = CreateGroupSchema.parse(req.body);
    const conversation = await messageService.createGroup(req.user!.sub, title, memberIds);
    const members = conversation.participants.map((p) => p.id).filter((id) => id !== req.user!.sub);
    await publishRealtime({ type: SOCKET_EVENTS.CONVERSATION_NEW, recipients: members, payload: { conversationId: conversation.id } });
    res.status(201).json(conversation);
  } catch (err) { next(err); }
});

// Renommer un groupe (admin) → notifie tous les participants
router.patch('/groups/:conversationId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title } = RenameGroupSchema.parse(req.body);
    const { conversation, participantIds } = await messageService.renameGroup(req.user!.sub, req.params.conversationId, title);
    await publishRealtime({ type: SOCKET_EVENTS.CONVERSATION_UPDATED, recipients: participantIds, payload: { conversationId: conversation.id } });
    res.json(conversation);
  } catch (err) { next(err); }
});

// Ajouter un membre (admin) → notifie le nouveau (NEW) et les autres (UPDATED)
router.post('/groups/:conversationId/members', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = AddMemberSchema.parse(req.body);
    const { addedUserId, participantIds } = await messageService.addMember(req.user!.sub, req.params.conversationId, userId);
    await publishRealtime({ type: SOCKET_EVENTS.CONVERSATION_NEW, recipients: [addedUserId], payload: { conversationId: req.params.conversationId } });
    await publishRealtime({
      type: SOCKET_EVENTS.CONVERSATION_UPDATED,
      recipients: participantIds.filter((id) => id !== addedUserId),
      payload: { conversationId: req.params.conversationId },
    });
    res.status(201).json({ conversationId: req.params.conversationId, addedUserId });
  } catch (err) { next(err); }
});

// Retirer un membre (admin) ou quitter le groupe (si userId = soi-même)
router.delete('/groups/:conversationId/members/:userId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { conversationId, userId } = req.params;
    const self = req.user!.sub;

    if (userId === self) {
      const { participantIds } = await messageService.leaveGroup(self, conversationId);
      await publishRealtime({
        type: SOCKET_EVENTS.CONVERSATION_UPDATED,
        recipients: [...participantIds, self],
        payload: { conversationId },
      });
    } else {
      const { removedUserId, participantIds } = await messageService.removeMember(self, conversationId, userId);
      await publishRealtime({
        type: SOCKET_EVENTS.CONVERSATION_UPDATED,
        recipients: [...participantIds, removedUserId],
        payload: { conversationId },
      });
    }
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
