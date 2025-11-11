import { env } from 'process';
import { injectable, singleton } from 'tsyringe';
import { IRegistryProvider, RegistryUnavailableError } from '../domain/i-registry-provider';

/**
 * Implémentation pour GitHub Container Registry (GHCR)
 */
@injectable()
@singleton()
export class GhcrProvider implements IRegistryProvider {
  /** Nom du provider */
  readonly providerName = 'ghcr';

  /** URL de base de l'API GitHub */
  private readonly baseUrlApi = 'https://api.github.com';

  /** Cache des tokens anonymes */
  private readonly tokenCache = new Map<string, { token: string; expires: number }>();

  /** Constructeur */
  constructor() {
    //Aucune configuration requise au démarrage
  }

  /**
   * Vérifie si la configuration minimale est renseignée
   */
  isConfigured(): boolean {
    //Aucune configuration requise
    return true;
  }

  /**
   * Vérifie la disponibilité réelle du provider GHCR
   */
  async isAvailable(): Promise<boolean> {
    //Récupération du token (GHCR ou GitHub)
    const token = env.GITHUB_TOKEN || '';

    //Construction de l'URL pour lister les tags
    const url = `${this.baseUrlApi}/rate_limit`;

    try {
      //Appel de l'API GitHub
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      //Vérification de la réponse
      if (!response.ok)
        //Levée d'une erreur en cas d'échec HTTP
        throw new RegistryUnavailableError(`API GitHub non disponible: ${response.status}`, { providerName: this.providerName, url, status: response.status });

      //Lecture de la réponse JSON
      const data = await response.json();

      //Vérification des limites de requêtes
      if (data.rate.remaining <= 0)
        //Limite atteinte
        throw new RegistryUnavailableError(`Limite de requêtes API GitHub atteinte`, { providerName: this.providerName, url, status: response.status, remaining: data.rate.remaining, limit: data.rate.limit });

      return true;
    } catch (err: any) {
      //GHCR indisponible
      throw new RegistryUnavailableError(err.message, err.details || { providerName: this.providerName });
    }
  }

  /**
   * Liste les tags disponibles pour un dépôt public GHCR
   */
  async getListeTags(repository: string, limit: number = 10): Promise<{ tag: string; digest: string }[]> {
    //Récupération du token (GHCR ou GitHub)
    const token = env.GITHUB_TOKEN || (await this.getAnonymousToken(repository));

    //Construction de l'URL pour lister les tags
    const url = `${this.baseUrlApi}/repos/${repository}/tags?per_page=100&page=1`;

    try {
      //Appel HTTP
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      //Vérification de la réponse
      if (!response.ok)
        //Levée d'une erreur en cas d'échec HTTP
        throw new RegistryUnavailableError(`API GitHub non disponible: ${response.status}`, { providerName: this.providerName, url, status: response.status });

      //Lecture de la réponse JSON
      const data = await response.json();

      //Retour de la liste des tags
      return data.map((t: any) => ({ tag: t.name, digest: t.commit.sha })).slice(0, limit);
    } catch (err: any) {
      //Levée d'une erreur spécifique
      throw new RegistryUnavailableError(err.message, err.details || { providerName: this.providerName });
    }
  }

  /**
   * Récupère ou met en cache un token anonyme GHCR pour un repo public
   */
  private async getAnonymousToken(repository: string): Promise<string> {
    //Timestamp actuel
    const now = Date.now();

    //Vérification du cache
    const cached = this.tokenCache.get(repository);

    //Réutilisation du token si valide
    if (cached && cached.expires > now) return cached.token;

    //Construction de l'URL pour obtenir un token anonyme
    const url = `https://ghcr.io/token?service=ghcr.io&scope=repository:${repository}:pull`;

    try {
      //Requête pour obtenir un nouveau token
      const res = await fetch(url);

      //Vérification de la réponse
      if (!res.ok) throw new RegistryUnavailableError(`Échec de la récupération du token GHCR: ${res.status}`, { providerName: this.providerName, url, status: res.status });

      //Lecture du token
      const { token } = await res.json();

      //Mise en cache du token pour 10 minutes
      this.tokenCache.set(repository, { token, expires: now + 10 * 60 * 1000 });

      //Retour du token
      return token;
    } catch (err: any) {
      //Erreur lors de la récupération du token
      throw new RegistryUnavailableError(err.message, err.details || { providerName: this.providerName });
    }
  }
}
