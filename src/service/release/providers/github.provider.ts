import fetch from "node-fetch";
import { env } from "process";
import { injectable, singleton } from "tsyringe";
import { IReleaseProvider, ReleaseUnavailableError } from "../domain/i-release-provider";
import { ReleaseInfo } from "../domain/release";

/**
 * Fournisseur GitHub
 */
@injectable()
@singleton()
export class GitHubReleaseProvider implements IReleaseProvider {
  /** Nom du fournisseur */
  readonly providerName = "github";

  /** URL de base de l'API GitHub */
  private readonly baseUrlApi = 'https://api.github.com';

  /** Constructeur */
  constructor() {
    //Pas de configuration spécifique requise
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
          "Authorization": `Bearer ${token}`
        }
      });

      //Vérification de la réponse
      if (!response.ok)
        //Levée d'une erreur en cas d'échec HTTP
        throw new ReleaseUnavailableError(`API GitHub non disponible: ${response.status}`, { providerName: this.providerName, url, status: response.status });

      //Lecture de la réponse JSON
      const data = await response.json();

      //Vérification des limites de requêtes
      if (data.rate.remaining <= 0)
        //Limite atteinte
        throw new ReleaseUnavailableError(`Limite de requêtes API GitHub atteinte`, { providerName: this.providerName, url, status: response.status, remaining: data.rate.remaining, limit: data.rate.limit });

      return true;
    } catch (err: any) {
      //GHCR indisponible
      throw new ReleaseUnavailableError(err.message, err.details || { providerName: this.providerName });
    }
  }

  /**
   * Récupération des informations d'une release
   */
  async getRelease(repository: string, version: string, options?: Record<string, any>): Promise<ReleaseInfo> {
    //Définition du token
    const token = env.GITHUB_TOKEN;

    //Définition de l'URL
    const url = options?.url || `https://api.github.com/repos/${repository}/releases/tags/${version}`;

    //Définition des headers
    const headers: Record<string, string> = {
      "Accept": "application/vnd.github+json",
      "User-Agent": "release-service",
      "Authorization": `Bearer ${token}`
    };

    try {
      //Appel de l'API GitHub
      const response = await fetch(url, { headers });

      //Vérification de la réponse
      if (!response.ok)
        //Levée d'une erreur si HTTP KO
        throw new ReleaseUnavailableError(`Échec de la récupération de la release: ${response.status} ${response.statusText}`, { providerName: this.providerName, url, status: response.status });

      //Lecture des données JSON
      const data = await response.json();

      //Définition du résultat
      const release: ReleaseInfo = {
        provider: this.providerName,
        name: repository,
        version: version,
        url: data.html_url,
        author: data.author?.login ?? "unknown",
        avatarUrl: data.author?.avatar_url ?? null,
        publishedAt: new Date(data.published_at),
        changelog: data.body || "",
      };

      //Retour du résultat
      return release;
    } catch (err: any) {
      //Levée d'une erreur en cas de problème
      throw new ReleaseUnavailableError(err.message, err.details || { providerName: this.providerName });
    }
  }

  /**
   * Vérifie si ce provider peut gérer une URL donnée
   */
  match(url: string): boolean {
    //Vérification de l'URL
    return /^https:\/\/((api|www)\.)?github\.com\/repos\/.*/.test(url);
  }
}
