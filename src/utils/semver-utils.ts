/** Regex Semver */
const SEMVER_REGEX = /^([^0-9]*)(\d+)\.(\d+)\.(\d+)(.*)?$/;

/**
 * Interface ParsedSemver
 */
export interface ParsedSemver {
  original: string;
  prefix: string;
  major: number;
  minor: number;
  patch: number;
  suffix: string;
}

/**
 * Vérifie si un tag ressemble à un SemVer
 */
export function isSemver(tag: string): boolean {
  //Vérification
  return SEMVER_REGEX.test(tag);
}

/**
 * Parse un tag SemVer
 */
export function parseSemver(tag: string): ParsedSemver | null {
  //Vérification de la présence d'un tag semver
  const match = tag?.match(SEMVER_REGEX);

  //Vérification du résultat
  if (!match)
    //Retour
    return null;

  //Découpage de la version
  const [, prefix, major, minor, patch, suffix] = match;

  //Retour
  return {
    original: tag,
    prefix: prefix || '',
    major: Number(major),
    minor: Number(minor),
    patch: Number(patch),
    suffix: suffix || ''
  };
}

/**
 * Récupère les versions plus récentes dans la même "famille"
 */
export function getNewerTags(currenTag: string, listeTags: string[], sameSuffix: boolean = true): ParsedSemver[] {
  //Parsing du tag courant
  const parsedTag = parseSemver(currenTag);

  //Parsing de la liste des tags
  const listeParseds = listeTags.map(parseSemver).filter(Boolean) as ParsedSemver[];

  //Itération sur la liste des tags
  return listeParseds
    .filter((v) => {
      //Vérification de la présence du samePrerelease et de deux prerelease différente
      if (sameSuffix && v.suffix !== parsedTag?.suffix)
        //suffix différent
        return false;

      //Comparaison des samePrerelease si le pre release est à false
      const comp = sameSuffix ? compareSemver(v, parsedTag) : compareSemver({ ...v, suffix: null }, { ...parsedTag, suffix: null });

      //Retour
      return comp === 1;
    })
    .sort((a, b) => compareSemver({ ...b, suffix: sameSuffix ? b.suffix : null }, { ...a, suffix: sameSuffix ? a.suffix : null }));
}

/**
 * getListePatches : mêmes major + minor, patch > current.patch
 */
export function getListePatchs(currentTag: string, listeTags: ParsedSemver[], samePrerelease: boolean = true): ParsedSemver[] {
  const current = parseSemver(currentTag);

  //Vérification du tag courant
  if (!current)
    //Retour d'un tableau vide
    return [];

  //Filtrage de la liste
  const filtered = listeTags.filter((v) => v.major === current.major && v.minor === current.minor && isNewerThan(v, current, samePrerelease));

  //Tri de la liste (du plus récent au plus ancien)
  return filtered.sort((a, b) => {
    //Vérification du suffix
    if (!samePrerelease)
      //Comparaison sans suffix (b - a pour ordre décroissant)
      return compareSemver({ ...b, suffix: '' }, { ...a, suffix: '' });

    //Comparaison avec suffix (b - a pour ordre décroissant)
    return compareSemver(b, a);
  });
}

/**
 * getListeMinors : mêmes major, minor > current.minor (inclut toutes les patches de ces minors)
 */
export function getListeMinors(currentTag: string, listeTags: ParsedSemver[], samePrerelease: boolean = false): ParsedSemver[] {
  const current = parseSemver(currentTag);

  //Vérification du tag courant
  if (!current)
    //Retour d'un tableau vide
    return [];

  //Filtrage de la liste
  const filtered = listeTags.filter((v) => v.major === current.major && v.minor > current.minor && isNewerThan(v, current, samePrerelease));

  //Tri de la liste (du plus récent au plus ancien)
  return filtered.sort((a, b) => {
    //Vérification du suffix
    if (!samePrerelease)
      //Comparaison sans suffix (b - a pour ordre décroissant)
      return compareSemver({ ...b, suffix: '' }, { ...a, suffix: '' });

    //Comparaison avec suffix (b - a pour ordre décroissant)
    return compareSemver(b, a);
  });
}

/**
 * getListeMajors : major > current.major (inclut tous les minors/patches)
 */
export function getListeMajors(currentTag: string, listeTags: ParsedSemver[], samePrerelease: boolean = false): ParsedSemver[] {
  const current = parseSemver(currentTag);

  //Vérification du tag courant
  if (!current)
    //Retour d'un tableau vide
    return [];

  //Filtrage de la liste
  const filtered = listeTags.filter((v) => v.major > current.major && isNewerThan(v, current, samePrerelease));

  //Tri de la liste (du plus récent au plus ancien)
  return filtered.sort((a, b) => {
    //Vérification du suffix
    if (!samePrerelease)
      //Comparaison sans suffix (b - a pour ordre décroissant)
      return compareSemver({ ...b, suffix: '' }, { ...a, suffix: '' });

    //Comparaison avec suffix (b - a pour ordre décroissant)
    return compareSemver(b, a);
  });
}

/**
 * Helper : compare en tenant compte (ou pas) du suffix (prerelease)
 */
export function isNewerThan(v: ParsedSemver, base: ParsedSemver, samePrerelease: boolean): boolean {
  //Vérification du suffix
  if (samePrerelease) {
    //Si on veut le même suffix, on vérifie d'abord qu'ils sont identiques
    if (v.suffix !== base.suffix) return false;

    //Comparaison avec suffix
    return compareSemver(v, base) === 1;
  } else {
    //Suppression du suffix
    const va = { ...v, suffix: '' };
    const ba = { ...base, suffix: '' };

    //Comparaison
    return compareSemver(va, ba) === 1;
  }
}

/**
 * Compare deux SemVer
 */
export function compareSemver(a: ParsedSemver, b: ParsedSemver): number {
  //Vérification des version Majeur
  if (a.major !== b.major)
    //Retour de la version
    return a.major > b.major ? 1 : -1;

  //Vérification de la version mineur
  if (a.minor !== b.minor)
    //Retour de la version
    return a.minor > b.minor ? 1 : -1;

  //Vérification de la version patch
  if (a.patch !== b.patch)
    //Retour de la version
    return a.patch > b.patch ? 1 : -1;

  //Comparaison des pre-releases
  if (!a.suffix && !b.suffix)
    //Comparaison des pre-releases
    return 0;

  //Vérification de la pre-release
  if (!a.suffix && b.suffix)
    //Comparaison des pre-releases
    return 1;

  // Vérification de la pre-release
  if (a.suffix && !b.suffix)
    //Retour
    return -1;

  //Comparaison de la prerelease
  return a.suffix! > b.suffix! ? 1 : -1;
}

/**
 * Analyse et catégorise les mises à jour semver disponibles
 */
export function analyzeSemverVersions(currentVersion: string, availableTags: string[], sameSuffix = true): { all: ParsedSemver[]; majors: ParsedSemver[]; minors: ParsedSemver[]; patches: ParsedSemver[] } {
  // Récupération des versions plus récentes
  let newerVersions = getNewerTags(currentVersion, availableTags, sameSuffix);

  // Construction d'un Set des versions qui existent avec un préfixe "v"
  const hasVPrefix = new Set(newerVersions.filter((v) => v.prefix === 'v').map((v) => `${v.major}.${v.minor}.${v.patch}${v.suffix ?? ''}`));

  // Filtre : on supprime les versions sans "v" si leur équivalent avec "v" existe
  newerVersions = newerVersions.filter((v) => {
    const key = `${v.major}.${v.minor}.${v.patch}${v.suffix ?? ''}`;
    // Si une version "v" équivalente existe, on retire celle sans prefixe
    if (v.prefix !== 'v' && hasVPrefix.has(key)) return false;
    return true;
  });

  // Aucune version plus récente
  if (newerVersions.length === 0) {
    return {
      all: [],
      majors: [],
      minors: [],
      patches: []
    };
  }

  // Récupération des différentes catégories
  const majors = getListeMajors(currentVersion, newerVersions, true) || [];
  const minors = getListeMinors(currentVersion, newerVersions, true) || [];
  const patches = getListePatchs(currentVersion, newerVersions, true) || [];

  return {
    all: newerVersions,
    majors,
    minors,
    patches
  };
}
