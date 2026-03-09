import { Router } from 'express';
import v1Routes from './v1/index';

/** Création du router pour ce module */
const router = Router();

/** Définition des routes v1 */
router.use('/v1', v1Routes);

/** Export du router */
export default router;
