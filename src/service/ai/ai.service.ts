import { inject, injectable, singleton } from 'tsyringe';
import { ServiceProvider } from '../../core/domain/service-provider';
import createLogger from '../../core/logger';
import { AIMessage, AIModel, AIRequestOptions } from './domain/ai';
import { IAIProvider } from './domain/i-ai';
import { OpenAIProvider } from './providers/open-ai-provider';

/** Logger */
const logger = createLogger(import.meta);

/**
 * Service centralisé pour gérer plusieurs fournisseurs d'IA
 */
@injectable()
@singleton()
export class AIService extends ServiceProvider {
  /** Fournisseurs d'IA */
  protected readonly providers: Map<string, IAIProvider> = new Map();

  /**
   * Constructeur du service IA
   */
  constructor(@inject(OpenAIProvider) openAIProvider: IAIProvider) {
    //Appel du constructeur parent
    super();

    //Enregistrement conditionnel des fournisseurs
    this.initializeProviders([openAIProvider]);
  }

  /**
   * * Enregistrement des fournisseurs (synchrone, basé sur isConfigured)
   */
  protected initializeProviders(providers: IAIProvider[]): void {
    //Log
    logger.debug(`Début de l'enregistrement des fournisseurs d'intelligence artificielle.`);

    //Itération sur les fournisseurs
    for (const provider of providers) {
      //Vérification
      if (provider.isConfigured()) {
        //Enregistrement du provider
        this.providers.set(provider.providerName, provider);

        //Log
        logger.debug(`Le fournisseur d'intelligence artificielle "${provider.providerName}" a été enregistré avec succès.`);
      } else {
        //Log
        logger.debug(`Le fournisseur d'intelligence artificielle "${provider.providerName}" a été ignoré car sa configuration est incomplète.`);
      }
    }

    //Vérification du nombre de provider disponnible
    if (this.providers.size === 0)
      //Log
      logger.warn(`Aucun fournisseur d'intelligence artificielle n'est configuré ; le service fonctionne actuellement en mode silencieux.`);
    else
      //Log
      logger.info(`Les fournisseurs d'intelligence artificielle actifs sont: ${Array.from(this.providers.keys()).join(', ')}.`);
  }

  /**
   * Récupération optionnelle du provider (silencieux si absent)
   */
  protected getProvider(name?: string): IAIProvider | undefined {
    //Vérification du nombre de provider disponibles
    if (this.providers.size === 0)
      //Retourne undefined si aucun provider n'est disponible
      return undefined;

    //Vérification du nom du provider
    if (name)
      //Retourne le provider correspondant au nom
      return this.providers.get(name);

    //Retourne le premier provider disponible
    return Array.from(this.providers.values())[0];
  }

  /**
   * Conversation avec le LLM (silencieux si aucun provider)
   */
  async chat(messages: AIMessage[], options?: AIRequestOptions & { provider?: string }): Promise<string> {
    //Récupération du provider
    const provider = this.getProvider(options?.provider);

    //Vérification du provider
    if (!provider) {
      //Aucun fournisseur disponible
      logger.debug(`La demande de conversation a été ignorée car aucun fournisseur n'est disponible.`);

      //Retourne une chaîne vide
      return '';
    }

    //Log
    logger.info(`Début de la conversation via le fournisseur "${provider.providerName}" avec ${messages.length} message(s).`);

    try {
      //Appel au provider
      const result = await provider.chat(messages, options);

      //Log
      logger.info(`La conversation s'est terminée avec succès via le fournisseur "${provider.providerName}". Message: ${messages.length}-${result.length}.`);

      //Retourne le résultat
      return result;
    } catch (err: any) {
      //Log
      logger.error(err?.detail, `Une erreur est survenue lors de la conversation via le fournisseur "${provider.providerName}": ${err.message}`);

      //Retourne une chaîne vide
      return '';
    }
  }

  /**
   * Demande simple au LLM (silencieux si aucun provider)
   */
  async ask(message: string, systemPrompt: string, options?: AIRequestOptions & { provider?: string }): Promise<string> {
    //Récupération du provider
    const provider = this.getProvider(options?.provider);

    //Vérification du provider
    if (!provider) {
      //Log
      logger.debug(`La requête simple a été ignorée car aucun fournisseur n'est disponible.`);

      //Retourne une chaîne vide
      return '';
    }

    //Construction des messages
    const messages: AIMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message }
    ];

    //Log
    logger.info(`Exécution de la requête simple via le fournisseur "${provider.providerName}".`);

    //Appel au provider
    try {
      //Appel au provider
      const result = await provider.chat(messages, options);

      //Log
      logger.info(`La requête simple s'est terminée avec succès via le fournisseur "${provider.providerName}". Message: ${message.length}-${result.length}.`);

      //Retourne le résultat
      return result;
    } catch (err: any) {
      //Log
      logger.error(err?.detail, `Une erreur est survenue lors de la requête simple via le fournisseur "${provider.providerName}": ${err.message}`);

      //Retourne une chaîne vide
      return '';
    }
  }

  /** Liste des modèles (silencieux si aucun provider) */
  async listModels(providerName?: string): Promise<AIModel[]> {
    //Récupération du provider
    const provider = this.getProvider(providerName);

    //Vérification du provider
    if (!provider) {
      //Log
      logger.debug(`La récupération de la liste des modèles a été ignorée car aucun fournisseur n'est disponible.`);

      //Retourne un tableau vide
      return [];
    }
    //Log
    logger.debug(`Récupération de la liste des modèles via le fournisseur "${provider.providerName}".`);

    try {
      //Appel au provider
      const models = await provider.listModels();

      //Log
      logger.info(`La liste des modèles a été récupérée avec succès via le fournisseur "${provider.providerName}" (${models.length} modèle(s) trouvé(s)).`);

      //Retourne le résultat
      return models;
    } catch (err: any) {
      //Log
      logger.error(err?.detail, `Une erreur est survenue lors de la récupération des modèles via le fournisseur "${provider.providerName}": ${err.message}`);

      //Retourne un tableau vide
      return [];
    }
  }

  /**
   * Transformation du markdown en texte
   */
  public markdownToText(md: string): string {
    return md
      .replace(/<[^>]+>/g, '') // Supprime HTML
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Supprime liens markdown
      .replace(/[*_~`#>-]/g, '') // Supprime caractères markdown individuels
      .replace(/\r?\n+/g, '\n') // Normalise les retours à la ligne
      .replace(/ +/g, ' ') // Normalise les espaces multiples
      .trim();
  }
}
