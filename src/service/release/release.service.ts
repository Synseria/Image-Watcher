import { inject, injectable, singleton } from 'tsyringe';
import { ServiceProvider } from '../../core/domain/service-provider';
import createLogger from '../../core/logger';
import { TypeAnnotation } from '../image-watcher/domain/annotation';
import { IReleaseProvider } from './domain/i-release-provider';
import { ReleaseInfo } from './domain/release';
import { GitHubReleaseProvider } from './providers/github-provider';
import { ScrapperProvider } from './providers/scrapper-provider';

/** Logger */
const logger = createLogger(import.meta);

/**
 * Service centralisé pour gérer plusieurs canaux de release
 */
@injectable()
@singleton()
export class ReleaseService extends ServiceProvider {
  /** Fournisseurs de notification enregistrés */
  protected providers: Map<string, IReleaseProvider> = new Map();

  /** Provider par défaut */
  private defaultProviderName = 'github';

  /**
   * Constructeur du service de release
   */
  constructor(@inject(GitHubReleaseProvider) gitHubReleaseProvider: IReleaseProvider, @inject(ScrapperProvider) scrapperProvider: IReleaseProvider) {
    //Appel du constructeur parent
    super();

    //Enregistrement conditionnel des fournisseurs
    this.initializeProviders([gitHubReleaseProvider, scrapperProvider]);
  }

  /**
   * * Enregistrement des fournisseurs (synchrone, basé sur isConfigured)
   */
  protected initializeProviders(providers: IReleaseProvider[]): void {
    //Log
    logger.debug(`Début de l'enregistrement des fournisseurs de release.`);

    //Itération sur les fournisseurs
    for (const provider of providers) {
      //Vérification
      if (provider.isConfigured()) {
        //Enregistrement du provider
        this.providers.set(provider.providerName, provider);

        //Log
        logger.debug(`Le fournisseur de release "${provider.providerName}" a été enregistré avec succès.`);
      } else {
        //Log
        logger.debug(`Le fournisseur de release "${provider.providerName}" a été ignoré car sa configuration est incomplète.`);
      }
    }

    //Vérification du nombre de provider disponnible
    if (this.providers.size === 0)
      //Log
      logger.warn(`Aucun fournisseur de release n'est configuré ; le service fonctionne actuellement en mode silencieux.`);
    else
      //Log
      logger.info(`Les fournisseurs de release actifs sont: ${Array.from(this.providers.keys()).join(', ')}.`);
  }

  /**
   * Récupère les release notes d’un repo ou d’une URL
   */
  async getRelease(repository: string, tag: string, options?: Record<string, any>): Promise<ReleaseInfo | null> {
    //Interpolation de l’URL si fournie
    const template = options?.[TypeAnnotation.RELEASE_URL];

    //Interpolation de l’URL
    let url = template ? this.interpolateUrl(template, { ...options, repository, tag }) : undefined;

    //Sélection du provider
    const provider = this.getProvider(url || repository);

    //Vérification de la disponibilité du provider
    if (!provider) {
      //Log
      logger.debug(`La récupération de la release a été ignorée car aucun fournisseur de release n'est disponible.`);

      //Retourne null si aucun fournisseur n'est disponible
      return null;
    }

    //Log de débogage
    logger.debug(`Début de la récupération de la release "${repository}:${tag}" via le fournisseur "${provider.providerName}".`);

    //Appel du provider
    try {
      //Récupération de la release
      const release = await provider.getRelease(repository, tag, { ...options, url });

      //Log de succès
      if (release)
        //Log de succès
        logger.info(`La release "${repository}:${tag}" a été récupérée avec succès via le fournisseur "${provider.providerName}".`);
      else
        //Log de succès
        logger.info(`Aucune information de release n'a été trouvée pour "${repository}:${tag}" via le fournisseur "${provider.providerName}".`);

      //Retourne la release
      return release;
    } catch (err: any) {
      //Log d'erreur
      logger.error(err?.detail, `Une erreur est survenue lors de la récupération de la release "${repository}:${tag}" via le fournisseur "${provider.providerName}" : ${err.message}`);

      //Retourne null en cas d'erreur
      return null;
    }
  }

  /**
   * Résolution du provider à utiliser pour une cible donnée
   */
  protected getProvider(target: string): IReleaseProvider {
    //Vérification du nombre de provider disponnible
    if (this.providers.size === 0)
      //Log
      return undefined;

    //Sélection du provider
    if (/^https?:\/\//.test(target)) {
      //Itération sur les providers pour trouver une correspondance
      for (const provider of this.providers.values()) {
        //Vérification de la correspondance
        if (provider.match && provider.match(target))
          //Retourne le provider correspondant
          return provider;
      }
      //Fallback scrapper si configuré
      return this.providers.get('scrapper');
    }

    //Retourne le provider par défaut
    return this.providers.get(this.defaultProviderName);
  }

  /**
   * Interpollation des paramètres contenu dans l'url
   */
  private interpolateUrl(template: string, data: Record<string, string>): string {
    //Remplacement des paramètres
    return template.replace(/\{(.*?)\}/g, (_, key) => data[key] ?? '');
  }
}
