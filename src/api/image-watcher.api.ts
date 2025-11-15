import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { container } from 'tsyringe';
import { TypeAnnotation } from '../service/image-watcher/domain/annotation';
import { ImageWatcherService } from '../service/image-watcher/image-watcher.service';

/** Création du router pour ce module */
const router = Router();

/** Injection du service de gestion des images */
const imageWatcherService = container.resolve(ImageWatcherService);

/** Set pour gérer les verrous de mise à jour */
const upgradeLocks = new Set<string>();

/** Limiteur de taux pour les mises à jour */
const upgradeLimiter = rateLimit({
  windowMs: 5000, // 5 secondes
  max: 1, // 1 requête max par fenêtre
  keyGenerator: (req) => {
    const { namespace, name } = req.params;
    const { token } = req.query;
    return `${namespace}:${name}:${token}`;
  },
  handler: (req, res) => {
    // Réponse en cas de dépassement du taux
    res.status(429).json({ error: 'Veuillez patienter avant de relancer' });
  }
});

/**
 * Déclenchement d'une mise à jours
 */
router.get('/upgrade/:namespace/:name', upgradeLimiter, async (req, res) => {
  try {
    //Récupération des paramètres
    const { namespace, name } = req.params;

    //Récupération des paramètres
    const { version, token } = req.query;

    //Vérification de la présence des paramètres
    if (!token || !version || !namespace || !name)
      //Erreur
      return res.status(400).json({ error: 'Paramètres manquants' });

    //Définition de la clef
    const lockKey = `${namespace}:${name}:${token}`;

    //Vérifie si une MAJ est déjà en cours
    if (upgradeLocks.has(lockKey))
      //Erreur
      return res.status(429).json({ error: 'Mise à jour déjà en cours' });

    //Définition du verrou
    upgradeLocks.add(lockKey);

    //Recherche de l'application
    const application = await imageWatcherService.findApplication(namespace, name);

    //Vérification de l'application
    if (!application)
      //Erreur
      return res.status(404).json({ error: 'Application non trouvée' });

    //Vérification du token
    if (application.parsedAnnotations[TypeAnnotation.TOKEN_UPDATE] != token)
      //Erreur
      return res.status(401).json({ error: 'Token invalide' });

    //Vérification de la version
    if (application.parsedAnnotations[TypeAnnotation.LAST_NOTIFIED_VERSION] != version)
      //Erreur
      return res.status(400).json({ error: 'Version invalide' });

    //Déclenchement de la mise à jours
    const result = await imageWatcherService.upgradeApplication(application, version);

    //Vérification du résultat
    if (!result)
      //Erreur
      return res.status(500).json({ error: 'Erreur lors de la mise à jours' });
    else
      //Succès
      return res.json({ success: true });
  } catch (err) {
    //Erreur
    console.error(err);

    //Définition du résultat
    res.status(500).json({ error: 'Erreur interne' });
  } finally {
    //Définition du namespace/name
    const { namespace, name } = req.params;

    //Définition du token
    const { token } = req.query;

    //Vérification du code erreur
    if (token && res.statusCode !== 429)
      //Suppression du lock
      upgradeLocks.delete(`${namespace}:${name}:${token}`);
  }
});

export default router;

