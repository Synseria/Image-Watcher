import { IProvider, ProviderError } from "../../../core/domain/i-provider";
import { AIMessage, AIModel, AIRequestOptions } from "../domain/ai";

/**
 * Interface standard pour les fournisseurs IA
 */
export interface IAIProvider extends IProvider {
  /** Requête conversationnelle */
  chat(messages: AIMessage[], options?: AIRequestOptions): Promise<string>;

  /** Liste des modèles disponibles sur ce fournisseur */
  listModels(): Promise<AIModel[]>;
}

/**
 * Erreurs spécifiques aux fournisseurs IA
 */
export class AIProviderError extends ProviderError { }

/**
 * Erreur de configuration du fournisseur IA
 */
export class AIConfigurationError extends AIProviderError { }

/**
 * Erreur de disponibilité du fournisseur IA
 */
export class AIUnavailableError extends AIProviderError { }
