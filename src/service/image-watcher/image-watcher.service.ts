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
import { StateService } from '../state/state.service';
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
        default: TypeMode.NOTIFICATION,
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
    @inject(ReleaseService) private releaseService: ReleaseService,
    @inject(StateService) private stateService: StateService
  ) { }

  /**
   * Déclenchement du traitement des images
   */
  async processImageWatcher(): Promise<void> {
    //Log
    logger.info(`Début du traitement image-watcher.`);

    //Récupérations des applications
    const listeApplications: Application[] = await this.orchestratorService.listeApplications();

    //Mode "watch all" : toutes les apps, sinon seulement celles annotées
    const watchAll = env.IMAGE_WATCHER_WATCH_ALL === 'true';

    //Itération sur les applications
    for (const app of listeApplications) {
      //Vérification de la présence d'une annotation de type image-watcher ou du mode watch all
      const hasAnnotation = Object.keys(app.annotations).some((v) => v.includes('image-watcher'));

      //Vérification du mode watch all ou de la présence d'une annotation de type image-watcher
      if (watchAll || hasAnnotation)
        //Traitement de l'application
        await this.processApplication(app);
    }

    //Log
    logger.info(`Fin du traitement image-watcher.`);
  }

  /**
   * Traitement d'une application
   */
  async processApplication(appOrchestator: Application, force = false): Promise<void> {
    try {
      const application: WatchedApplication = this.toWatchedApplication(appOrchestator);
      let listeNewests: Array<ParsedSemver>;

      //Log
      logger.info(`Traitement de l'application "${application.namespace}/${application.name}" (mode=${application.parsedAnnotations[TypeAnnotation.MODE]}, stratégie=${application.parsedAnnotations[TypeAnnotation.STRATEGY]}${force ? ', force=true' : ''}).`);

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

      //Vérification de la stratégie
      if (application.parsedAnnotations[TypeAnnotation.STRATEGY] === TypeStrategy.ALL)
        //Définition de la liste des tags
        listeNewests = mapSemvers.all;
      else if (application.parsedAnnotations[TypeAnnotation.STRATEGY] === TypeStrategy.MAJOR)
        //Définition de la liste des tags
        listeNewests = [...mapSemvers.majors, ...mapSemvers.minors, ...mapSemvers.patches];
      else if (application.parsedAnnotations[TypeAnnotation.STRATEGY] === TypeStrategy.MINOR)
        //Définition de la liste des tags
        listeNewests = [...mapSemvers.minors, ...mapSemvers.patches];
      else if (application.parsedAnnotations[TypeAnnotation.STRATEGY] === TypeStrategy.PATCH)
        //Définition de la liste des tags
        listeNewests = [...mapSemvers.patches];

      //Vérification de la présence de nouvelle version
      if (listeNewests.length == 0) {
        //Log
        logger.info(`Aucune nouvelle version disponible pour "${application.namespace}/${application.name}".`);
        return;
      } else
        //Log
        logger.info(`Détection de ${listeNewests.length} nouvelle(s) version(s) pour "${application.namespace}/${application.name}". [${listeNewests.map((t) => t.original).join(', ')}]`);

      //Définition de la nouvelle version
      const nextVersion: string = listeNewests[0].original;

      //Clé de l'état en mémoire
      const stateKey = `${application.namespace}/${application.name}`;
      const state = this.stateService.get(stateKey);

      //Vérification si une notification doit être envoyée
      const { newVersions, shouldRemind } = shouldSendNotification(state?.notifiedAt, state?.version, listeNewests);

      //En mode forcé, on utilise toutes les versions disponibles sans filtrage anti-spam
      const versionsToNotify = force ? listeNewests : newVersions;

      //Vérification de la présence de nouvelles versions ou si un rappel est nécessaire
      if (force || newVersions.length || shouldRemind) {
        //Récupération du changelog AI
        const changelog = await this.getAIChangelog(application.imageInformation.repository, versionsToNotify.map((tag) => tag.original), application);

        //Mise à jour de l'état persisté (anti-spam)
        this.stateService.set(stateKey, { version: nextVersion, notifiedAt: new Date() });

        //Envoi de la notification
        await this.notificationService.broadcast(changelog, {
          username: `${application.imageInformation.repository}:${nextVersion}`
        });
      } else
        //Log
        logger.debug(`Aucune nouvelle version ou rappel non requis pour "${application.namespace}/${application.name}".`);
    } catch (error: any) {
      //Log
      logger.error(error, `Une erreur est survenue lors du traitement de l'application ${appOrchestator.namespace}/${appOrchestator.name}: ${error?.message}`);
    }
  }

  /**
   * Recherche d'une application par namespace et nom
   */
  async findApplication(namespace: string, name: string): Promise<Application | undefined> {
    //Récupération de toutes les applications
    const apps = await this.orchestratorService.listeApplications();

    //Retourne l'application correspondante
    return apps.find((app) => app.namespace === namespace && app.name === name);
  }

  /**
   * Notification directe d'une transition de version fournie par Flux.
   * Contourne le rescan du registry et l'anti-spam : Flux a déjà validé la mise à jour.
   */
  async notifyVersionTransition(appOrchestrator: Application, oldVersion: string, newVersion: string): Promise<void> {
    try {
      //Enrichissement de l'application
      const application = this.toWatchedApplication(appOrchestrator);

      //Respect du mode DISABLED
      if (application.parsedAnnotations[TypeAnnotation.MODE] == TypeMode.DISABLED || application.parsedAnnotations[TypeAnnotation.WATCH] === false) {
        //Log
        logger.info(`Application "${application.namespace}/${application.name}" en mode DISABLED, notification ignorée.`);
        return;
      }

      //Log
      logger.info(`Notification de transition pour "${application.namespace}/${application.name}": ${oldVersion} -> ${newVersion}`);

      //Récupération du changelog AI pour la version cible
      const changelog = await this.getAIChangelog(application.imageInformation.repository, [newVersion], application);

      //Mise à jour de l'état persisté
      const stateKey = `${application.namespace}/${application.name}`;
      this.stateService.set(stateKey, { version: newVersion, notifiedAt: new Date() });

      //Envoi de la notification
      await this.notificationService.broadcast(changelog, {
        username: `${application.imageInformation.repository}:${newVersion}`
      });
    } catch (error: any) {
      //Log
      logger.error(error, `Erreur lors de la notification de transition ${oldVersion} -> ${newVersion} pour ${appOrchestrator.namespace}/${appOrchestrator.name}: ${error?.message}`);
    }
  }

  /**
   * Récupération des releases notes pour une liste de versions donnée
   */
  private async getAIChangelog(repository: string, tags: string[], application: WatchedApplication): Promise<string[]> {
    try {
      //Construction des releaseInfo à partir des tags fournis
      const listeReleases = await Promise.all(
        tags.map(async (tag) => {
          return this.releaseService.getRelease(repository, tag, {
            ...application.imageInformation,
            ...application.parsedAnnotations
          });
        })
      );

      //Itération sur les releases pour les traiter via l'IA
      const listeChangelogs = await Promise.all(
        listeReleases.map(async (r) => {
          //Conversion du changelog en texte brut
          const changelog = this.aiService.markdownToText(r.changelog || '');

          //Génération d'un résumé IA du changelog (fallback sur changelog brut en cas d'erreur)
          const aiChangelog = await this.aiService.ask(changelog, RELEASE_NOTES_PROMPT).catch(() => changelog);

          //Construction du bloc Markdown
          return `## **[Version ${r.version}](${r.url})**\n${aiChangelog || changelog}\n*Publié le ${r?.publishedAt?.toLocaleDateString('fr-FR') || ''}*
        `;
        })
      );

      return listeChangelogs;
    } catch (error: any) {
      //Log
      logger.error(error, `Une erreur est survenue lors de la génération du changelog IA pour ${repository}: ${error?.message}`);
      return [];
    }
  }

  /**
   * Récupération de la version courante
   */
  private async getCurrentVersion(application: WatchedApplication, listeTags?: { tag: string; digest: string }[]): Promise<string> {
    //Vérification de la présence d'un tag Semver
    if (isSemver(application.imageInformation?.tag))
      return application.imageInformation?.tag;

    //Lecture de la version annotée (fallback pour les tags non-semver)
    const annotatedVersion = application.parsedAnnotations[TypeAnnotation.CURRENT_VERSION];
    if (annotatedVersion)
      return annotatedVersion;

    //Recherche des applications par leurs digest
    const filteredTags = listeTags.filter((t) => t?.digest === application?.imageInformation?.digest);

    if (filteredTags.length === 0)
      return null;
    else if (filteredTags.length === 1)
      return filteredTags[0].tag;

    //Filtre sur les tags semver
    const semverTags = filteredTags.filter((t) => isSemver(t.tag));

    if (semverTags.length === 0)
      return null;
    else if (semverTags.length === 1)
      return semverTags[0].tag;

    //Tris des tags restants — priorité à la version "pure" (sans suffix)
    const sortedTags = semverTags.sort((a, b) => {
      const aBase = a.tag.split('-')[0];
      const bBase = b.tag.split('-')[0];

      if (a.tag === aBase && b.tag !== bBase) return -1;
      if (a.tag !== aBase && b.tag === bBase) return 1;
      return 0;
    });

    return sortedTags.length > 0 ? sortedTags[0].tag : null;
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
    return Object.keys(listeAnnotations).some((k) => k.toLowerCase().includes('image-watcher'));
  }

  /**
   * Parsing d'une application
   */
  private getAnnotations(listeAnnotations: Record<string, string>): ApplicationAnnotation {
    return {
      [TypeAnnotation.WATCH]: this.parseAnnotation(listeAnnotations, TypeAnnotation.WATCH, env.IMAGE_WATCHER_WATCH) as boolean,
      [TypeAnnotation.MODE]: this.parseAnnotation(listeAnnotations, TypeAnnotation.MODE, env.IMAGE_WATCHER_MODE),
      [TypeAnnotation.STRATEGY]: this.parseAnnotation(listeAnnotations, TypeAnnotation.STRATEGY, env.IMAGE_WATCHER_STRATEGY) as TypeStrategy,
      [TypeAnnotation.CURRENT_VERSION]: listeAnnotations[TypeAnnotation.CURRENT_VERSION] as string,
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

    //Recherche sans altérer la casse d'origine
    const directVal = listeAnnotations[key] ?? listeAnnotations[key.toLowerCase()];

    //Définition de la valeur de l'environnement
    if (env.IMAGE_WATCHER_OVERRIDE === 'true')
      rawVal = environnement ?? directVal ?? meta?.default;
    else
      rawVal = directVal ?? environnement ?? meta?.default;

    //Vérification de la présence de méta-données
    if (!meta)
      return rawVal;

    //Vérification des options
    if (meta.options) {
      const upper = rawVal?.toString().toUpperCase();
      if (upper && meta.options.includes(upper as never)) {
        return upper;
      }
      if (upper) {
        logger.warn({ key, value: upper, options: meta.options, default: meta.default }, `La valeur fournie pour l'annotation "${key}" n'est pas supportée; utilisation de la valeur par défaut.`);
      }
      return meta.default;
    }

    return rawVal;
  }
}
