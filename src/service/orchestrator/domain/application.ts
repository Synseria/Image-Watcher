import { ImageInformation } from "../../registry/domain/image-information";

/**
 * Interface représentant une application
 */
export interface Application {
  name: string;
  type: 'Deployment' | 'StatefulSet';
  replicas?: number;
  readyReplicas?: number;
  age?: string;
  annotations?: Record<string, string>;
  image?: string;
  namespace?: string;
  createdDate?: Date;
  imageInformation?: ImageInformation
}

