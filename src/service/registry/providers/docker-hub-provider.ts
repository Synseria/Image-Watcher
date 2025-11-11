import { injectable, singleton } from 'tsyringe';
import { IRegistryProvider, RegistryUnavailableError } from '../domain/i-registry-provider';

/**
 * Implémentation du registre Docker Hub
 */
@injectable()
@singleton()
export class DockerHubProvider implements IRegistryProvider {
  /** Nom du provider */
  readonly providerName = 'docker-hub';

  /** URL de base pour l'API Docker Hub */
  private readonly baseUrl = 'https://registry.hub.docker.com/v2/repositories';

  /**
  * Vérifie si le provider est correctement configuré
  */
  isConfigured(): boolean {
    //DockerHub ne nécessite pas de configuration particulière
    return true;
  }

  /**
   * Vérifie la disponibilité du registre Docker Hub
   */
  async isAvailable(): Promise<boolean> {
    //Docker Hub est toujours disponible (On ignore les rates limits ici)
    return true
  }

  /**
  * Liste les tags disponibles pour un dépôt public Docker Hub
  */
  async getListeTags(repository: string, limit: number = 10): Promise<{ tag: string, digest: string }[]> {
    //Docker Hub utilise "library/" pour les images officielles
    repository = repository.includes('/') ? repository : `library/${repository}`;

    //Construction de l'URL de l'API
    const url = `${this.baseUrl}/${repository}/tags?page_size=${limit}`;

    try {
      //Requête à l'API Docker Hub
      const response = await fetch(url);

      //Vérification de la réponse
      if (!response.ok)
        //Levée d'une erreur spécifique
        throw new RegistryUnavailableError(`API Docker Hub non disponible: ${response.status}`, { providerName: this.providerName, url, status: response.status });

      //Analyse de la réponse JSON
      const data = await response.json();

      //Extraction des tags
      return data.results.map((r: any) => ({
        tag: r.name,
        digest: r.digest?.split('sha256:')?.[1]
      }));
    } catch (err: any) {
      //Levée d'une erreur
      throw new RegistryUnavailableError(`API Docker Hub non disponible: ${err.message}`, err.details || { providerName: this.providerName });
    }
  }
}
