import "reflect-metadata";
import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv'

dotenv.config({ path: process.env.ENV_FILE || '.env.test' });

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    hookTimeout: 10000000,
  },
});

