import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  AddressSearchQuerySchema,
  CreateEstablishmentSchema,
  UpdateEstablishmentSchema,
} from '../schemas/establishment';
import * as establishmentService from '../services/establishment.service';
import { searchAddresses } from '../lib/mapbox-geocoding';

const router = Router();

// Toutes les routes sont réservées aux organisateurs (et admins).
router.use(authenticate, authorize('organizer', 'admin'));

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await establishmentService.listOrganizerEstablishments(req.user!.sub);
    res.json({ data });
  } catch (err) { next(err); }
});

// Pré-remplissage SIRET — avant `/:id` pour ne pas être capturé comme un id.
router.get('/prefill', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prefill = await establishmentService.prefillFromSiret(req.user!.sub);
    res.json(prefill);
  } catch (err) { next(err); }
});

router.get('/address-search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q } = AddressSearchQuerySchema.parse(req.query);
    const data = await searchAddresses(q);
    res.json({ data });
  } catch (err) { next(err); }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const establishment = await establishmentService.getEstablishment(req.params.id, req.user!.sub, req.user!.role);
    res.json(establishment);
  } catch (err) { next(err); }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = CreateEstablishmentSchema.parse(req.body);
    const establishment = await establishmentService.createEstablishment(req.user!.sub, data);
    res.status(201).json(establishment);
  } catch (err) { next(err); }
});

router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = UpdateEstablishmentSchema.parse(req.body);
    const establishment = await establishmentService.updateEstablishment(req.params.id, req.user!.sub, req.user!.role, data);
    res.json(establishment);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await establishmentService.deleteEstablishment(req.params.id, req.user!.sub, req.user!.role);
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
