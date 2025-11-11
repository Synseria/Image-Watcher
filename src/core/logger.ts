import { relative } from 'path';
import pino from 'pino';
import { cwd } from 'process';
import { fileURLToPath } from 'url';

//Détermine si l'environnement est en développement
const isDev = process.env.NODE_ENV !== 'production';

//Configuration du logger Pino
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname'
        }
      }
    : undefined
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
