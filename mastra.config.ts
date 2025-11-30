import { defineConfig } from 'mastra';

export default defineConfig({
  entry: './src/mastra/index.ts',
  outDir: '.mastra',
  endpoints: {
    vercel: {
      type: 'vercel',
      handler: './api/index.ts',
    },
  },
});
