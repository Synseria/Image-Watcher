import { inject, injectable, singleton } from 'tsyringe';
import { ServiceProvider } from '../../core/domain/service-provider';
import createLogger from '../../core/logger';
import { parseImageName } from '../../utils/image-utils';
import { ApplicationAnnotation } from '../image-watcher/domain/annotation';
import { Application } from './domain/application';
import { IOrchestratorProvider } from './domain/i-orchestrator-provider';
import { KubeProvider } from './providers/kube-provider';

/** Création du logger pour ce module **/
const logger = createLogger();

/**
 * Service principal d’orchestration.
 */
@injectable()
@singleton()
export class OrchestratorService extends ServiceProvider {
  /** Fournisseurs d'orchestration disponibles */
  protected providers: Map<string, IOrchestratorProvider> = new Map();

  /**
   * Initialise le service d’orchestration.
   * @param providerType Type de provider à utiliser (ex: "k3s" ou "docker")
   */
  constructor(@inject(KubeProvider) private kubeProvider: IOrchestratorProvider) {
    //Appel du constructeur parent
    super();

    //Enregistrement conditionnel des fournisseurs
    this.initializeProviders([kubeProvider]);
  }

  /**
   * Enregistrement des fournisseurs (synchronne, basé sur isConfigured)
   */
  protected initializeProviders(providers: IOrchestratorProvider[]): void {
    //Log
    logger.info(`Début de l'enregistrement des fournisseurs d'orchestration.`);

    //Itération sur les fournisseurs
    for (const provider of providers) {
      //Vérification de la configuration
      if (provider.isConfigured()) {
        //Enregistrement du provider
        this.providers.set(provider.providerName, provider);

        //Log
        logger.info(`Le fournisseur d'orchestration "${provider.providerName}" a été enregistré avec succès.`);
      } else {
        //Log
        logger.debug(`Le fournisseur d'orchestration "${provider.providerName}" a été ignoré (configuration incomplète).`);
      }
    }

    //Vérification du nombre de provider disponnible
    if (this.providers.size === 0) {
      //Log
      logger.warn(`Aucun fournisseur d'orchestration n'est configuré ; le service fonctionne actuellement en mode silencieux.`);
    } else {
      //Log
      logger.info(`Le fournisseur d'orchestration actif est: ${this.providers.values().next().value}`);
    }
  }

  /**
   * Récupération optionnelle du provider (silencieux si absent)
   */
  protected getProvider(): IOrchestratorProvider {
    //Vérification du nombre de provider disponibles
    if (this.providers.size === 0)
      //Erreur si aucun provider n'est disponible
      throw new Error("Aucun fournisseur d'orchestration n'est disponible.");

    //Retourne le premier provider disponible
    return this.providers.values().next().value;
  }

  /**
   * Liste des applications
   */
  async listeApplications(): Promise<Application[]> {
    //Récupération du provider
    const provider = this.getProvider();

    try {
      //Récupération des applications
      const apps = await provider.getApplications();

      //Itérations sur les applications
      const enriched = apps.map((application: Application) => {
        //Vérification de la présence d'une image
        if (!application.image) return application;

        //Parsing de l'image
        const imageInformation = parseImageName(application.image);

        //Enrichissements des données
        return {
          ...application,
          imageInformation: {
            ...imageInformation,
            digest: imageInformation.digest || application?.imageInformation?.digest
          }
        };
      });

      //Log
      logger.info(`La liste des applications a été récupérée avec succès (${enriched.length} application(s)).`);

      //Retour des applications
      return enriched;
    } catch (err: any) {
      //Log
      logger.error(err?.detail, `Une erreur est survenue lors de la récupération de la liste des applications : ${err.message}`);

      //Retourne une liste vide
      return [];
    }
  }

  /**
   * Récupération d'une application
   */
  async getApplication(namespace: string, name: string): Promise<Application | undefined> {
    //Récupération du provider
    const provider = this.getProvider();

    try {
      //Récupération de l'application
      const application = await provider.getApplication(namespace, name);

      //Parsing de l'image
      const imageInformation = parseImageName(application.image);

      //Enrichissements des données
      const enriched: Application = {
        ...application,
        imageInformation: {
          ...imageInformation,
          digest: imageInformation.digest || application?.imageInformation?.digest
        }
      };
      //Log
      logger.info(`L'application "${namespace}/${name}" a été récupérée avec succès.`);

      //Retour de l'application
      return enriched;
    } catch (err: any) {
      //Log
      logger.error(err?.detail, `Une erreur est survenue lors de la récupération de l'application "${namespace}/${name}" : ${err.message}`);
    }
  }

  /**
   * Lecture du digest depuis l'application
   */
  async readDigest(application: Application): Promise<string> {
    //Récupération du provider
    const provider = this.getProvider();

    try {
      //Lecture du digest
      const result = await provider.readDigest(application);

      //Log
      logger.info(`Le digest de l'application "${application.namespace}/${application.name}" a été lu avec succès.`);

      //Retour du résultat
      return result;
    } catch (err: any) {
      //Log
      logger.error(err?.detail, `Une erreur est survenue lors de la lecture du digest de l'application "${application.namespace}/${application.name}" : ${err.message}`);
    }
  }

  /**
   * Mise à jour d'une application
   */
  public async patchApplication(application: Application, params: ApplicationAnnotation, image?: string): Promise<any> {
    //Récupération du provider
    const provider = this.getProvider();

    try {
      //Mise à jour de l'application
      const result = await provider.patchApplication(application, params, image);

      //Log
      logger.info(`L'application "${application.namespace}/${application.name}" a été mise à jour avec succès.`);

      //Retour du résultat
      return result;
    } catch (err: any) {
      //Log
      logger.error(err?.detail, `Une erreur est survenue lors de la mise à jour de l'application "${application.namespace}/${application.name}" : ${err.message}`);
    }
  }
}
