import { relative } from 'path';
import pino from 'pino';
import { cwd, env } from 'process';
import { fileURLToPath } from 'url';

//Définition du format
const LOG_FORMAT: 'json' | 'pretty' = env.LOG_FORMAT && ['json', 'pretty'].includes(env.LOG_FORMAT.toLowerCase()) ? (env.LOG_FORMAT.toLowerCase() as 'json' | 'pretty') : 'pretty';

//Définition du niveau de log
const LOG_LEVEL: string = env.LOG_LEVEL || 'info';

//Configuration du logger Pino
const logger = pino({
  level: LOG_LEVEL,
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
  transport: LOG_FORMAT === 'pretty' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname'
    }
  } : undefined
});

/**
 * Lecture du fichier d'appel
 */
function getCallerFile(): string {
  //Création d'une erreur pour capturer la pile d'appels
  const err = new Error();

  //Extraction de la pile d'appels
  const stack = err.stack?.split('\n');

  //Ignore tout ce qui est ts-node / internal / node_modules
  const lastLine = stack?.reverse().find((line) => line.includes('/') && !line.includes('ts-node') && !line.includes('internal') && !line.includes('logger') && !line.includes('node_modules') && !line.includes('pino'));

  //Vérification de la dernière ligne
  if (!lastLine)
    //Si aucune ligne trouvée, retourne 'unknown'
    return 'unknown';

  //Extraction du chemin du fichier à partir de la ligne
  const match = lastLine.match(/(\/[^\s)]+)/);

  //Retourne le chemin du fichier ou 'unknown'
  return match ? match[1] : 'unknown';
}

/**
 * Crée un logger Pino avec des métadonnées spécifiques au module.
 */
export default function createLogger(importMeta?: ImportMeta): pino.Logger {
  let file: string;

  //Vérification de la présence de importMeta
  if (importMeta?.url)
    //Conversion de l'URL du module en chemin de fichier
    file = fileURLToPath(importMeta.url);
  else
    //Récupération du fichier d'appel
    file = getCallerFile();

  //Suppression du chemin absolu pour ne garder que le chemin relatif
  const relativeFile = relative(cwd(), file) || '';

  //Retourne un logger enfant avec le fichier en métadonnée
  return logger.child({ name: relativeFile?.split('/')?.pop()?.split(':')[0] });
}
