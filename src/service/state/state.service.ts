import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { env } from 'process';
import { injectable, singleton } from 'tsyringe';
import createLogger from '../../core/logger';

/** Création du logger pour ce module **/
const logger = createLogger(import.meta);

/** Chemin par défaut du fichier d'état */
const DEFAULT_STATE_FILE = 'data/state.json';

export interface PersistedEntry {
  version: string;
  notifiedAt: string;
}

export interface NotificationState {
  version: string;
  notifiedAt: Date;
}

/**
 * Service de persistance de l'état des notifications sur disque (JSON).
 * Survit aux redémarrages du pod si un PVC est monté sur le répertoire cible.
 */
@injectable()
@singleton()
export class StateService {
  /** Chemin vers le fichier d'état */
  private readonly filePath: string;

  /** Données en mémoire */
  private readonly store: Map<string, PersistedEntry>;

  constructor() {
    this.filePath = env.IMAGE_WATCHER_STATE_FILE || DEFAULT_STATE_FILE;
    this.store = this.load();

    //Log
    logger.info(`StateService initialisé (fichier: ${this.filePath}, ${this.store.size} entrée(s) chargée(s)).`);
  }

  /**
   * Récupération d'une entrée de l'état par clé
   */
  get(key: string): NotificationState | undefined {
    //Lecture de l'entrée
    const entry = this.store.get(key);

    //Retour si non trouvé
    if (!entry) return undefined;

    //Retour de l'état désérialisé
    return { version: entry.version, notifiedAt: new Date(entry.notifiedAt) };
  }

  /**
   * Mise à jour d'une entrée de l'état
   */
  set(key: string, state: NotificationState): void {
    //Persistance en mémoire
    this.store.set(key, { version: state.version, notifiedAt: state.notifiedAt.toISOString() });

    //Sauvegarde sur disque
    this.save();
  }

  /**
   * Retourne toutes les entrées de l'état sous forme d'objet sérialisable
   */
  getAll(): Record<string, PersistedEntry> {
    //Retour de l'état sérialisé
    return Object.fromEntries(this.store.entries());
  }

  /**
   * Chargement de l'état depuis le fichier JSON
   */
  private load(): Map<string, PersistedEntry> {
    try {
      if (existsSync(this.filePath)) {
        //Lecture du fichier
        const raw = readFileSync(this.filePath, 'utf-8');

        //Désérialisation
        const data: Record<string, PersistedEntry> = JSON.parse(raw);

        //Retour de la Map
        return new Map(Object.entries(data));
      }
    } catch (err) {
      //Log
      logger.warn(err, `Impossible de charger l'état depuis "${this.filePath}", démarrage avec un état vide.`);
    }

    //Retour d'une Map vide
    return new Map();
  }

  /**
   * Sauvegarde de l'état dans le fichier JSON
   */
  private save(): void {
    try {
      //Création du répertoire si nécessaire
      mkdirSync(dirname(this.filePath), { recursive: true });

      //Sérialisation et écriture
      const data = Object.fromEntries(this.store.entries());
      writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      //Log
      logger.error(err, `Impossible de sauvegarder l'état dans "${this.filePath}".`);
    }
  }
}
