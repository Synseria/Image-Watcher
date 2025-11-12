import dotenv from 'dotenv';
import 'reflect-metadata';
import { defineConfig } from 'vitest/config';

dotenv.config({ path: process.env.ENV_FILE || '.env.test' });

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      exclude: ['**/*-provider.ts']
    }
  }
});
