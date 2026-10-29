import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      DB_PATH: ':memory:',
      NODE_ENV: 'test'
    },
    fileParallelism: false,
    globals: true
  }
});
