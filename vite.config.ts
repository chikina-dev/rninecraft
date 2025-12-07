import { defineConfig } from 'vite';

export default defineConfig({
  base: "/rninecraft/",
  esbuild: {
    jsxImportSource: '@jsx-dom',
  },
  resolve: {
    alias: {
      '@jsx-webgpu': '/src/jsx',
      '@jsx-dom': '/src/jsx-dom',
      'src': '/src',
    },
  },
  build: {
    outDir: "build",
  },
});
