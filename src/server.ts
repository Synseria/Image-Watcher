import express from 'express';
import apiRoutes from './api/index';
import createLogger from './core/logger';
import { env } from 'process';
import { pinoHttp } from 'pino-http';
import { container } from 'tsyringe';
import { OrchestratorService } from './service/orchestrator/orchestrator.service';

/** Création du logger */
const logger = createLogger(import.meta);

/** Création du middleware de log HTTP (ignore /healthz et /readyz) */
const httpLogger = pinoHttp({
  // Cast pour compatibilité de typage avec pino-http
  logger: logger as any,
  autoLogging: {
    ignore: (req) => req.url === '/healthz' || req.url === '/readyz'
  }
});

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

  //Endpoint de liveness (toujours OK si le processus tourne)
  app.get('/healthz', (req, res) => healthz(req, res));

  //Endpoint de readiness (vérification basique des services critiques)
  app.get('/readyz', async (req, res) => readyz(req, res));

  //Lancement du serveur
  return app.listen(PORT, () => logger.info(`Serveur actif sur le port ${PORT}`));
}

/**
 * Endpoint de liveness (toujours OK si le processus tourne)
 */
async function healthz(req: express.Request, res: express.Response) {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
}

/**
 * Endpoint de readiness (vérification basique des services critiques)
 */
async function readyz(req: express.Request, res: express.Response) {
  try {
    //Récupération du service d'orchestration
    const orchestrator = container.resolve(OrchestratorService);

    //Appel léger pour vérifier l'accès au provider (liste éventuellement vide)
    await orchestrator.listeApplications();

    //Succès
    res.json({ status: 'ready', timestamp: new Date().toISOString() });
  } catch (err: any) {
    //Non prêt
    res.status(503).json({ status: 'not-ready', error: err?.message || 'Initialisation en cours', timestamp: new Date().toISOString() });
  }
}
