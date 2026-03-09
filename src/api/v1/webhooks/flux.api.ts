import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from 'process';
import { setImmediate } from 'timers';
import { container } from 'tsyringe';
import createLogger from '../../../core/logger';
import { ImageWatcherService } from '../../../service/image-watcher/image-watcher.service';

/** Création du logger pour ce module **/
const logger = createLogger(import.meta);

/** Création du router */
const router = Router();

/** Injection du service */
const imageWatcherService = container.resolve(ImageWatcherService);

/** Regex pour extraire les versions depuis le message Flux */
const VERSION_REGEX = /(\d+\.\d+\.\d+[\w.-]*)\s*->\s*(\d+\.\d+\.\d+[\w.-]*)/;

/** Limiteur de taux pour le webhook (5 requêtes / 60s par IP) */
const rateLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.NODE_ENV === 'test',
  handler: (req, res) => {
    res.status(429).json({ error: 'Trop de requêtes, veuillez patienter' });
  }
});

/**
 * POST /api/v1/webhooks/flux
 * Réception des alertes Flux Notification Controller
 */
router.post('/', rateLimiter, (req, res) => {
  try {
    const { involvedObject, message } = req.body ?? {};

    //Validation de la structure minimale du payload
    if (!involvedObject?.name || !involvedObject?.namespace || typeof message !== 'string')
      //Réponse 400 pour un payload invalide
      return res.status(400).json({ error: 'Payload invalide' });
      
    //Vérification optionnelle du token
    const configuredToken = env.FLUX_WEBHOOK_TOKEN;

    //Vérification du token si configuré
    if (configuredToken) {
      //Extraction du token depuis la query string
      const { token } = req.query;
      //Vérification du token
      if (token !== configuredToken)
        //Réponse 401 pour un token manquant ou invalide
        return res.status(401).json({ error: 'Token invalide' });
    }

    //Réponse immédiate 202 — traitement asynchrone en arrière-plan
    res.status(202).json({ accepted: true });

    //Traitement asynchrone (ne doit pas bloquer la réponse ni lever d'exception non gérée)
    setImmediate(() => {
      (async () => {
        //Extraction des versions depuis le message
        const match = VERSION_REGEX.exec(message);

        //Vérification de la présence d'un changement de version
        if (!match) {
          //Log
          logger.debug({ message }, 'Webhook Flux reçu sans transition de version détectable, ignoré.');

          //Aucun changement de version détecté, on ignore le message
          return;
        }

        //Extraction des versions et de l'identifiant de l'application
        const [, oldVersion, newVersion] = match;
        const { name, namespace } = involvedObject;

        //Log
        logger.info({ namespace, name, oldVersion, newVersion }, `Webhook Flux reçu : ${namespace}/${name} ${oldVersion} -> ${newVersion}`);

        //Recherche de l'application
        const application = await imageWatcherService.findApplication(namespace, name);

        //Vérification de l'existence de l'application
        if (!application) {
          //Log
          logger.warn({ namespace, name }, `Application introuvable pour le webhook Flux "${namespace}/${name}", traitement ignoré.`);

          //Application introuvable, on ignore le message
          return;
        }

        //Notification directe de la transition — Flux a déjà validé la MAJ
        await imageWatcherService.notifyVersionTransition(application, oldVersion, newVersion);
      })().catch((err: any) => {
        //Log
        logger.error(err, `Erreur lors du traitement asynchrone du webhook Flux: ${err?.message}`);
      });
    });
  } catch (err: any) {
    //Log
    logger.error(err, `Erreur interne sur le webhook Flux: ${err?.message}`);

    //Réponse 500 pour une erreur interne
    res.status(500).json({ error: 'Erreur interne' });
  }
});

export default router;
