import dotenv from 'dotenv';
import { env } from 'process';
import 'reflect-metadata';
import { container } from 'tsyringe';
import { TypeAnnotation, TypeMode, TypeStrategy } from '../../src/service/image-watcher/domain/annotation';
import { WatchedApplication } from '../../src/service/image-watcher/domain/application';
import { ImageWatcherService } from '../../src/service/image-watcher/image-watcher.service';

/**
 * Script de debug pour tester getAIChangelog avec de vraies données
 * Usage: npx tsx tests/debug-changelog.ts
 */
dotenv.config({ path: process.env.ENV_FILE || '.env' });


async function testChangelog() {
  console.log('OPENAI_BASE_URL:', env.OPENAI_BASE_URL);
  console.log('OPENAI_API_KEY:', env.OPENAI_API_KEY);
  console.log('OPENAI_MODEL:', env.OPENAI_MODEL);
  console.log('GITHUB_TOKEN:', env.GITHUB_TOKEN)

  try {
    console.log('🚀 Démarrage du test de changelog...\n');

    // Récupération du service réel
    const service = container.resolve(ImageWatcherService);

    // Configuration de l'application à tester
    const app: WatchedApplication = {
      namespace: 'test',
      name: 'test-app',
      image: 'ghcr.io/traefik/traefik:v3.6.0', // Remplace par ton image
      annotations: {},
      imageInformation: {
        registry: 'ghcr.io',
        repository: 'traefik/traefik',
        tag: 'v3.6.0'
      },
      parsedAnnotations: {
        [TypeAnnotation.MODE]: TypeMode.AUTO_UPDATE,
        [TypeAnnotation.STRATEGY]: TypeStrategy.ALL,
        [TypeAnnotation.RELEASE_URL]: 'https://api.github.com/repos/traefik/traefik/releases/tags/{tag}' // Remplace par ton repo
      },
      hasImageWatcher: true,
      type: 'Deployment'
    };

    // Tags à tester (versions que tu veux analyser)
    const tags = ['v3.6.0']; // Remplace par les versions réelles

    console.log('📦 Repository:', app.imageInformation?.repository);
    console.log('🏷️  Tags à analyser:', tags.join(', '));
    console.log('🔗 Release URL:', app.parsedAnnotations[TypeAnnotation.RELEASE_URL]);
    console.log('\n⏳ Génération du changelog...\n');

    // Appel de la méthode privée
    const result = await (service as any).getAIChangelog(
      app.imageInformation!.repository,
      tags,
      app
    );

    // Affichage du résultat
    console.log('\n' + '='.repeat(60));
    console.log('📝 CHANGELOG GÉNÉRÉ');
    console.log('='.repeat(60) + '\n');

    if (result.length === 0) {
      console.log('❌ Aucun changelog généré');
    } else {
      result.forEach((changelog: string, index: number) => {
        console.log(`\n[${index + 1}/${result.length}]\n`);
        console.log(changelog);
        console.log('\n' + '-'.repeat(60));
      });
    }

    console.log('\n✅ Test terminé avec succès !');
  } catch (error: any) {
    console.error('\n❌ Erreur lors du test:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Exécution
testChangelog();
