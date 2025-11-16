import { Router } from 'express';
import upgrade from './upgrade.api';

/** Création du router pour ce module */
const router = Router();

/** Définition des routes pour le module upgrader */
router.use('/upgrade', upgrade);

/** Export du router */
export default router;
