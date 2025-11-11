import { injectable, singleton } from 'tsyringe';
import { IReleaseProvider, ReleaseUnavailableError } from '../domain/i-release-provider';
import { ReleaseInfo } from '../domain/release';

/**
 * Provider Scrapper
 */
@injectable()
@singleton()
export class ScrapperProvider implements IReleaseProvider {
  /** Nom du fournisseur */
  readonly providerName = 'scrapper';

  /** Constructeur */
  constructor() { }

  /**
   * Vérifie si la configuration minimale est renseignée
   */
  isConfigured(): boolean {
    //Ce provider nécessite une URL dans les options
    return true;
  }

  /**
   * Vérifie la disponibilité réelle du provider
   */
  async isAvailable(): Promise<boolean> {
    //Ce provider est toujours disponible
    return true;
  }

  /**
   * Vérifie si ce provider peut gérer l'URL donnée
   */
  match(url: string): boolean {
    //Accepte tout ce qui n'est pas géré par les autres providers
    return /^https?:\/\//.test(url);
  }

  /**
   * Récupération d'une release depuis une URL
   */
  async getRelease(repository: string, tag: string, options?: Record<string, any>): Promise<ReleaseInfo> {
    //Interpolation de l'URL
    const filledUrl = this.interpolateUrl(options.urlTemplate, { ...options, repository, tag });
    try {

      //Appel HTTP
      const response = await fetch(filledUrl);

      //Vérification de la réponse
      if (!response.ok)
        //Levée d'une erreur si HTTP échoue
        throw new ReleaseUnavailableError(`Échec de la récupération de la release: ${response.status} ${response.statusText}`, { providerName: this.providerName, url: filledUrl, status: response.status });

      //Lecture du contenu en texte
      const raw = await response.text();

      //Retour des informations de release
      return {
        provider: this.providerName,
        name: repository,
        version: tag,
        url: filledUrl,
        author: 'unknown',
        publishedAt: new Date(),
        changelog: raw
      };
    } catch (err: any) {
      //Levée d'une erreur en cas de problème
      throw new ReleaseUnavailableError(err.message, err.details || { providerName: this.providerName });
    }
  }
  /**
   * Interpolation des paramètres contenus dans l'URL
   */
  private interpolateUrl(template: string, data: Record<string, string>): string {
    //Remplacement des variables dans le template
    return template.replace(/\$\{(.*?)\}/g, (_, key) => data[key] ?? '');
  }
}
