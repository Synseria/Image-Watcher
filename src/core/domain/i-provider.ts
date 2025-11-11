/**
 * Interface de base pour un fournisseur
 */
export interface IProvider {
  /** Nom unique du fournisseur */
  readonly providerName: string;

  /** Indique si la configuration minimale est renseignée (clé API, etc.) */
  isConfigured(): boolean;

  /** Vérifie la disponibilité effective du fournisseur (ex : ping API) */
  isAvailable(): Promise<boolean>;
}

/**
 * Erreur générique liée à un provider
 */
export class ProviderError extends Error {
  /** Nom du provider associé à l'erreur */
  readonly providerName?: string;

  /** Détails supplémentaires sur l'erreur */
  readonly details?: Record<string, any>;

  /**
   * Constructeur de l'erreur ProviderError
   */
  constructor(message: string, details: { providerName: string; [key: string]: any }, stack?: string) {
    //Héritage
    super(message);

    //Rétablir la chaîne de prototypes (nécessaire en TypeScript)
    Object.setPrototypeOf(this, ProviderError.prototype);

    //Supprimer providerName des détails pour éviter la redondance
    const { providerName, ...rest } = details || {};

    //Assigner les détails uniquement s'il y en a
    this.details = Object.keys(rest).length ? rest : undefined;

    //Extraire providerName et conserver le reste en details
    this.providerName = providerName;

    //Gérer la stack si fournie, sinon s'assurer qu'une stack existe
    if (stack) {
      //Affecter la stack fournie
      this.stack = stack;
    } else if (!this.stack) {
      // Capturer la stack trace si elle n'existe pas déjà
      if (typeof Error.captureStackTrace === 'function') {
        //Appeler la fonction pour capturer la stack
        Error.captureStackTrace(this, ProviderError);
      } else {
        //Créer une nouvelle erreur pour obtenir la stack
        this.stack = new Error(message).stack;
      }
    }
  }
}
