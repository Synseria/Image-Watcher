import { injectable, singleton } from 'tsyringe';
import { INotificationProvider, NotificationConfigurationError, NotificationUnavailableError } from '../domain/i-notification-provider';
import { NotificationOptions } from '../domain/notification';

/**
 * Fournisseur Discord
 */
@injectable()
@singleton()
export class DiscordProvider implements INotificationProvider {
  /** Taille maximale du contenu */
  readonly maxLength = 2000;

  /** Nom unique du fournisseur */
  readonly providerName = 'discord';

  /** URL du webhook Discord */
  private readonly webhookUrl?: string;

  /** Constructeur */
  constructor() {
    //Récupération de la configuration depuis les variables d'environnement
    this.webhookUrl = process.env.DISCORD_URL;
  }

  /**
   * Vérifie si la configuration minimale est renseignée
   */
  isConfigured(): boolean {
    //Vérifie la présence de l'URL du webhook
    return !!this.webhookUrl;
  }

  /**
   * Vérifie la disponibilité réelle du webhook Discord
   */
  async isAvailable(): Promise<boolean> {
    //Vérifie la configuration
    if (!this.isConfigured())
      //Webhook non configuré
      return false;

    try {
      //Appel GET sur le webhook pour tester la disponibilité
      const response = await fetch(this.webhookUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      //Vérification de la réponse
      if (!response.ok) {
        //Lecture de la description de l'erreur
        const errorData = await response.json().catch(() => ({}));

        //Levée d'une erreur si le webhook est indisponible
        throw new NotificationUnavailableError(errorData.message || `Échec de la connexion au webhook : ${response.status} ${response.statusText}`, { providerName: this.providerName, url: this.webhookUrl, status: response.status });
      }

      //Webhook disponible
      return true;
    } catch (err: any) {
      //Erreur réseau ou autre
      throw new NotificationUnavailableError(err.message, err.details || { providerName: this.providerName });
    }
  }

  /**
   * Envoie un message vers le webhook Discord
   */
  async send(message: string, options?: NotificationOptions): Promise<void> {
    //Vérifie la configuration
    if (!this.isConfigured())
      //Levée d'une erreur de configuration
      throw new NotificationConfigurationError('Webhook Discord non configuré.', { providerName: this.providerName });

    //Préparation du payload
    const payload = {
      content: message,
      username: options?.username
    };

    try {
      //Appel POST pour envoyer le message
      const response = await fetch(this.webhookUrl!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      //Vérification de la réponse
      if (!response.ok) {
        throw new NotificationUnavailableError(`Échec de l'envoi du message : ${response.status} ${response.statusText}`, { providerName: this.providerName, url: this.webhookUrl, status: response.status });
      }
    } catch (err: any) {
      //Levée d'une erreur en cas de problème
      throw new NotificationUnavailableError(err.message, err.details || { providerName: this.providerName });
    }
  }
}
