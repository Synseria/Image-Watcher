/**
 * Résultat d'une tentative d'envoi de notification
 */
export interface NotificationResult {
  provider: string;
  success: boolean;
  error?: string;
}

export interface NotificationOptions {
  username: string;
}
