import 'dotenv/config';
import { env } from 'process';
import 'reflect-metadata';
import { container } from 'tsyringe';
import './core/globals';
import createLogger from './core/logger';
import { startCron } from './cron';
import { startServer } from './server';
import { ImageWatcherService } from './service/image-watcher/image-watcher.service';

/** Logger */
const logger = createLogger();

/** Service de gestion des images */
const imageWatcherService = container.resolve(ImageWatcherService);

/** Démarrage du serveur */
startServer();

/** Démarrage des tâches planifées */
startCron();

(async () => {
  try {
    //Vérification de la présence de RUN ON BOOT
    if (env.RUN_ON_BOOT === 'true') {
      logger.info('RUN_ON_BOOT actif — démarrage automatique du watcher...');

      //Début du processus
      await imageWatcherService.processImageWatcher();
    }
  } catch (error) {
    //Gestion des erreurs
    logger.fatal(error, "Erreur lors de l'utilisation du service : %s", (error as Error).message);
  }
})();
