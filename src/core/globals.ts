import createLogger from './logger';

/** Référence à la fonction fetch originale */
const originalFetch = globalThis.fetch;

/**
 * Réecriture globale de fetch pour ajouter du logging
 */
globalThis.fetch = async (url, options = {}, logger = createLogger()) => {
  //Mesure du temps de la requête
  const start = performance.now();

  //Définition des options
  options = {
    ...options
  };

  //Requête originale
  const response = await originalFetch(url, options);

  //Calcul de la durée
  const duration = (performance.now() - start).toFixed(1);

  //Log détaillé de la requête
  logger.trace({ module: 'fetch', method: options.method || 'GET', url, duration: duration, status: response.status }, `${options.method || 'GET'} ${url} - ${response.status} (${duration} ms)`);

  //Retour de la réponse originale
  return response;
};
