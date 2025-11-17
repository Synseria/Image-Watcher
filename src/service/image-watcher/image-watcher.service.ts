import { randomUUID } from 'crypto';
import { env } from 'process';
import { inject, injectable, singleton } from 'tsyringe';
import createLogger from '../../core/logger';
import { shouldSendNotification } from '../../utils/notification-utils';
import { analyzeSemverVersions, isSemver, ParsedSemver } from '../../utils/semver-utils';
import { AIService } from '../ai/ai.service';
import { RELEASE_NOTES_PROMPT } from '../ai/prompts/release-note';
import { NotificationService } from '../notification/notification.service';
import { Application } from '../orchestrator/domain/application';
import { OrchestratorService } from '../orchestrator/orchestrator.service';
import { RegistryService } from '../registry/registry.service';
import { ReleaseService } from '../release/release.service';
import { AnnotationMeta, ApplicationAnnotation, TypeAnnotation, TypeMode, TypeParam, TypeStrategy } from './domain/annotation';
import { WatchedApplication } from './domain/application';

/** Création du logger pour ce module **/
const logger = createLogger(import.meta);

/**
 * Service métier sur la logique applicative
 */
@injectable()
@singleton()
export class ImageWatcherService {
  /** Annotations image watcher */
  readonly mapAnnotationMeta: Map<TypeAnnotation, AnnotationMeta> = new Map([
    [
      TypeAnnotation.MODE,
      {
        default: TypeMode.AUTO_UPDATE,
        description: "Mode de fonctionnement de l'image-watcher",
        options: Object.values(TypeMode),
        type: TypeParam.CONFIGURATION
      }
    ],
    [
      TypeAnnotation.STRATEGY,
      {
        default: TypeStrategy.ALL,
        description: 'Stratégie de mise à jour',
        options: Object.values(TypeStrategy),
        type: TypeParam.CONFIGURATION
      }
    ],
    [
      TypeAnnotation.LAST_UPDATED,
      {
        description: 'Date de la dernière mise à jour appliquée',
        default: undefined,
        type: TypeParam.INTERNAL
      }
    ],
    [
      TypeAnnotation.LAST_NOTIFIED,
      {
        description: 'Date de la dernière notification envoyée',
        default: undefined,
        type: TypeParam.INTERNAL
      }
    ],
    [
      TypeAnnotation.LAST_NOTIFIED_VERSION,
      {
        description: 'Dernière version notifiée',
        default: undefined,
        type: TypeParam.INTERNAL
      }
    ],
    [
      TypeAnnotation.CURRENT_VERSION,
      {
        description: 'Version courante',
        default: undefined,
        type: TypeParam.INTERNAL
      }
    ],
    [
      TypeAnnotation.PREVIOUS_VERSION,
      {
        description: 'Version précédente avant la mise à jour',
        default: undefined,
        type: TypeParam.INTERNAL
      }
    ],
    [
      TypeAnnotation.TOKEN_UPDATE,
      {
        description: 'Token de mise à jours',
        default: undefined,
        type: TypeParam.INTERNAL
      }
    ]
  ]);

  /**
   * Constructeur du service des registres
   */
  constructor(
    @inject(RegistryService) private registryService: RegistryService,
    @inject(NotificationService) private notificationService: NotificationService,
    @inject(OrchestratorService) private orchestratorService: OrchestratorService,
    @inject(AIService) private aiService: AIService,
    @inject(ReleaseService) private releaseService: ReleaseService
  ) { }

  /**
   * Récupération d'une application
   */
  async findApplication(namespace: string, name: string): Promise<WatchedApplication> {
    //Récupération de l'application
    const app = await this.orchestratorService.getApplication(namespace, name);

    //Vérification de la présence de l'application
    if (app)
      //Enrichissement de l'application
      return this.toWatchedApplication(app);

    //Aucune application
    return null;
  }

  /**
   * Mise à jour de l'application
   */
  async upgradeApplication(application: WatchedApplication, nextVersion: string): Promise<boolean> {
    //Récupération de la version courante
    const currentTag = application.imageInformation.tag;

    //Définition des nouveaux paramètres
    const newParams: any = {};

    //Définition
    newParams[TypeAnnotation.LAST_UPDATED] = new Date();
    newParams[TypeAnnotation.LAST_UPDATED_VERSION] = nextVersion;
    newParams[TypeAnnotation.PREVIOUS_VERSION] = currentTag;
    newParams[TypeAnnotation.CURRENT_VERSION] = nextVersion;

    //Réinitialisation, si présent du token
    newParams[TypeAnnotation.TOKEN_UPDATE] = null;

    //Définition de l'image suivante
    const nextImage = `${application.imageInformation.registry}/${application.imageInformation.repository}:${nextVersion}`;

    //Patch de l'application
    const success = await this.orchestratorService.patchApplication(application, newParams, nextImage);

    //Vérification du succès
    if (success) {
      //Log
      logger.info(`Mise à jour terminée de ${application.namespace}/${application.name} ${currentTag} vers ${nextVersion}.`);

      //Envoi de la notification
      await this.notificationService.broadcast(`Mise à jour terminée de ${application.namespace}/${application.name} ${currentTag} vers ${nextVersion}.`, {
        username: `${application.imageInformation.repository}:${nextVersion}`
      });
    } else {
      //Log
      logger.error(`Échec de la mise à jour de ${application.namespace}/${application.name} vers ${nextVersion}.`);

      //Envoi de la notification
      await this.notificationService.broadcast(`Échec de la mise à jour de ${application.namespace}/${application.name} ${currentTag} vers ${nextVersion}.`, {
        username: `${application.imageInformation.repository}:${nextVersion}`
      });
    }

    return success;
  }

  /**
   * Déclenchement du traitement des images
   */
  async processImageWatcher(): Promise<void> {
    //Log
    logger.info(`Début du traitement image-watcher.`);

    //Récupérations des applications
    let listeApplications: Application[] = await this.orchestratorService.listeApplications();

    //Itération sur les applications
    for (const app of listeApplications) {
      //Vérification de la présence d'image-watcher
      if (Object.keys(app.annotations).some((v) => v.includes('image-watcher')))
        //Traitement de l'application
        await this.processApplication(app);
    }

    //Log
    logger.info(`Fin du traitement image-watcher.`);
  }

  /**
   * Traitement d'une application
   */
  async processApplication(appOrchestator: Application): Promise<void> {
    try {
      const application: WatchedApplication = this.toWatchedApplication(appOrchestator);
      let listeNewests: Array<ParsedSemver>;

      //Log
      logger.info(`Traitement de l'application "${application.namespace}/${application.name}" (mode=${application.parsedAnnotations[TypeAnnotation.MODE]}, stratégie=${application.parsedAnnotations[TypeAnnotation.STRATEGY]}).`);

      //Vérification du mode DISABLED
      if (application.parsedAnnotations[TypeAnnotation.MODE] == TypeMode.DISABLED || application.parsedAnnotations[TypeAnnotation.WATCH] === false)
        //Fin du traitement
        return;

      //Lecture des tags
      const listeTags = await this.registryService.getListeTags(application.image);

      //Récupération de la version courante
      const currentVersion = await this.getCurrentVersion(application, listeTags);

      //Analyse des versions
      const mapSemvers = await analyzeSemverVersions(currentVersion, listeTags.map((tag) => tag.tag));

      //Vérification du la stratégie
      if (application.parsedAnnotations[TypeAnnotation.STRATEGY] === TypeStrategy.ALL) {
        //Définitions de la liste des nouveaux tags
        listeNewests = mapSemvers.all;
      } else if (application.parsedAnnotations[TypeAnnotation.STRATEGY] === TypeStrategy.MAJOR) {
        //Définitions de la liste des nouveaux tags
        listeNewests = [...mapSemvers.majors, ...mapSemvers.minors, ...mapSemvers.patches];
      } else if (application.parsedAnnotations[TypeAnnotation.STRATEGY] === TypeStrategy.MINOR) {
        //Définitions de la liste des nouveaux tags
        listeNewests = [...mapSemvers.minors, ...mapSemvers.patches];
      } else if (application.parsedAnnotations[TypeAnnotation.STRATEGY] === TypeStrategy.PATCH) {
        //Définitions de la liste des nouveaux tags
        listeNewests = [...mapSemvers.patches];
      }

      //Vérification de la présence de nouvelle version
      if (listeNewests.length == 0) {
        //Log
        logger.info(`Aucune nouvelle version disponible pour "${application.namespace}/${application.name}".`);

        //Fin de traitement
        return;
      } else
        //Log
        logger.info(`Détection de ${listeNewests.length} nouvelle(s) version(s) pour "${application.namespace}/${application.name}". [${listeNewests.map((t) => t.original).join(', ')}]`);

      //Définition de la nouvelle version
      const nextVersion: string = listeNewests[0].original;

      //Vérification du mode
      if (application.parsedAnnotations[TypeAnnotation.MODE] == TypeMode.AUTO_UPDATE) {
        //Log
        logger.info(`Mise à jour de l'application "${application.namespace}/${application.name}" depuis ${currentVersion} vers ${nextVersion} (mode auto).`);

        //Récupération du changelog
        const changelog = await this.getAIChangelog(application.imageInformation.repository, listeNewests.map((tag) => tag.original), application);

        //Envoi de la notification
        await this.notificationService.broadcast(changelog, {
          username: `${application.name}:${nextVersion}`
        });

        //Mise à jour de l'application
        await this.upgradeApplication(application, nextVersion);
      } else if (application.parsedAnnotations[TypeAnnotation.MODE] == TypeMode.NOTIFICATION) {
        //Vérification si une notification doit être envoyée
        const { newVersions, shouldRemind } = shouldSendNotification(application.parsedAnnotations[TypeAnnotation.LAST_NOTIFIED], application.parsedAnnotations[TypeAnnotation.LAST_NOTIFIED_VERSION], listeNewests);

        //Vérification de la présence de nouvelle versions, ou si les délais sont dépassé
        if (newVersions.length || shouldRemind) {
          //Récupération du changelog
          const changelog = await this.getAIChangelog(application.imageInformation.repository, newVersions.map((tag) => tag.original), application);

          //Définition des paramètres
          const newParams: any = {};
          //Définition des annotations
          newParams[TypeAnnotation.LAST_NOTIFIED] = new Date();
          newParams[TypeAnnotation.LAST_NOTIFIED_VERSION] = nextVersion;
          newParams[TypeAnnotation.CURRENT_VERSION] = currentVersion;
          newParams[TypeAnnotation.TOKEN_UPDATE] = randomUUID();

          //Patch de l'application
          const success = await this.orchestratorService.patchApplication(application, newParams);

          //Vérification du succès
          if (success) {
            //Construction de l'url
            const webhookUrl = `${env.BASE_URL ? env.BASE_URL : `http://localhost:${env.PORT || '3000'}`}/api/upgrade/${application.namespace}/${application.name}?token=${newParams[TypeAnnotation.TOKEN_UPDATE]}&version=${nextVersion}`;

            //Envoi de la notification
            await this.notificationService.broadcast([...changelog, `\n\n**[Déployer la version ${nextVersion}](${webhookUrl})**`], {
              username: `${application.imageInformation.repository}:${nextVersion}`
            });
          } else
            //Log
            logger.error(`Erreur lors de la mise à jour de l'application ${application.namespace}/${application.name} (mode notification).`);
        } else
          //Log
          logger.debug(`Aucune nouvelle version ou rappel non requis pour "${application.namespace}/${application.name}" (mode notification).`);
      }
    } catch (error: any) {
      //Log
      logger.error(error, `Une erreur est survenue lors du traitement de l'application ${appOrchestator.namespace}/${appOrchestator.name}: ${error?.message}`);
    }
  }

  /**
   * Récupération des releases notes pour une liste de versions donnée
   */
  private async getAIChangelog(repository: string, tags: string[], application: WatchedApplication): Promise<string[]> {
    try {
      //Construction des releaseInfo à partir des tags fournis
      const listeReleases = await Promise.all(
        //Itération sur les tags pour récupérer les releases
        tags.map(async (tag) => {
          //Appel du service de release (GitHub, custom, etc.)
          const release = await this.releaseService.getRelease(repository, tag, {
            ...application.imageInformation,
            ...application.parsedAnnotations
          });

          //Retourne l'objet complet (tag + changelog brut)
          return release;
        })
      );

      //Itération sur les releases pour les traiter via l'IA
      const listeChangelogs = await Promise.all(
        //Itération sur les releases pour les traiter via l'IA
        listeReleases.map(async (r) => {
          //Conversion du changelog en texte brut
          let changelog = this.aiService.markdownToText(r.changelog || '');

          //Génération d’un résumé IA du changelog
          const aiChangelog = await this.aiService.ask(changelog, RELEASE_NOTES_PROMPT).catch((_: any) => null);

          //Construction du bloc Markdown
          return `## **[Version ${r.version}](${r.url})**\n${aiChangelog || changelog}\n*Publié le ${r?.publishedAt?.toLocaleDateString('fr-FR') || ''}*
        `;
        })
      );

      return listeChangelogs;
    } catch (error: any) {
      //Log
      logger.error(error, `Une erreur est survenue lors de la génération du changelog IA pour ${repository}: ${error?.message}`);

      //Retourne une liste vide
      return [];
    }
  }

  /**
   * Récupération de la version courante
   */
  private async getCurrentVersion(application: WatchedApplication, listeTags?: { tag: string; digest: string }[]): Promise<string> {
    //Vérification de la présence d'un tag Semver
    if (isSemver(application.imageInformation?.tag))
      //Récupération du tag
      return application.imageInformation?.tag;
    else {
      //Lecture des annotations
      const annotatedVersion = application.parsedAnnotations[TypeAnnotation.CURRENT_VERSION];

      //Vérification de la présence de l'annotation
      if (annotatedVersion)
        //Retour de la version
        return annotatedVersion;

      //Recherche des applications par leurs digest
      const filteredTags = listeTags.filter((t) => t?.digest === application?.imageInformation?.digest);

      //Vérifiction de la présence d'un tag
      if (filteredTags.length === 0)
        //Aucun tag
        return null;
      else if (filteredTags.length === 1)
        //Un seul tag
        return filteredTags[0].tag;

      //Filtre sur les tags semver
      const semverTags = filteredTags.filter((t) => isSemver(t.tag));

      //Vérifiction de la présence d'un tag
      if (semverTags.length === 0)
        //Aucun tag
        return null;
      else if (semverTags.length === 1)
        //Un seul tag
        return semverTags[0].tag;

      //Tris des tags restants
      const sortedTags = semverTags.sort((a, b) => {
        const aBase = a.tag.split('-')[0];
        const bBase = b.tag.split('-')[0];

        //Priorité à la version “pure” (sans suffix)
        if (a.tag === aBase && b.tag !== bBase) return -1;
        if (a.tag !== aBase && b.tag === bBase) return 1;

        //Sinon, ordre naturel
        return 0;
      });

      //Retour du meilleur tag
      return sortedTags.length > 0 ? sortedTags[0].tag : null;
    }
  }

  /**
   * Enrichissement de l'application
   */
  private toWatchedApplication(appOrchestator: Application): WatchedApplication {
    const annotations = appOrchestator.annotations ?? {};
    return {
      ...appOrchestator,
      parsedAnnotations: this.getAnnotations(annotations),
      hasImageWatcher: this.hasImageWatcher(annotations)
    };
  }

  /**
   * Vérification de la présence d'une annotation de type image-watcher
   */
  private hasImageWatcher(listeAnnotations: Record<string, string>): boolean {
    //Itération sur les annotations à la recherche d'une annotations image-watcher
    return Object.keys(listeAnnotations).some((k) => k.toLowerCase().includes('image-watcher'));
  }

  /**
   * Parsing d'une application
   */
  private getAnnotations(listeAnnotations: Record<string, string>): ApplicationAnnotation {
    //Enumération
    return {
      [TypeAnnotation.WATCH]: this.parseAnnotation(listeAnnotations, TypeAnnotation.WATCH, env.IMAGE_WATCHER_WATCH) as boolean,
      [TypeAnnotation.MODE]: this.parseAnnotation(listeAnnotations, TypeAnnotation.MODE, env.IMAGE_WATCHER_MODE),
      [TypeAnnotation.STRATEGY]: this.parseAnnotation(listeAnnotations, TypeAnnotation.STRATEGY, env.IMAGE_WATCHER_STRATEGY) as TypeStrategy,
      [TypeAnnotation.CURRENT_VERSION]: listeAnnotations[TypeAnnotation.CURRENT_VERSION] as string,
      [TypeAnnotation.PREVIOUS_VERSION]: listeAnnotations[TypeAnnotation.PREVIOUS_VERSION] as string,
      [TypeAnnotation.LAST_UPDATED]: listeAnnotations[TypeAnnotation.LAST_UPDATED] ? (new Date(listeAnnotations[TypeAnnotation.LAST_UPDATED]) as Date) : undefined,
      [TypeAnnotation.LAST_UPDATED_VERSION]: listeAnnotations[TypeAnnotation.LAST_UPDATED_VERSION] as string,
      [TypeAnnotation.LAST_NOTIFIED]: listeAnnotations[TypeAnnotation.LAST_NOTIFIED] ? (new Date(listeAnnotations[TypeAnnotation.LAST_NOTIFIED]) as Date) : undefined,
      [TypeAnnotation.LAST_NOTIFIED_VERSION]: listeAnnotations[TypeAnnotation.LAST_NOTIFIED_VERSION] as string,
      [TypeAnnotation.TOKEN_UPDATE]: listeAnnotations[TypeAnnotation.TOKEN_UPDATE] as string,
      [TypeAnnotation.RELEASE_URL]: listeAnnotations[TypeAnnotation.RELEASE_URL] as string
    };
  }

  /**
   * Lecture de l'annotation
   */
  private parseAnnotation(listeAnnotations: Record<string, string>, key: TypeAnnotation, environnement?: string): any {
    let rawVal: any;

    //Récupération des méta-données
    const meta = this.mapAnnotationMeta.get(key);

    //Recherche sans altérer la casse d’origine
    const directVal = listeAnnotations[key] ?? listeAnnotations[key.toLowerCase()];

    //Définition de la valeur de l'environnement
    if (env.IMAGE_WATCHER_OVERRIDE === 'true')
      //Définition de la valeur de l'environnement
      rawVal = environnement ?? directVal ?? meta?.default;
    else
      //Définition de la valeur brute
      rawVal = directVal ?? environnement ?? meta?.default;

    //Vérification de la présence de méta-données
    if (!meta)
      //Retourne la valeur brute
      return rawVal;

    //Vérification des options
    if (meta.options) {
      //Conversion en majuscules
      const upper = rawVal?.toString().toUpperCase();
      //Vérification de la présence dans les options
      if (upper && meta.options.includes(upper as never)) {
        //Retourne la valeur en majuscules
        return upper;
      }
      //Log de l'erreur
      if (upper) {
        //Log
        logger.warn({ key, value: upper, options: meta.options, default: meta.default }, `La valeur fournie pour l'annotation "${key}" n'est pas supportée; utilisation de la valeur par défaut.`);
      }

      //Retourne la valeur par défaut
      return meta.default;
    }

    //Retourne la valeur brute
    return rawVal;
  }
}
