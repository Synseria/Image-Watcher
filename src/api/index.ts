import { Router } from 'express';
import imageWatcherController from './image-watcher.api';

/** Création du router pour ce module */
const router = Router();

/** Définition des routes pour le module image-watcher */
router.use('/image-watcher', imageWatcherController);

/** Export du router */
export default router;
