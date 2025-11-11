/**
 * Enumération des annotations image-watcher
 */
export enum TypeAnnotation {
  MODE = 'image-watcher/mode',
  STRATEGY = 'image-watcher/strategy',
  LAST_UPDATED = 'image-watcher/last-updated',
  LAST_UPDATED_VERSION = 'image-watcher/last-updated-version',
  LAST_NOTIFIED = 'image-watcher/last-notified',
  LAST_NOTIFIED_VERSION = 'image-watcher/last-notified-version',
  PREVIOUS_VERSION = 'image-watcher/previous-version',
  CURRENT_VERSION = 'image-watcher/current-version',
  RELEASE_URL = 'image-watcher/release-url',
  TOKEN_UPDATE = 'image-watcher/token-update'
}

/**
 * Enumération des modes
 */
export enum TypeMode {
  AUTO_UPDATE = 'AUTO_UPDATE',
  NOTIFICATION = 'NOTIFICATION',
  DISABLED = 'DISABLED',
  DEFAULT = 'DEFAULT'
}

/**
 * Stratégie de mise à jour
 */
export enum TypeStrategy {
  ALL = 'ALL',
  MAJOR = 'MAJOR',
  MINOR = 'MINOR',
  PATCH = 'PATCH'
}

/**
 * Enumération des notificationq
 */
export enum TypeParam {
  INTERNAL = 'INTERNAL',
  CONFIGURATION = 'CONFIGURATION'
}

/**
 * Interface représentant les annotations pour une application
 */
export interface ApplicationAnnotation {
  /** Données */
  [TypeAnnotation.MODE]: TypeMode;
  [TypeAnnotation.STRATEGY]: TypeStrategy;
  [TypeAnnotation.CURRENT_VERSION]?: string;
  [TypeAnnotation.PREVIOUS_VERSION]?: string;
  [TypeAnnotation.LAST_UPDATED]?: Date;
  [TypeAnnotation.LAST_UPDATED_VERSION]?: string;
  [TypeAnnotation.LAST_NOTIFIED]?: Date;
  [TypeAnnotation.LAST_NOTIFIED_VERSION]?: string;
  [TypeAnnotation.TOKEN_UPDATE]?: string;
  [TypeAnnotation.RELEASE_URL]?: string;
}

/**
 * Interface representant les meta données d'une annotation
 */
export interface AnnotationMeta {
  /** Données */
  description: string;
  default?: TypeMode | TypeStrategy | boolean;
  options?: TypeMode[] | TypeStrategy[] | boolean[];
  type: TypeParam;
}
