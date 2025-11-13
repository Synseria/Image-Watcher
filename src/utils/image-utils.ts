/**
 * Parsing d'une image
 */
export function parseImageName(imageName: string): { registry: string; repository: string; tag: string; digest?: string } {
  let registry = 'docker.io';
  let namePart = imageName;
  let tag = 'latest';
  let digest: string | undefined = undefined;

  //Vérification de la présence du digest
  if (imageName.includes('@')) {
    //Découpage du nom
    const [ref, dg] = imageName.split('@');

    //Découpage de la référence (récursif)
    const parsed = parseImageName(ref);

    //Retour des informations avec le digest
    return { ...parsed, digest: dg };
  }

  //Vérification de la présence d'un registre explicite
  const segments = namePart.split('/');

  //Vérification du premier segment
  if (segments.length > 1 && (segments[0].includes('.') || segments[0].includes(':'))) {
    //Le premier segment est le registry
    registry = segments.shift()!;

    //Reconstruction du namePart
    namePart = segments.join('/');
  }

  //Vérification de la présence d'un tag (après avoir extrait le registry)
  if (namePart.includes(':')) {
    //Lecture du tag
    const lastColonIndex = namePart.lastIndexOf(':');

    //Extraction du tag et du nom
    tag = namePart.substring(lastColonIndex + 1) || 'latest';

    //Mise à jour du namePart
    namePart = namePart.substring(0, lastColonIndex);
  }

  //Le reste est le repository
  const repository = namePart;

  //Retour des informations
  return { registry, repository, tag, digest };
}
