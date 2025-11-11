import { IProvider, ProviderError } from '../../../core/domain/i-provider';
import { NotificationOptions } from './notification';

/**
 * Interface de base pour un fournisseur de notification
 */
export interface INotificationProvider extends IProvider {
  /** Taille maximale du contenu */
  readonly maxLength: number;

  /** Envoie un message de notification */
  send(message: string, options?: NotificationOptions): Promise<void>;
}

/**
 * Erreurs spécifiques aux fournisseurs de notification
 */
export class NotificationProviderError extends ProviderError {}

/**
 * Erreur de configuration du fournisseur de notification
 */
export class NotificationConfigurationError extends NotificationProviderError {}

/**
 * Erreur de disponibilité du fournisseur de notification
 */
export class NotificationUnavailableError extends NotificationProviderError {}
