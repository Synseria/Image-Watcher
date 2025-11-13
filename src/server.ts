import express from 'express';
import apiRoutes from './api/index';
import createLogger from './core/logger';
import { env } from 'process';
import { pinoHttp } from 'pino-http';

/** Création du logger */
const logger = createLogger(import.meta);

/** Création du middleware de log HTTP */
const httpLogger = pinoHttp({ logger })

/** Définition du port */
const PORT = env.PORT || 3000;

/** Proxy de confiance (pour utilisation derrière un reverse proxy) */
const TRUSTED_PROXY = env.TRUSTED_PROXY || null;

/**
 * Lancement du serveur
 */
export async function startServer() {
  //Log
  logger.info(`Démarrage du serveur sur le port ${PORT}...`);

  /** Création d'une instance d'express */
  const app = express();

  //Vérification de la présence d'un proxy
  if (TRUSTED_PROXY != null)
    //Définition du proxy
    app.set('trust proxy', TRUSTED_PROXY);

  //Définition du middleware pour parser le body des requêtes
  app.use(express.json());

  //Middleware de log des requêtes
  app.use(httpLogger);

  //Définition des routes
  app.use('/api', apiRoutes);

  //Lancement du serveur
  return app.listen(PORT, () => logger.info(`Serveur actif sur le port ${PORT}`));
}
