import 'dotenv/config';
import { env } from 'process';
import 'reflect-metadata';
import { container } from 'tsyringe';
import './core/globals';
import createLogger from './core/logger';
import { startCron } from './cron';
import { startServer } from './server';
import { ImageWatcherService } from './service/image-watcher/image-watcher.service';
import { BANNER } from './banner';

/** Logger */
const logger = createLogger(import.meta);

/** Affichage du banner */
logger.info(BANNER);

/** Démarrage du serveur */
const server = startServer();

/** Démarrage des tâches planifées */
startCron();

(async () => {
  try {
    //Définition du service
    const imageWatcherService = container.resolve(ImageWatcherService);

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


/**
 * Gestion de l'arrêt du serveur
 */
process.on('SIGTERM', async () => {
  //Log
  logger.info('SIGTERM, Arrêt du serveur...');

  //Fermeture du serveur
  (await server).close(() => {
    //Log
    logger.info('Serveur arrêté.');

    //Exit
    process.exit(0);
  });
});
