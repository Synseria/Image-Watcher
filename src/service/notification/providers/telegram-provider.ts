import { injectable, singleton } from 'tsyringe';
import { INotificationProvider, NotificationConfigurationError, NotificationUnavailableError } from '../domain/i-notification-provider';
import { NotificationOptions } from '../domain/notification';

/**
 * Fournisseur Telegram
 */
@injectable()
@singleton()
export class TelegramProvider implements INotificationProvider {
  /** Taille maximale du contenu */
  readonly maxLength = -1;

  /** Nom unique du fournisseur */
  readonly providerName = 'telegram';

  /** Token du bot Telegram */
  private readonly botToken?: string;

  /** ID du chat Telegram */
  private readonly chatId?: string;

  /** Constructeur */
  constructor() {
    //Récupération de la configuration depuis les variables d'environnement
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
    this.chatId = process.env.TELEGRAM_CHAT_ID;
  }

  /**
   * Vérifie si la configuration minimale est renseignée
   */
  isConfigured(): boolean {
    //Vérifie que le botToken et le chatId sont présents
    return !!this.botToken && !!this.chatId;
  }

  /**
   * Vérifie la disponibilité réelle du bot Telegram
   */
  async isAvailable(): Promise<boolean> {
    //Vérifie la configuration
    if (!this.isConfigured())
      //Bot non configuré
      return false;

    //Définition de l'URL pour vérifier la disponibilité du bot
    const url = `https://api.telegram.org/bot${this.botToken}/getMe`;

    try {

      //Appel GET sur l'API Telegram
      const response = await fetch(url, { method: 'GET' });

      //Vérification de la réponse
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new NotificationUnavailableError(errorData.description || `Échec de la connexion au bot : ${response.status} ${response.statusText}`, { providerName: this.providerName, url, status: response.status });
      }

      //Bot disponible
      return true;
    } catch (err: any) {
      //Erreur réseau ou autre
      throw new NotificationUnavailableError(err.message, err.details || { providerName: this.providerName });
    }
  }

  /**
   * Envoie un message via l'API Telegram
   */
  async send(message: string, options?: NotificationOptions): Promise<void> {
    //Vérifie la configuration
    if (!this.isConfigured())
      //Levée d'une erreur de configuration
      throw new NotificationConfigurationError('Bot Telegram ou chatId manquant.', { providerName: this.providerName });

    //Préparation de l'URL d'envoi
    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;

    //Préparation du payload
    const payload = {
      chat_id: this.chatId,
      text: message,
      parse_mode: 'Markdown'
    };

    try {
      //Appel POST pour envoyer le message
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      //Vérification de la réponse
      if (!response.ok) {
        //Lecture de la description de l'erreur
        const errorData = await response.json().catch(() => ({}));

        //Levée d'une erreur si l'envoi a échoué
        throw new NotificationUnavailableError(errorData.description || `Échec de l'envoi du message : ${response.status} ${response.statusText}`, { providerName: this.providerName, url, status: response.status });
      }
    } catch (err: any) {
      //Levée d'une erreur en cas de problème
      throw new NotificationUnavailableError(err.message, err.details || { providerName: this.providerName });
    }
  }
}
