import { container } from 'tsyringe';
import { Router } from 'express';
import createLogger from '../../core/logger';
import { StateService } from '../../service/state/state.service';

/** Création du logger pour ce module **/
const logger = createLogger(import.meta);

/** Création du router */
const router = Router();

/** Injection du service d'état */
const stateService = container.resolve(StateService);

/**
 * GET /api/v1/state
 * Retourne l'état courant persisté (usage debug)
 */
router.get('/', (req, res) => {
  try {
    //Retour de l'état courant
    res.json(stateService.getAll());
  } catch (err: any) {
    //Log
    logger.error(err, `Erreur lors de la lecture de l'état: ${err?.message}`);
    
    //Réponse 500 pour une erreur interne
    res.status(500).json({ error: 'Erreur interne' });
  }
});

export default router;
