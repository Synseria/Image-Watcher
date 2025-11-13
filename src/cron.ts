import cron from 'node-cron';
import { env } from 'process';
import { container } from 'tsyringe';
import createLogger from './core/logger';
import { ImageWatcherService } from './service/image-watcher/image-watcher.service';

/** Création du logger */
const logger = createLogger(import.meta);

/** Injection de dépendance */
const imageWatcherService = container.resolve(ImageWatcherService);

/**
 * Lancement du serveur
 */
export async function startCron() {
  //Définition du cron (Par défaut, tout les jours à midi)
  const cronJob = env.CRON_JOB || '0 12 * * *';

  //Log
  logger.info(`Démarrage du cron ${cronJob}...`);

  //Démarrage du cron
  cron.schedule(cronJob, async () => {
    try {
      //Log
      logger.info(`Exécution du cron job 'Image-Watcher`);

      //Début du processus
      await imageWatcherService.processImageWatcher();

      //Log
      logger.info(`Fin du cron job 'Image-Watcher`);
    } catch (err) {
      //Log
      logger.error(err, `Erreur lors de l'exécution du cron job 'Image-Watcher`);
    }
  });

  return cron;
}
