import { IProvider, ProviderError } from '../../../core/domain/i-provider';

/**
 * Interface commune à tous les registres.
 * Toute implémentation doit fournir ces méthodes pour unifier l'accès aux images.
 */
export interface IRegistryProvider extends IProvider {
  /**
   * Récupère les derniers tags disponibles pour un dépôt
   */
  getListeTags(repository: string, limit?: number): Promise<{ tag: string; digest: string }[]>;
}

/**
 * Erreurs spécifiques aux fournisseurs de registre
 */
export class RegistryProviderError extends ProviderError {}

/**
 * Erreur de configuration du fournisseur de registre
 */
export class RegistryUnavailableError extends RegistryProviderError {}
