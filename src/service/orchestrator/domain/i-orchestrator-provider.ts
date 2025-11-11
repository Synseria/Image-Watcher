import { V1Deployment, V1StatefulSet } from '@kubernetes/client-node';
import { IProvider, ProviderError } from '../../../core/domain/i-provider';
import { ApplicationAnnotation } from '../../image-watcher/domain/annotation';
import { Application } from './application';

/**
 * Interface de gestion des providers
 */
export interface IOrchestratorProvider extends IProvider {
  /** Récupération d'une liste d'application */
  getApplications(): Promise<Application[]>;

  /** Récupération d'une application */
  getApplication(namespace: string, name: string): Promise<Application>;

  /** Mise à jours d'une application */
  patchApplication(app: Application, params: ApplicationAnnotation, image?: string): Promise<V1Deployment | V1StatefulSet>;

  /** Lecture du digest */
  readDigest(application: Application): Promise<string>;
}

/**
 * Erreurs spécifiques aux fournisseurs d'orchestrateur
 */
export class OrchestratorProviderError extends ProviderError {}

/**
 * Erreur de configuration du fournisseur d'orchestrateur
 */
export class OrchestratorConfigurationError extends OrchestratorProviderError {}

/**
 * Erreur de disponibilité du fournisseur d'orchestrateur
 */
export class OrchestratorUnavailableError extends OrchestratorProviderError {}
