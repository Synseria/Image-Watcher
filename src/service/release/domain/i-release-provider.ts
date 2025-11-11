import { IProvider, ProviderError } from '../../../core/domain/i-provider';
import { ReleaseInfo } from './release';

/**
 * Interface commune à tous les fournisseurs de releases.
 */
export interface IReleaseProvider extends IProvider {
  /** Récupération de la release notes */
  getRelease(repository: string, tag: string, options?: Record<string, any>): Promise<ReleaseInfo | null>;

  /** Vérifie si ce provider sait gérer une URL donnée */
  match(url: string): boolean;
}
/**
 * Erreurs spécifiques aux fournisseurs de release
 */
export class ReleaseProviderError extends ProviderError {}

/**
 * Erreur de configuration du fournisseur de release
 */
export class ReleaseConfigurationError extends ReleaseProviderError {}

/**
 * Erreur de disponibilité du fournisseur de release
 */
export class ReleaseUnavailableError extends ReleaseProviderError {}
