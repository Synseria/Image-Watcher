import { IProvider } from "./i-provider";

/**
 * Interface de base pour un fournisseur
 */
export abstract class ServiceProvider {
  /** Fournisseurs enregistrés */
  protected abstract readonly providers: Map<string, IProvider>;

  /** Nom unique du fournisseur */
  protected abstract initializeProviders(providers: IProvider[]): void;

  /** Récupération d'un provider par son nom (Ou via d'autres critères) */
  protected abstract getProvider(name?: string): IProvider;
}
