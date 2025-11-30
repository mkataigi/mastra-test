const config = {
  entry: './src/index.ts',
  outDir: '.mastra',
  endpoints: {
    vercel: {
      type: 'vercel',
      handler: './api/index.ts',
    },
  },
};

export default config;
