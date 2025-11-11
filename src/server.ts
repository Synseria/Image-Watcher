import express from 'express';
import apiRoutes from './api/index';
import createLogger from './core/logger';
import { env } from 'process';

/** Création du logger */
const logger = createLogger();

/**
 * Lancement du serveur
 */
export async function startServer() {
  //Définition du port
  const PORT = process.env.PORT || 3000;

  //Log
  logger.info(`Démarrage du serveur sur le port ${PORT}...`);

  /** Création d'une instance d'express */
  const app = express();

  //Vérification de la présence d'un proxy
  if (env.TRUSTED_PROXY)
    //Définition du proxy
    app.set('trust proxy', env.TRUSTED_PROXY);

  //Définition du middleware pour parser le body des requêtes
  app.use(express.json());

  //Middleware de log des requêtes
  app.use((req, res, next) => {
    const start = Date.now();

    //Log des gin de requête
    res.on('finish', () => {
      //Calcul de la durée
      const duration = Date.now() - start;

      //Initialisation du log
      const log = {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        status: res.statusCode,
        duration: `${duration}ms`,
        userAgent: req.headers['user-agent']
      };

      //Définition du log
      logger.info(`[${log.method}] ${log.url} - ${log.status} (${log.duration}) - ${log.ip}`);
    });

    //Poursuite de la requête
    next();
  });

  //Définition des routes
  app.use('/api', apiRoutes);

  //Lancement du serveur
  app.listen(PORT, () => logger.info(`Serveur actif sur le port ${PORT}`));
}
