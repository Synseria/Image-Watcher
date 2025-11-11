import { describe, expect, it } from 'vitest';
import { isSemver, parseSemver, compareSemver, getNewerTags, getListePatchs, getListeMinors, getListeMajors, isNewerThan, ParsedSemver, analyzeSemverVersions } from '../src/utils/semver-utils';

describe('isSemver()', () => {
  it('détecte un semver valide', () => {
    expect(isSemver('1.2.3')).toBe(true);
  });

  it('détecte un semver avec préfixe', () => {
    expect(isSemver('v1.2.3')).toBe(true);
  });

  it('détecte un semver avec suffixe', () => {
    expect(isSemver('1.2.3-alpha')).toBe(true);
  });

  it('détecte un semver avec préfixe et suffixe', () => {
    expect(isSemver('v1.2.3-beta.1')).toBe(true);
  });

  it('rejette un tag non semver', () => {
    expect(isSemver('latest')).toBe(false);
  });

  it('rejette un tag incomplet', () => {
    expect(isSemver('1.2')).toBe(false);
  });

  it('rejette une chaîne vide', () => {
    expect(isSemver('')).toBe(false);
  });
});

describe('parseSemver()', () => {
  it('parse un semver simple', () => {
    const result = parseSemver('1.2.3');
    expect(result).toEqual({
      original: '1.2.3',
      prefix: '',
      major: 1,
      minor: 2,
      patch: 3,
      suffix: ''
    });
  });

  it('parse un semver avec préfixe v', () => {
    const result = parseSemver('v1.2.3');
    expect(result).toEqual({
      original: 'v1.2.3',
      prefix: 'v',
      major: 1,
      minor: 2,
      patch: 3,
      suffix: ''
    });
  });

  it('parse un semver avec suffixe', () => {
    const result = parseSemver('1.2.3-alpha');
    expect(result).toEqual({
      original: '1.2.3-alpha',
      prefix: '',
      major: 1,
      minor: 2,
      patch: 3,
      suffix: '-alpha'
    });
  });

  it('parse un semver avec préfixe et suffixe', () => {
    const result = parseSemver('v1.2.3-beta.1');
    expect(result).toEqual({
      original: 'v1.2.3-beta.1',
      prefix: 'v',
      major: 1,
      minor: 2,
      patch: 3,
      suffix: '-beta.1'
    });
  });

  it('retourne null pour un tag non semver', () => {
    const result = parseSemver('latest');
    expect(result).toBeNull();
  });

  it('parse des versions majeures > 9', () => {
    const result = parseSemver('15.8.2');
    expect(result?.major).toBe(15);
  });
});

describe('compareSemver()', () => {
  it('compare des versions majeures différentes', () => {
    const a = parseSemver('2.0.0')!;
    const b = parseSemver('1.9.9')!;
    expect(compareSemver(a, b)).toBe(1);
    expect(compareSemver(b, a)).toBe(-1);
  });

  it('compare des versions mineures différentes', () => {
    const a = parseSemver('1.5.0')!;
    const b = parseSemver('1.3.9')!;
    expect(compareSemver(a, b)).toBe(1);
    expect(compareSemver(b, a)).toBe(-1);
  });

  it('compare des versions patch différentes', () => {
    const a = parseSemver('1.2.5')!;
    const b = parseSemver('1.2.3')!;
    expect(compareSemver(a, b)).toBe(1);
    expect(compareSemver(b, a)).toBe(-1);
  });

  it('considère deux versions identiques égales', () => {
    const a = parseSemver('1.2.3')!;
    const b = parseSemver('1.2.3')!;
    expect(compareSemver(a, b)).toBe(0);
  });

  it("considère qu'une release est > qu'une prerelease", () => {
    const release = parseSemver('1.2.3')!;
    const prerelease = parseSemver('1.2.3-alpha')!;
    expect(compareSemver(release, prerelease)).toBe(1);
    expect(compareSemver(prerelease, release)).toBe(-1);
  });

  it('compare deux prereleases', () => {
    const alpha = parseSemver('1.2.3-alpha')!;
    const beta = parseSemver('1.2.3-beta')!;
    expect(compareSemver(beta, alpha)).toBe(1);
    expect(compareSemver(alpha, beta)).toBe(-1);
  });
});

describe('getNewerTags()', () => {
  const tags = ['1.0.0', '1.1.0', '1.2.0', '1.2.1', '2.0.0', '2.1.0', '1.2.0-alpha', '1.2.0-beta'];

  it('récupère les versions plus récentes', () => {
    const newer = getNewerTags('1.1.0', tags);
    expect(newer.length).toBeGreaterThan(0);
    expect(newer.every((v) => compareSemver(v, parseSemver('1.1.0')!) === 1)).toBe(true);
  });

  it('exclut les versions avec suffix différent par défaut', () => {
    const newer = getNewerTags('1.2.0', tags);
    expect(newer.find((v) => v.suffix === '-alpha')).toBeUndefined();
    expect(newer.find((v) => v.suffix === '-beta')).toBeUndefined();
  });

  it('inclut toutes les versions si sameSuffix=false', () => {
    const newer = getNewerTags('1.1.0', tags, false);
    expect(newer.length).toBeGreaterThan(0);
  });

  it('trie les résultats du plus récent au plus ancien', () => {
    const newer = getNewerTags('1.0.0', tags);
    for (let i = 0; i < newer.length - 1; i++) {
      expect(compareSemver(newer[i], newer[i + 1])).toBe(1);
    }
  });
});

describe('getListePatchs()', () => {
  const parsedTags: ParsedSemver[] = [parseSemver('1.2.0')!, parseSemver('1.2.1')!, parseSemver('1.2.2')!, parseSemver('1.3.0')!, parseSemver('2.0.0')!, parseSemver('1.2.2-alpha')!];

  it('récupère uniquement les patches de la même minor', () => {
    const patches = getListePatchs('1.2.0', parsedTags);
    expect(patches.length).toBe(2);
    expect(patches.every((v) => v.major === 1 && v.minor === 2)).toBe(true);
    expect(patches.find((v) => v.patch === 1)).toBeDefined();
    expect(patches.find((v) => v.patch === 2)).toBeDefined();
  });

  it('exclut les versions avec suffix différent par défaut', () => {
    const patches = getListePatchs('1.2.0', parsedTags);
    expect(patches.find((v) => v.suffix === '-alpha')).toBeUndefined();
  });

  it('inclut toutes les versions si samePrerelease=false', () => {
    const patches = getListePatchs('1.2.0', parsedTags, false);
    expect(patches.find((v) => v.patch === 2)).toBeDefined();
  });

  it('retourne un tableau vide si aucune patch plus récente', () => {
    const patches = getListePatchs('1.2.2', parsedTags);
    expect(patches).toEqual([]);
  });

  it('trie du plus récent au plus ancien', () => {
    const patches = getListePatchs('1.2.0', parsedTags);
    for (let i = 0; i < patches.length - 1; i++) {
      expect(patches[i].patch).toBeGreaterThan(patches[i + 1].patch);
    }
  });
});

describe('getListeMinors()', () => {
  const parsedTags: ParsedSemver[] = [parseSemver('1.2.0')!, parseSemver('1.3.0')!, parseSemver('1.3.1')!, parseSemver('1.4.0')!, parseSemver('2.0.0')!, parseSemver('1.3.0-alpha')!];

  it('récupère uniquement les minors de la même major', () => {
    const minors = getListeMinors('1.2.0', parsedTags);
    expect(minors.length).toBeGreaterThan(0);
    expect(minors.every((v) => v.major === 1 && v.minor > 2)).toBe(true);
  });

  it('inclut toutes les patches des minors', () => {
    const minors = getListeMinors('1.2.0', parsedTags);
    expect(minors.find((v) => v.minor === 3 && v.patch === 0)).toBeDefined();
    expect(minors.find((v) => v.minor === 3 && v.patch === 1)).toBeDefined();
  });

  it("exclut les versions d'une major différente", () => {
    const minors = getListeMinors('1.2.0', parsedTags);
    expect(minors.find((v) => v.major === 2)).toBeUndefined();
  });

  it('retourne un tableau vide si aucune minor plus récente', () => {
    const minors = getListeMinors('1.4.0', parsedTags);
    expect(minors).toEqual([]);
  });
});

describe('getListeMajors()', () => {
  const parsedTags: ParsedSemver[] = [parseSemver('1.2.0')!, parseSemver('2.0.0')!, parseSemver('2.1.0')!, parseSemver('3.0.0')!, parseSemver('3.1.0')!, parseSemver('2.0.0-alpha')!];

  it('récupère uniquement les majors supérieures', () => {
    const majors = getListeMajors('1.2.0', parsedTags);
    expect(majors.length).toBeGreaterThan(0);
    expect(majors.every((v) => v.major > 1)).toBe(true);
  });

  it('inclut toutes les minors/patches des majors', () => {
    const majors = getListeMajors('1.2.0', parsedTags);
    expect(majors.find((v) => v.major === 2 && v.minor === 0)).toBeDefined();
    expect(majors.find((v) => v.major === 2 && v.minor === 1)).toBeDefined();
  });

  it('retourne un tableau vide si aucune major plus récente', () => {
    const majors = getListeMajors('3.1.0', parsedTags);
    expect(majors).toEqual([]);
  });
});

describe('isNewerThan()', () => {
  it('considère une version plus récente', () => {
    const v1 = parseSemver('1.2.3')!;
    const v2 = parseSemver('1.2.2')!;
    expect(isNewerThan(v1, v2, true)).toBe(true);
    expect(isNewerThan(v2, v1, true)).toBe(false);
  });

  it('ignore le suffix si samePrerelease=false', () => {
    const v1 = parseSemver('1.2.3-alpha')!;
    const v2 = parseSemver('1.2.2')!;
    expect(isNewerThan(v1, v2, false)).toBe(true);
  });

  it('considère le suffix si samePrerelease=true', () => {
    const release = parseSemver('1.2.3')!;
    const prerelease = parseSemver('1.2.3-alpha')!;

    // Avec samePrerelease=true, on ne peut comparer que des versions avec le même suffix
    expect(isNewerThan(release, prerelease, true)).toBe(false); // suffixes différents
    expect(isNewerThan(prerelease, release, true)).toBe(false); // suffixes différents

    // Comparaison avec le même suffix
    const alpha1 = parseSemver('1.2.3-alpha')!;
    const alpha2 = parseSemver('1.2.2-alpha')!;
    expect(isNewerThan(alpha1, alpha2, true)).toBe(true); // même suffix, version plus récente
    expect(isNewerThan(alpha2, alpha1, true)).toBe(false); // même suffix, version plus ancienne
  });
});

describe('Scénarios réels', () => {
  it('gère correctement les versions de Kubernetes', () => {
    const current = 'v1.28.0';
    const tags = ['v1.27.0', 'v1.28.0', 'v1.28.1', 'v1.29.0', 'v2.0.0'];

    const patches = getListePatchs(current, tags.map(parseSemver).filter(Boolean) as ParsedSemver[]);
    expect(patches.length).toBe(1);
    expect(patches[0].patch).toBe(1);

    const minors = getListeMinors(current, tags.map(parseSemver).filter(Boolean) as ParsedSemver[]);
    expect(minors.length).toBe(1);
    expect(minors[0].minor).toBe(29);

    const majors = getListeMajors(current, tags.map(parseSemver).filter(Boolean) as ParsedSemver[]);
    expect(majors.length).toBe(1);
    expect(majors[0].major).toBe(2);
  });

  it('gère correctement les versions avec préfixes', () => {
    const versions = ['v1.0.0', 'v1.1.0', 'v2.0.0'].map(parseSemver).filter(Boolean) as ParsedSemver[];
    expect(versions.every((v) => v.prefix === 'v')).toBe(true);
  });

  it('gère correctement les prereleases', () => {
    const tags = ['1.0.0', '1.0.1-alpha', '1.0.1-beta', '1.0.1'];
    const newer = getNewerTags('1.0.0', tags, false);
    expect(newer.length).toBe(3);
  });
});

describe('analyzeSemverVersions()', () => {
  const availableTags = ['1.0.0', '1.1.0', '1.1.1', '1.2.0', '1.2.1', '2.0.0', '2.1.0', '3.0.0', '1.2.0-alpha', '1.2.0-beta'];

  it('catégorise correctement les versions (patch, minor, major)', () => {
    const result = analyzeSemverVersions('1.0.0', availableTags);

    expect(result.patches.length).toBe(0); // Pas de patch pour 1.0.x
    expect(result.minors.length).toBeGreaterThan(0); // 1.1.x, 1.2.x
    expect(result.majors.length).toBeGreaterThan(0); // 2.x, 3.x
    expect(result.all.length).toBeGreaterThan(0);
  });

  it('filtre les versions avec suffix différent par défaut', () => {
    const result = analyzeSemverVersions('1.0.0', availableTags);

    // Les versions alpha/beta ne doivent pas être incluses
    expect(result.all.find((v) => v.suffix === '-alpha')).toBeUndefined();
    expect(result.all.find((v) => v.suffix === '-beta')).toBeUndefined();
  });

  it('inclut les versions avec suffix si sameSuffix=false', () => {
    const result = analyzeSemverVersions('1.0.0', availableTags, false);

    // Toutes les versions doivent être incluses
    expect(result.all.length).toBeGreaterThan(7);
  });

  it('retourne des tableaux vides si aucune version plus récente', () => {
    const result = analyzeSemverVersions('99.99.99', availableTags);

    expect(result.all).toEqual([]);
    expect(result.patches).toEqual([]);
    expect(result.minors).toEqual([]);
    expect(result.majors).toEqual([]);
  });

  it('gère les versions avec préfixe v', () => {
    const tagsWithV = ['v1.0.0', 'v1.1.0', 'v2.0.0'];
    const result = analyzeSemverVersions('v1.0.0', tagsWithV);

    expect(result.all.every((v) => v.prefix === 'v')).toBe(true);
  });

  it('déduplique les versions avec/sans préfixe v', () => {
    const mixedTags = ['1.1.0', 'v1.1.0', '1.2.0', 'v1.2.0'];
    const result = analyzeSemverVersions('1.0.0', mixedTags);

    // Seules les versions avec "v" doivent rester
    expect(result.all.length).toBe(2);
    expect(result.all.every((v) => v.prefix === 'v')).toBe(true);
  });

  it('ne retourne que les patches de la même minor', () => {
    const result = analyzeSemverVersions('1.1.0', availableTags);

    expect(result.patches.length).toBe(1);
    expect(result.patches[0].original).toBe('1.1.1');
  });

  it('ne retourne que les minors de la même major', () => {
    const result = analyzeSemverVersions('1.0.0', availableTags);

    const minors = result.minors;
    expect(minors.every((v) => v.major === 1 && v.minor > 0)).toBe(true);
    expect(minors.find((v) => v.major === 2)).toBeUndefined();
  });

  it('retourne toutes les versions des majors supérieures', () => {
    const result = analyzeSemverVersions('1.0.0', availableTags);

    const majors = result.majors;
    expect(majors.length).toBeGreaterThan(0);
    expect(majors.every((v) => v.major > 1)).toBe(true);
    expect(majors.find((v) => v.original === '2.0.0')).toBeDefined();
    expect(majors.find((v) => v.original === '2.1.0')).toBeDefined();
    expect(majors.find((v) => v.original === '3.0.0')).toBeDefined();
  });

  it('trie les résultats du plus récent au plus ancien', () => {
    const result = analyzeSemverVersions('1.0.0', availableTags);

    // Vérification du tri de 'all'
    for (let i = 0; i < result.all.length - 1; i++) {
      const a = result.all[i];
      const b = result.all[i + 1];

      expect(a.major > b.major || (a.major === b.major && a.minor > b.minor) || (a.major === b.major && a.minor === b.minor && a.patch > b.patch)).toBe(true);
    }
  });

  describe('Scénarios réels', () => {
    it('gère les versions Kubernetes', () => {
      const kubeTags = ['v1.27.0', 'v1.27.1', 'v1.28.0', 'v1.28.1', 'v1.29.0'];
      const result = analyzeSemverVersions('v1.27.0', kubeTags);

      expect(result.patches.length).toBe(1); // v1.27.1
      expect(result.minors.length).toBe(3); // v1.28.0, v1.28.1, v1.29.0
      expect(result.majors.length).toBe(0); // Pas de v2.x
    });

    it('gère les versions Node.js', () => {
      const nodeTags = ['18.0.0', '18.1.0', '18.2.0', '20.0.0', '20.1.0'];
      const result = analyzeSemverVersions('18.0.0', nodeTags);

      expect(result.patches.length).toBe(0);
      expect(result.minors.length).toBe(2); // 18.1.0, 18.2.0
      expect(result.majors.length).toBe(2); // 20.0.0, 20.1.0
    });

    it('gère les versions avec prereleases', () => {
      const tags = ['1.0.0', '1.1.0-alpha', '1.1.0-beta', '1.1.0-rc1', '1.1.0'];

      const result = analyzeSemverVersions('1.0.0', tags, false);
      expect(result.all.length).toBe(4);

      const resultFiltered = analyzeSemverVersions('1.0.0', tags, true);
      expect(resultFiltered.all.length).toBe(1); // Seulement 1.1.0
    });
  });

  describe('Cas limites', () => {
    it('gère une version courante non semver', () => {
      const result = analyzeSemverVersions('latest', availableTags);

      expect(result.all).toEqual([]);
      expect(result.patches).toEqual([]);
      expect(result.minors).toEqual([]);
      expect(result.majors).toEqual([]);
    });

    it('gère une liste de tags vide', () => {
      const result = analyzeSemverVersions('1.0.0', []);

      expect(result.all).toEqual([]);
      expect(result.patches).toEqual([]);
      expect(result.minors).toEqual([]);
      expect(result.majors).toEqual([]);
    });

    it('gère des tags non semver dans la liste', () => {
      const mixedTags = ['1.0.0', 'latest', '1.1.0', 'stable', '1.2.0'];
      const result = analyzeSemverVersions('1.0.0', mixedTags);

      expect(result.all.length).toBe(2); // 1.1.0, 1.2.0
    });
  });
});
