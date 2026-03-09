import { env } from 'process';
import { setImmediate } from 'timers';
import { container } from 'tsyringe';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import createLogger from '../../core/logger';
import { ImageWatcherService } from '../../service/image-watcher/image-watcher.service';
import { OrchestratorService } from '../../service/orchestrator/orchestrator.service';

/** Création du logger pour ce module **/
const logger = createLogger(import.meta);

/** Création du router */
const router = Router();

/** Injection des services */
const imageWatcherService = container.resolve(ImageWatcherService);
const orchestratorService = container.resolve(OrchestratorService);

/** Limiteur de taux pour le déclenchement manuel (3 requêtes / 30s par IP) */
const rateLimiter = rateLimit({
  windowMs: 30_000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.NODE_ENV === 'test',
  handler: (req, res) => {
    res.status(429).json({ error: 'Trop de requêtes, veuillez patienter' });
  }
});

/**
 * POST /api/v1/jobs/trigger
 * Déclenchement manuel de l'analyse pour une image spécifique
 */
router.post('/trigger', rateLimiter, async (req, res) => {
  try {
    const { image, oldVersion, newVersion, force } = req.body ?? {};

    //Validation du paramètre obligatoire
    if (!image || typeof image !== 'string')
      //Réponse 400 pour un paramètre manquant ou invalide
      return res.status(400).json({ error: 'Paramètre "image" manquant ou invalide' });

    //Récupération de toutes les applications
    const applications = await orchestratorService.listeApplications();

    //Filtrage par correspondance sur le nom du repository de l'image
    const matchedApp = applications.find((app) => {
      //Extraction du repository de l'application (sans le tag)
      const repo = app.imageInformation?.repository ?? '';

      //Correspondance si le repository correspond exactement ou si l'un contient l'autre (pour gérer les cas de sous-repositories)
      return repo === image || repo.includes(image) || image.includes(repo);
    });

    //Application introuvable
    if (!matchedApp)
      //Log
      return res.status(404).json({ error: `Aucune application trouvée pour l'image "${image}"` });


    //Log
    logger.info({ image, namespace: matchedApp.namespace, name: matchedApp.name, oldVersion, newVersion, force: !!force }, `Déclenchement manuel pour "${matchedApp.namespace}/${matchedApp.name}"`);

    //Réponse immédiate 202 — traitement asynchrone en arrière-plan
    res.status(202).json({
      accepted: true,
      force: !!force,
      application: { namespace: matchedApp.namespace, name: matchedApp.name }
    });

    //Traitement asynchrone
    setImmediate(() => {
      (async () => {
        //Appel du service pour traiter l'application (en forçant l'analyse si demandé)
        await imageWatcherService.processApplication(matchedApp, !!force);
      })().catch((err: any) => {
        //Log
        logger.error(err, `Erreur lors du traitement asynchrone du job: ${err?.message}`);
      });
    });
  } catch (err: any) {
    //Log
    logger.error(err, `Erreur interne sur le déclenchement manuel: ${err?.message}`);

    //Réponse 500 pour une erreur interne
    res.status(500).json({ error: 'Erreur interne' });
  }
});

export default router;
