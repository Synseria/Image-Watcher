
/**
 * Type standard pour représenter une image Docker depuis n'importe quel registre
 */
export type ImageInformation = {
  repository?: string;
  registry?: string;
  tag?: string;
  digest?: string;
  lastUpdate?: Date;
  size?: number;
};
