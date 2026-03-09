import { Router } from 'express';
import fluxWebhook from './webhooks/flux.api';
import stateRoutes from './state.api';
import jobsRoutes from './jobs.api';

/** Création du router v1 */
const router = Router();

/** Routes webhook Flux */
router.use('/webhooks/flux', fluxWebhook);

/** Route d'état des notifications */
router.use('/state', stateRoutes);

/** Routes de déclenchement manuel */
router.use('/jobs', jobsRoutes);

/** Export du router */
export default router;
