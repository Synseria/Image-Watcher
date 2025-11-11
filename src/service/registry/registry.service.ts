import { inject, injectable, singleton } from 'tsyringe';
import { ServiceProvider } from '../../core/domain/service-provider';
import createLogger from '../../core/logger';
import { IRegistryProvider } from './domain/i-registry-provider';
import { DockerHubProvider } from './providers/docker-hub-provider';
import { GhcrProvider } from './providers/ghcr-provider';
import { parseImageName } from '../../utils/image-utils';

/** Création du logger pour ce module **/
const logger = createLogger();

/**
 * Service des registres
 */
@injectable()
@singleton()
export class RegistryService extends ServiceProvider {
  /** Liste des providers */
  protected providers: Map<string, IRegistryProvider> = new Map();

  /**
   * Constructeur du service des registres
   */
  constructor(
    @inject(DockerHubProvider) private dockerHubProvider: IRegistryProvider,
    @inject(GhcrProvider) private ghcrProvider: IRegistryProvider
  ) {
    //Appel du constructeur parent
    super();

    //Enregistrement conditionnel des fournisseurs
    this.initializeProviders([dockerHubProvider, ghcrProvider]);
  }

  /**
   * * Enregistrement des fournisseurs (synchrone, basé sur isConfigured)
   */
  protected initializeProviders(providers: IRegistryProvider[]): void {
    //Log
    logger.info(`Début de l'enregistrement des fournisseurs de registre.`);

    //Itération sur les fournisseurs
    for (const provider of providers) {
      //Vérification
      if (provider.isConfigured()) {
        //Enregistrement du provider
        this.providers.set(provider.providerName, provider);

        //Log
        logger.info(`Le fournisseur de registre "${provider.providerName}" a été enregistré avec succès.`);
      } else {
        //Log
        logger.debug(`Le fournisseur de registre "${provider.providerName}" a été ignoré car sa configuration est incomplète.`);
      }
    }

    //Vérification du nombre de provider disponnible
    if (this.providers.size === 0) {
      //Log
      logger.warn(`Aucun fournisseur de registre n'est configuré ; le service fonctionne actuellement en mode silencieux.`);
    } else {
      logger.info(`Les fournisseurs de registre actifs sont: ${Array.from(this.providers.keys()).join(', ')}.`);
    }
  }

  // /**
  //  * Méthode publique pour récupérer les infos d'une image
  //  */
  // async getImageInformation(imageName: string): Promise<ImageInformation> {
  //   //Décomposition du nom complet
  //   const { registry, repository, tag } = this.parseImageName(imageName);

  //   //Récupération du registre approprié
  //   const reg = this.getRegistry(registry);

  //   //Récupération et retour des infos de l'image
  //   const imageInfo = await reg.getInformation(repository, tag);

  //   //Log de débogage
  //   logger.debug(imageInfo, `Récupération des informations pour l'image %s depuis le registre %s`, imageName, registry);

  //   //Retour des informations de l'image
  //   return imageInfo;
  // }

  /**
   * Méthode publique pour lister les tags d'une image
   */
  public async getListeTags(imageName: string, limit = 100): Promise<{ tag: string; digest: string }[]> {
    //Parse le nom complet
    const { registry, repository } = parseImageName(imageName);

    //Récupère le registry approprié
    const reg = this.getProvider(registry);

    //Log de débogage
    logger.debug(`Début de la récupération de la liste des tags pour le dépôt "${repository}" sur le registre "${registry}" (limite: ${limit}).`);

    try {
      //Récupération des tags
      const tags = await reg.getListeTags(repository, limit);

      //Log de succès
      logger.info(`La liste des tags a été récupérée avec succès pour le dépôt "${repository}" (${tags.length} tag(s)) via le fournisseur "${reg.providerName}".`);

      //Retourne les tags
      return tags;
    } catch (err: any) {
      //Log d'erreur
      logger.error(err?.detail, `Une erreur est survenue lors de la récupération des tags pour le dépôt "${repository}" via le fournisseur "${reg.providerName}": ${err.message}`);

      //Retourne un tableau vide en cas d'erreur
      return [];
    }
  }

  /**
   * Retourne le registre correspondant à l'URL fournie
   */
  protected getProvider(baseUrl?: string): IRegistryProvider {
    let candidate: IRegistryProvider;

    //Retourne le fournisseur approprié
    switch (baseUrl) {
      case 'ghcr.io':
        //Utilisation du registry GHCR
        candidate = this.ghcrProvider;
        break;
      case 'docker.io':
      default:
        //Utilisation du registry Docker Hub par défaut
        candidate = this.dockerHubProvider;
        break;
    }

    //Vérification de la disponibilité du provider
    if (!candidate) {
      //Log d'erreur
      logger.error(`Aucun fournisseur de registre n'a été trouvé pour l'URL "${baseUrl}".`);

      //Lève une erreur
      throw new Error(`Aucun fournisseur de registre n'a été trouvé pour l'URL "${baseUrl}".`);
    }

    //Retourne le provider trouvé
    return candidate;
  }
}
