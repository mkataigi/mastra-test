const config = {
  entry: './src/mastra/index.ts',
  outDir: '.mastra',
  endpoints: {
    vercel: {
      type: 'vercel',
      handler: './api/index.ts',
    },
  },
};

export default config;
