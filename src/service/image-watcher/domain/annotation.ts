/**
 * Enumération des annotations image-watcher
 */
export const TypeAnnotation = {
  WATCH: 'image-watcher/watch',
  MODE: 'image-watcher/mode',
  STRATEGY: 'image-watcher/strategy',
  CURRENT_VERSION: 'image-watcher/current-version',
  RELEASE_URL: 'image-watcher/release-url',
} as const;

// eslint-disable-next-line no-redeclare
export type TypeAnnotation = typeof TypeAnnotation[keyof typeof TypeAnnotation];

/**
 * Enumération des modes
 */
export const TypeMode = {
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
 * Enumération des types de paramètres
 */
export const TypeParam = {
  CONFIGURATION: 'CONFIGURATION'
} as const;

// eslint-disable-next-line no-redeclare
export type TypeParam = typeof TypeParam[keyof typeof TypeParam];

/**
 * Interface représentant les annotations pour une application
 */
export interface ApplicationAnnotation {
  [TypeAnnotation.WATCH]?: boolean;
  [TypeAnnotation.MODE]: TypeMode;
  [TypeAnnotation.STRATEGY]: TypeStrategy;
  [TypeAnnotation.CURRENT_VERSION]?: string;
  [TypeAnnotation.RELEASE_URL]?: string;
}

/**
 * Interface representant les meta données d'une annotation
 */
export interface AnnotationMeta {
  description: string;
  default?: TypeMode | TypeStrategy | boolean;
  options?: TypeMode[] | TypeStrategy[] | boolean[];
  type: TypeParam;
}
