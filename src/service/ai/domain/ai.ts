/**
 * Message de conversation
 */
export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Paramètres de requête pour les modèles IA
 */
export interface AIRequestOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  [key: string]: any;
}

/**
 * Modèle IA
 */
export interface AIModel {
  id: string;
  created?: number;
  owned_by?: string;
  description?: string;
}
