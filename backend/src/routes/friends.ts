import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { SendFriendRequestSchema } from '../schemas/friend';
import * as friendService from '../services/friend.service';
import { publishRealtime, SOCKET_EVENTS } from '../realtime';

const router = Router();

// Toutes les routes du domaine « amis » sont réservées aux utilisateurs authentifiés.

// Liste des amis acceptés
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const friends = await friendService.listFriends(req.user!.sub);
    res.json({ data: friends });
  } catch (err) { next(err); }
});

// Demandes en attente (reçues + envoyées)
router.get('/requests', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requests = await friendService.listPendingRequests(req.user!.sub);
    res.json({ data: requests });
  } catch (err) { next(err); }
});

// Envoi d'une demande d'ami + notification temps réel du destinataire
router.post('/requests', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { addresseeId } = SendFriendRequestSchema.parse(req.body);
    const request = await friendService.sendRequest(req.user!.sub, addresseeId);
    await publishRealtime({
      type: SOCKET_EVENTS.FRIEND_REQUEST,
      recipients: [addresseeId],
      payload: { requestId: request.id },
    });
    res.status(201).json(request);
  } catch (err) { next(err); }
});

// Acceptation d'une demande reçue → notifie le demandeur
router.post('/requests/:id/accept', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { requesterId } = await friendService.respondRequest(req.user!.sub, req.params.id, true);
    await publishRealtime({
      type: SOCKET_EVENTS.FRIEND_ACCEPTED,
      recipients: [requesterId],
      payload: { userId: req.user!.sub },
    });
    res.json({ accepted: true });
  } catch (err) { next(err); }
});

// Refus d'une demande reçue
router.post('/requests/:id/decline', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await friendService.respondRequest(req.user!.sub, req.params.id, false);
    res.json({ accepted: false });
  } catch (err) { next(err); }
});

// Suppression d'un ami
router.delete('/:userId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await friendService.removeFriend(req.user!.sub, req.params.userId);
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
