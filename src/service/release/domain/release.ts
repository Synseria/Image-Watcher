
/**
 * Interface représentant les informations d'une releases.
 */
export interface ReleaseInfo {
  provider: string;
  name: string;
  version: string;
  url: string;
  author: string;
  avatarUrl?: string;
  publishedAt: Date;
  changelog: string;
}
