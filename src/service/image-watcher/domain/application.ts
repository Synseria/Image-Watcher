import { Application } from '../../orchestrator/domain/application';
import { ApplicationAnnotation } from './annotation';

/**
 * Application enrichie avec les annotations image-watcher
 */
export interface WatchedApplication extends Application {
  parsedAnnotations: ApplicationAnnotation;
  hasImageWatcher: boolean;
}
