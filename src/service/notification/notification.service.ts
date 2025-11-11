import { inject, injectable, singleton } from 'tsyringe';
import createLogger from '../../core/logger';
import { NotificationOptions } from './domain/notification';
import { NotificationResult } from './domain/notification';
import { DiscordProvider } from './providers/discord-provider';
import { INotificationProvider } from './domain/i-notification-provider';
import { TelegramProvider } from './providers/telegram-provider';
import { ServiceProvider } from '../../core/domain/service-provider';

/** Logger */
const logger = createLogger();

/**
 * Service centralisé pour gérer plusieurs canaux de notification
 */
@injectable()
@singleton()
export class NotificationService extends ServiceProvider {
  /** Fournisseurs de notification enregistrés */
  protected providers: Map<string, INotificationProvider> = new Map();

  /**
   * Constructeur du service de notification
   */
  constructor(@inject(DiscordProvider) discordProvider: INotificationProvider, @inject(TelegramProvider) telegramProvider: INotificationProvider) {
    //Appel du constructeur parent
    super();

    //Enregistrement conditionnel des fournisseurs
    this.initializeProviders([discordProvider, telegramProvider]);
  }

  /**
   * Enregistrement des fournisseurs (synchronne, basé sur isConfigured)
   */
  protected initializeProviders(providers: INotificationProvider[]): void {
    //Log
    logger.info(`Début de l'enregistrement des fournisseurs de notification.`);

    //Itération sur les fournisseurs
    for (const provider of providers) {
      //Vérification de la configuration
      if (provider.isConfigured()) {
        //Enregistrement du provider
        this.providers.set(provider.providerName, provider);

        //Log
        logger.info(`Le fournisseur de notification "${provider.providerName}" a été enregistré avec succès.`);
      } else
        //Log
        logger.debug(`Le fournisseur de notification "${provider.providerName}" a été ignoré car sa configuration est incomplète.`);
    }

    //Vérification du nombre de provider disponnible
    if (this.providers.size === 0)
      //Log
      logger.warn(`Aucun fournisseur de notification n'est configuré ; le service fonctionne actuellement en mode silencieux.`);
  }

  /**
   * Récupération optionnelle du provider
   */
  protected getProvider(): INotificationProvider {
    //Non implémenté
    throw new Error('Method not implemented.');
  }

  /**
   * Diffuse un message à tous les fournisseurs (silencieux si aucun)
   */
  async broadcast(message: string | string[], options?: NotificationOptions): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    //Vérification du nombre de provider disponibles
    if (this.providers.size === 0) {
      //Log
      logger.debug(`La diffusion a été ignorée car aucun fournisseur de notification n'est disponible.`);

      //Retourne les résultats
      return results;
    }

    //Log
    logger.debug(`Début de la diffusion vers ${this.providers.size} fournisseur(s).`);

    //Itération sur les fournisseurs
    for (const [providerName, provider] of this.providers) {
      try {
        //Log
        const parts = this.splitMessageSmart(message, provider.maxLength);

        //Log
        logger.debug(`Préparation de la diffusion via le fournisseur "${providerName}" en ${parts.length} partie(s).`);

        //Envoi des messages
        for (const part of parts) {
          //Envoi
          await provider.send(part, options);
        }

        //Succès
        results.push({ provider: providerName, success: true });

        //Log
        logger.info(`La diffusion a été effectuée avec succès via le fournisseur "${providerName}". Message: ${message.length}-${parts.length}`);
      } catch (err: any) {
        //Log
        logger.error(err?.detail, `Une erreur est survenue lors de la diffusion via le fournisseur "${providerName}": ${err.message}. Message: ${message.length}`);

        //Échec
        results.push({ provider: providerName, success: false, error: err.message });
      }
    }

    //Retourne les résultats
    return results;
  }

  /**
   * Liste les fournisseurs disponibles
   */
  getAvailableProviders(): string[] {
    //Liste des fournisseurs disponibles
    return Array.from(this.providers.keys());
  }

  /**
   * Découpe un message en plusieurs parties en fonction de la taille maximale
   */
  private splitMessageSmart(input: string | string[], maxLength: number): string[] {
    //Définition du texte
    const text = Array.isArray(input) ? input.join('\n') : input.trim();

    //Vérification de la longueur du texte
    if (text.length <= maxLength)
      //Taille OK
      return [text];

    //Définition des séparateurs
    const separators = [
      /\n{2,}/g, //Paragraphes
      /(?<=#{1,3}\s)/g, //Titres markdown
      /\n/g, //Lignes
      /(?<=[.!?])\s+/g, //Phrases
      /\s+/g //Espaces
    ];

    //Initialisation du chunk
    const chunks: string[] = [];

    //Définition du texte
    let remaining = text;

    //Itération sur le texte
    while (remaining.length > 0) {
      //Vérification de la longueur du texte
      if (remaining.length <= maxLength) {
        //Taille OK
        chunks.push(remaining);

        //Fin de l'itération
        break;
      }

      //Vérification des séparateurs
      let splitIndex = -1;

      //Itération sur les séparateurs
      for (const sep of separators) {
        //Définition des correspondances
        const matches = [...remaining.matchAll(sep)].map((m) => m.index ?? 0);

        //Définition de l'index
        const validIndex = matches.reverse().find((i) => i < maxLength);

        //Vérification de l'index
        if (validIndex) {
          //Définition de l'index
          splitIndex = validIndex;

          //Fin de l'itération
          break;
        }
      }

      //Si rien trouvé, on coupe brutalement (sécurité)
      if (splitIndex === -1)
        //Séparateur
        splitIndex = maxLength;

      //Découpage du chunk
      const chunk = remaining.slice(0, splitIndex).trim();

      //Ajout du chunk à la liste
      chunks.push(chunk);

      //Définition
      remaining = remaining.slice(splitIndex).trim();
    }

    //Log
    logger.debug(`Le message a été découpé en ${chunks.length} partie(s).`);

    //Retour des chunks
    return chunks;
  }
}
