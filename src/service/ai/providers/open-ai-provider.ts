import { injectable, singleton } from 'tsyringe';
import { AIMessage, AIModel, AIRequestOptions } from '../domain/ai';
import { AIConfigurationError, AIUnavailableError, IAIProvider } from '../domain/i-ai';
import OpenAI from 'openai';
import createLogger from '../../../core/logger';

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

  /** Client OpenAI */
  private client: OpenAI;

  /** Constructeur */
  constructor() {
    //Récupération des variables d'environnement
    this.apiUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    this.apiKey = process.env.OPENAI_API_KEY;
    this.defaultModel = process.env.OPENAI_MODEL;

    //Vérification de la configuration minimale
    if ((!!this.apiKey || !!this.apiUrl) && !!this.defaultModel)
      //Initialisation du client OpenAI
      this.client = new OpenAI({
        baseURL: this.apiUrl,
        logger: createLogger(import.meta),
        logLevel: 'info',
        apiKey: this.apiKey,
      });
  }

  /**
   * Vérifie si la configuration minimale est renseignée
   */
  isConfigured(): boolean {
    //Vérifie la présence du client
    return this.client != null;
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
      //Appel HTTP pour lister les modèles
      const response = await this.client.models.list();

      //Vérification de la réponse
      if ((response as any)?.error)
        //Levée d'une erreur
        throw new AIUnavailableError((response as any)?.error, { providerName: this.providerName });

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

    try {
      //Appel HTTP
      const response = await this.client.chat.completions.create({
        model: options?.model || this.defaultModel,
        messages,
        temperature: options?.temperature ?? 0.3,
        max_tokens: options?.maxTokens ?? 8128,
      });

      //Vérification de la réponse
      if ((response as any)?.error)
        //Levée d'une erreur
        throw new AIUnavailableError((response as any)?.error, { providerName: this.providerName });

      //Récupération du résultat
      const result = response?.choices?.[0]?.message?.content?.trim();

      //Retour du contenu
      return result;
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

    try {
      //Appel HTTP pour lister les modèles
      const response = await this.client.models.list();

      //Vérification de la réponse
      if ((response as any)?.error)
        //Levée d'une erreur
        throw new AIUnavailableError((response as any)?.error, { providerName: this.providerName });

      //Retourne la liste des modèles
      return response.data.map(model => ({
        id: model.id,
        createdAt: model.created * 1000,
        ownedBy: model.owned_by
      }));
    } catch (err: any) {
      //Levée d'une erreur
      throw new AIUnavailableError(err.message, err.details || { providerName: this.providerName });
    }
  }
}
