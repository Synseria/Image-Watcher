/**
 * Enumération des annotations image-watcher
 */
export const TypeAnnotation = {
  WATCH: 'image-watcher/watch',
  MODE: 'image-watcher/mode',
  STRATEGY: 'image-watcher/strategy',
  LAST_UPDATED: 'image-watcher/last-updated',
  LAST_UPDATED_VERSION: 'image-watcher/last-updated-version',
  LAST_NOTIFIED: 'image-watcher/last-notified',
  LAST_NOTIFIED_VERSION: 'image-watcher/last-notified-version',
  PREVIOUS_VERSION: 'image-watcher/previous-version',
  CURRENT_VERSION: 'image-watcher/current-version',
  RELEASE_URL: 'image-watcher/release-url',
  TOKEN_UPDATE: 'image-watcher/token-update',
} as const;

// eslint-disable-next-line no-redeclare
export type TypeAnnotation = typeof TypeAnnotation[keyof typeof TypeAnnotation];

/**
 * Enumération des modes
 */
export const TypeMode = {
  AUTO_UPDATE: 'AUTO_UPDATE',
  NOTIFICATION: 'NOTIFICATION',
  DISABLED: 'DISABLED',
  DEFAULT: 'DEFAULT',
} as const;

// eslint-disable-next-line no-redeclare
export type TypeMode = typeof TypeMode[keyof typeof TypeMode];

/**
 * Stratégie de mise à jour
 */
export const TypeStrategy = {
  ALL: 'ALL',
  MAJOR: 'MAJOR',
  MINOR: 'MINOR',
  PATCH: 'PATCH',
} as const;
// eslint-disable-next-line no-redeclare
export type TypeStrategy = typeof TypeStrategy[keyof typeof TypeStrategy];

/**
 * Enumération des notifications
 */
export const TypeParam = {
  INTERNAL: 'INTERNAL',
  CONFIGURATION: 'CONFIGURATION'
} as const;

// eslint-disable-next-line no-redeclare
export type TypeParam = typeof TypeParam[keyof typeof TypeParam];

/**
 * Interface représentant les annotations pour une application
 */
export interface ApplicationAnnotation {
  /** Données */
  [TypeAnnotation.WATCH]?: boolean;
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
