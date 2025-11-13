import { format, relative } from 'path';
import pino from 'pino';
import { cwd, env } from 'process';
import { fileURLToPath } from 'url';
import { toISOStringWithTZ } from '../utils/date-utils';
import PinoPretty from 'pino-pretty';

//Définition du format
const LOG_FORMAT: 'json' | 'pretty' = env.LOG_FORMAT && ['json', 'pretty'].includes(env.LOG_FORMAT.toLowerCase()) ? (env.LOG_FORMAT.toLowerCase() as 'json' | 'pretty') : 'pretty';

//Définition du niveau de log
const LOG_LEVEL: string = env.LOG_LEVEL || 'info';

//Définition du nom de l'application
const APP_NAME = env.APP_NAME || 'image-watcher';

const OTEL_ENABLED = env.OTEL_ENABLED === 'true' || false;

//Définition du fuseau horaire
const TZ = env.TZ || 'Europe/Paris';

//Configuration du logger Pino
const logger = pino({
  level: LOG_LEVEL,
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: {
    targets: [LOG_FORMAT === 'pretty' ?
      {
        target: 'pino-pretty',
        options: {
          colorize: true,
          messageFormat: `[{module}] {msg}`,
          translateTime: 'HH:MM:ss',
          ignore: 'app,module',
        }
      } : {
        target: 'pino/file',
        options: {
          destination: 1
        }
      },
    OTEL_ENABLED ? {
      target: 'pino-opentelemetry-transport',
    } : undefined
    ].filter(Boolean),
  },
  base: {
    app: APP_NAME,
  },
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
    user: (user) => {
      return {
        id: user.idUser,
        name: user.name,
      }
    },
  }
});

/**
 * Crée un logger Pino avec des métadonnées spécifiques au module.
 */
export default function createLogger(importMeta: ImportMeta): pino.Logger {
  //Suppression du chemin absolu pour ne garder que le chemin relatif
  const relativeFile = importMeta.filename?.split('/')?.pop() || '';

  //Retourne un logger enfant avec le fichier en métadonnée
  return logger.child({ module: relativeFile });
}
