import { AppsV1Api, CoreV1Api, KubeConfig, V1Deployment, V1StatefulSet } from '@kubernetes/client-node';
import { injectable, singleton } from 'tsyringe';
import { ApplicationAnnotation } from '../../image-watcher/domain/annotation';
import { Application } from '../domain/application';
import { IOrchestratorProvider, OrchestratorUnavailableError } from '../domain/i-orchestrator-provider';
import { DateTime } from 'luxon';

/**
 * Provider Kubernetes
 */
@injectable()
@singleton()
export class KubeProvider implements IOrchestratorProvider {
  /** Nom du provider */
  readonly providerName = 'Kubernetes';

  /** Configuration kube */
  private kc: KubeConfig;
  private coreV1: CoreV1Api;
  private appsV1: AppsV1Api;

  /** Constructeur */
  constructor() {
    //Initialisation de la configuration kube
    this.kc = new KubeConfig();

    //Chargement depuis la configuration par défaut
    this.kc.loadFromDefault();

    //Définition des API clients
    this.coreV1 = this.kc.makeApiClient(CoreV1Api);
    this.appsV1 = this.kc.makeApiClient(AppsV1Api);
  }

  /**
   * Vérifie si la configuration minimale est renseignée
   */
  isConfigured(): boolean {
    //Vérifie que la configuration kube est initialisée
    return !!this.kc && !!this.coreV1 && !!this.appsV1;
  }

  /**
   * Vérifie la disponibilité réelle du cluster Kubernetes
   */
  async isAvailable(): Promise<boolean> {
    //Vérifie la configuration
    if (!this.isConfigured())
      //Si la configuration n'est pas complète, le cluster n'est pas disponible
      return false;

    try {
      //Test simple pour récupérer les contextes
      this.kc.getContexts();

      //Cluster accessible
      return true;
    } catch (err: any) {
      //Cluster inaccessible
      throw new OrchestratorUnavailableError(err.message, err.details || { providerName: this.providerName });
    }
  }

  /**
   * Liste des applications (Deployment et StatefulSet)
   */
  async getApplications(): Promise<Application[]> {
    //Récupération des namespaces
    const namespaces = await this.getNamespaces();

    //Récupération des applications dans tous les namespaces
    const allApps = await Promise.all(
      //Itération sur les namespaces
      namespaces.map(async (namespace) => {
        try {
          //Récupération des Deployments et StatefulSets
          const [deploymentsRes, statefulSetsRes] = await Promise.all([this.appsV1.listNamespacedDeployment({ namespace }), this.appsV1.listNamespacedStatefulSet({ namespace })]);

          //Formatage des Deployments
          const formatDeployment = (d: V1Deployment): Application => ({
            name: d.metadata?.name ?? 'inconnu',
            type: 'Deployment',
            replicas: d.spec?.replicas ?? 0,
            readyReplicas: d.status?.readyReplicas ?? 0,
            age: this.ageFromTimestamp(d.metadata?.creationTimestamp),
            annotations: d.metadata?.annotations ?? {},
            image: d.spec?.template?.spec?.containers?.[0]?.image,
            createdDate: d.metadata?.creationTimestamp,
            namespace
          });

          //Formatage des StatefulSets
          const formatStatefulSet = (s: V1StatefulSet): Application => ({
            name: s.metadata?.name ?? 'inconnu',
            type: 'StatefulSet',
            replicas: s.spec?.replicas ?? 0,
            readyReplicas: s.status?.readyReplicas ?? 0,
            age: this.ageFromTimestamp(s.metadata?.creationTimestamp),
            annotations: s.metadata?.annotations ?? {},
            image: s.spec?.template?.spec?.containers?.[0]?.image,
            createdDate: s.metadata?.creationTimestamp,
            namespace
          });

          //Retour des applications formatées
          return [...deploymentsRes.items.map(formatDeployment), ...statefulSetsRes.items.map(formatStatefulSet)];
        } catch {
          //En cas d'erreur, renvoie un tableau vide
          return [];
        }
      })
    );

    //Aplatir le tableau
    const apps = allApps.flat();

    //Récupération des digests pour chaque application
    const flat = await Promise.all(
      apps.map(async (a) => {
        try {
          //Lecture du digest
          const digest = await this.readDigest(a);

          //Retour de l'application avec le digest
          return {
            ...a,
            imageInformation: { digest }
          };
        } catch {
          //En cas d'erreur (ex: droits RBAC insuffisants), on retourne l'app sans digest
          return {
            ...a,
            imageInformation: { digest: null }
          };
        }
      })
    );

    //Retour des applications
    return flat;
  }

  /**
   * Récupère une application spécifique par namespace et nom
   */
  async getApplication(namespace: string, name: string): Promise<Application> {
    try {
      //Recherche du Deployment
      const deploymentRes = await this.appsV1.readNamespacedDeployment({ name, namespace });
      if (deploymentRes) {
        return {
          name: deploymentRes.metadata?.name ?? 'inconnu',
          type: 'Deployment',
          replicas: deploymentRes.spec?.replicas ?? 0,
          readyReplicas: deploymentRes.status?.readyReplicas ?? 0,
          age: this.ageFromTimestamp(deploymentRes.metadata?.creationTimestamp),
          annotations: deploymentRes.metadata?.annotations ?? {},
          image: deploymentRes.spec?.template?.spec?.containers?.[0]?.image,
          createdDate: deploymentRes.metadata?.creationTimestamp,
          namespace
        };
      }
    } catch {
      //Ignorer l'erreur et tenter de récupérer le StatefulSet
    }

    try {
      //Recherche du StatefulSet
      const statefulSetRes = await this.appsV1.readNamespacedStatefulSet({ name, namespace });
      if (statefulSetRes) {
        return {
          name: statefulSetRes.metadata?.name ?? 'inconnu',
          type: 'StatefulSet',
          replicas: statefulSetRes.spec?.replicas ?? 0,
          readyReplicas: statefulSetRes.status?.readyReplicas ?? 0,
          age: this.ageFromTimestamp(statefulSetRes.metadata?.creationTimestamp),
          annotations: statefulSetRes.metadata?.annotations ?? {},
          image: statefulSetRes.spec?.template?.spec?.containers?.[0]?.image,
          createdDate: statefulSetRes.metadata?.creationTimestamp,
          namespace
        };
      }
    } catch {
      //Ignorer l'erreur
    }

    //Aucune application trouvée
    throw new OrchestratorUnavailableError(`Aucune application trouvée avec le nom ${name} dans le namespace ${namespace}`, { providerName: this.providerName, namespace, name });
  }

  /**
   * Patch d'une application Kubernetes
   */
  async patchApplication(app: Application, params: ApplicationAnnotation, image?: string): Promise<V1Deployment | V1StatefulSet | null> {
    //Normalisation des paramètres pour Kubernetes
    const normalizedParams: Record<string, any> = {};

    //Itération sur les paramètres
    Object.keys(params).forEach((k) => {
      //Récupération de la valeur
      const v = (params as any)[k];

      //Normalisation selon le type
      if (typeof v === 'boolean')
        //Conversion en chaîne de caractères
        normalizedParams[k] = v.toString();
      else if (v instanceof Date)
        //Conversion en ISO avec timezone
        normalizedParams[k] = DateTime.fromJSDate(v).toISO({ includeOffset: true });
      else
        //Valeur brute
        normalizedParams[k] = v;
    });

    //Définition du patch
    const patchBody: any = [{ op: 'add', path: '/metadata/annotations', value: normalizedParams }];

    //Ajout de l'image si fournie
    if (image)
      //Ajout de l'opération de remplacement de l'image
      patchBody.push({ op: 'replace', path: `/spec/template/spec/containers/0/image`, value: image });

    try {
      //Application du patch selon le type
      if (app.type === 'Deployment')
        //Retour du résultat du patch
        return await this.appsV1.patchNamespacedDeployment({ name: app.name, namespace: app.namespace, body: patchBody });
      else if (app.type === 'StatefulSet')
        //Retour du résultat du patch
        return await this.appsV1.patchNamespacedStatefulSet({ name: app.name, namespace: app.namespace, body: patchBody });
    } catch (err: any) {
      //Levée d'une erreur en cas de problème
      throw new OrchestratorUnavailableError(err.message, err.details || { providerName: this.providerName, application: app.name, namespace: app.namespace, image: image });
    }

    return null;
  }

  /**
   * Récupère le digest d'une application Kubernetes
   */
  async readDigest(application: Application): Promise<string | null> {
    try {
      //Liste des pods correspondant à l'application
      const podList = await this.coreV1.listNamespacedPod({ namespace: application.namespace, labelSelector: `app=${application.name}` });

      //Vérification de la présence de pods
      if (!podList?.items?.length)
        //Aucun pod trouvé
        return null;

      //Itération sur les pods
      for (const pod of podList.items) {
        //Récupération des statuts des conteneurs
        const statuses = pod.status?.containerStatuses ?? [];

        //Recherche du digest dans les statuts
        for (const status of statuses) {
          //Récupération de l'ID de l'image
          const imageID = status.imageID;
          //Vérification du format et extraction du digest
          if (imageID?.includes('@sha256:'))
            //Retour du digest
            return imageID.split('@sha256:')[1];
        }
      }

      //Aucun digest trouvé
      return null;
    } catch {
      //Erreur, retour null
      throw new OrchestratorUnavailableError(`Impossible de récupérer le digest pour l'application ${application.name} dans le namespace ${application.namespace}`, { providerName: this.providerName, namespace: application.namespace, name: application.name });
    }
  }

  /**
   * Récupère la liste des namespaces
   */
  private async getNamespaces(): Promise<string[]> {
    //Récupération des namespaces
    const res = await this.coreV1.listNamespace();

    //Extraction des noms de namespaces
    const listeNamespaces = res.items.map((ns) => ns.metadata?.name ?? 'inconnu');

    //Vérification de la présence de namespaces
    if (!listeNamespaces.length)
      //Aucun namespace trouvé
      throw new OrchestratorUnavailableError('Aucun namespace trouvé dans le cluster', { providerName: this.providerName });

    //Retour des namespaces
    return listeNamespaces;
  }

  /**
   * Calcul de l'âge d'un déploiement ou statefulset
   */
  private ageFromTimestamp(ts?: Date): string {
    //Vérification de la présence du timestamp
    if (!ts)
      //Retour inconnu
      return 'unknown';

    //Calcul de la différence en heures
    const deltaH = (Date.now() - ts.getTime()) / 1000 / 60 / 60;

    //Retour formaté
    return deltaH < 24 ? `${deltaH.toFixed(1)}h` : `${(deltaH / 24).toFixed(1)}d`;
  }
}
