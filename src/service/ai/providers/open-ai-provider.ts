import { injectable, singleton } from 'tsyringe';
import { AIMessage, AIModel, AIRequestOptions } from '../domain/ai';
import { AIConfigurationError, AIUnavailableError, IAIProvider } from '../domain/i-ai';

/**
 * Fournisseur OpenAI
 */
@injectable()
@singleton()
export class OpenAIProvider implements IAIProvider {
  /** Npm du provider */
  readonly providerName = 'openai';

  /** URL de l'API */
  private readonly apiUrl: string;

  /** Clef de l'api */
  private readonly apiKey?: string;

  /** Model par défaut */
  private readonly defaultModel: string;

  /** Constructeur */
  constructor() {
    //Récupération des variables d'environnement
    this.apiUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    this.apiKey = process.env.OPENAI_API_KEY;
    this.defaultModel = process.env.OPENAI_MODEL;
  }

  /**
   * Vérifie si la configuration minimale est renseignée
   */
  isConfigured(): boolean {
    //Vérification de la présence d'une configuration
    return (!!this.apiKey || !!this.apiUrl) && !!this.defaultModel;
  }

  /**
   * Vérifie la disponibilité réelle du fournisseur
   */
  async isAvailable(): Promise<boolean> {
    //Vérifie la configuration
    if (!this.isConfigured())
      //Si la configuration n'est pas complète, le fournisseur n'est pas disponible
      return false;

    try {
      //Création du header
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };

      //Vérification de la présence d'une clef API
      if (this.apiKey)
        //Définition de la clef
        headers['Authorization'] = `Bearer ${this.apiKey}`;

      //Appel HTTP
      const response = await fetch(`${this.apiUrl}/models`, { method: 'GET', headers });

      //Vérification de la requête
      if (!response.ok) {
        //Lecture de la description
        const errorData = await response.json().catch(() => ({}));

        //Levée d'une erreur
        throw new AIUnavailableError(errorData?.error?.message || `Échec ${response.status} ${response.statusText}`, { providerName: this.providerName, url: `${this.apiUrl}/models`, status: response.status });
      }

      //Tout est OK
      return true;
    } catch (err: any) {
      //Levée d'une erreur
      throw new AIUnavailableError(err.message, err.details || { providerName: this.providerName });
    }
  }

  /**
   * Conversation avec le modèle
   */
  async chat(messages: AIMessage[], options?: AIRequestOptions): Promise<string> {
    //Vérification de la configuration
    if (!this.isConfigured())
      //Levée d'une erreur de configuration
      throw new AIConfigurationError('Clé API, URL ou modèle manquant.', { providerName: this.providerName });

    //Définition de l'URL
    const url = `${this.apiUrl}/chat/completions`;

    //Définition du payload
    const payload = {
      model: options?.model || this.defaultModel,
      messages,
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 8128
    };

    //Définition des headers
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    //Ajout de la clef API si présente
    if (this.apiKey)
      //Définition de l'autorisation
      headers['Authorization'] = `Bearer ${this.apiKey}`;

    try {
      //Appel HTTP
      const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });

      //Vérification de la réponse
      if (!response.ok) {
        //Lecture de la description
        const errorData = await response.json().catch(() => ({}));

        //Levée d'une erreur
        throw new AIUnavailableError(errorData?.error?.message || `Échec ${response.status} ${response.statusText}`, { providerName: this.providerName, url: url, status: response.status });
      }

      //Lecture des données
      const data = await response.json();

      //Retour du contenu
      return data.choices?.[0]?.message?.content?.trim() || '';
    } catch (err: any) {
      //Levée d'une erreur
      throw new AIUnavailableError(err.message, err.details || { providerName: this.providerName });
    }
  }

  /**
   * Liste des modèles disponibles
   */
  async listModels(): Promise<AIModel[]> {
    //Vérification de la configuration
    if (!this.isConfigured())
      //Levée d'une erreur de configuration
      throw new AIConfigurationError('Clé API ou URL manquante.', { providerName: this.providerName });

    //Définition de l'URL
    const url = `${this.apiUrl}/models`;

    //Définition des headers
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    //Ajout de la clef API si présente
    if (this.apiKey)
      //Définition de l'autorisation
      headers['Authorization'] = `Bearer ${this.apiKey}`;

    try {
      //Appel HTTP
      const response = await fetch(url, { method: 'GET', headers });

      //Vérification de la réponse
      if (!response.ok) {
        //Lecture de la description
        const errorData = await response.json().catch(() => ({}));

        //Levée d'une erreur
        throw new AIUnavailableError(errorData?.error?.message || `Échec ${response.status} ${response.statusText}`, { providerName: this.providerName });
      }

      //Lecture des données
      const data = await response.json();

      //Retour des modèles
      return (data.data || []).map((m: any) => ({
        id: m.id,
        created: m.created,
        owned_by: m.owned_by
      }));
    } catch (err: any) {
      //Levée d'une erreur
      throw new AIUnavailableError(err.message, err.details || { providerName: this.providerName });
    }
  }
}
