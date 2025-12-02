// https://github.com/vitejs/vite/discussions/3448
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import jsconfigPaths from 'vite-jsconfig-paths';

// ----------------------------------------------------------------------

export default defineConfig({
  plugins: [react(), jsconfigPaths()],
  // https://github.com/jpuri/react-draft-wysiwyg/issues/1317
  // CORRECTION : Change base à '/' pour déploiement à la racine (évite l'erreur MIME sur chemins d'assets).
  // Si tu veux garder '/free', accède toujours via /free et configure ton serveur en conséquence (voir server.js ci-dessous).
  base: '/',
  define: {
    // CORRECTION : Utilise 'globalThis' pour plus de compatibilité (au lieu de 'window').
    global: 'globalThis'
  },
  resolve: {
    // CORRECTION : Décommente et adapte les aliases si tu utilises ~ ou src/ dans tes imports.
    // Ajoute 'path' en haut si besoin : import path from 'path';
    // alias: [
    //   {
    //     find: /^~(.+)/,
    //     replacement: path.join(process.cwd(), 'node_modules/$1')
    //   },
    //   {
    //     find: /^src(.+)/,
    //     replacement: path.join(process.cwd(), 'src/$1')
    //   }
    // ]
  },
  // CORRECTION : Ajoute optimizeDeps pour fixer JSX dans .js si warnings (optionnel, teste d'abord).
  optimizeDeps: {
    esbuildOptions: {
      loader: { '.js': 'jsx' },
    },
  },
  server: {
    // this ensures that the browser opens upon server start
    open: true,
    // this sets a default port to 3000
    port: 3000,
    // CORRECTION : Ajoute host pour accès réseau (aligne avec ton script start).
    host: true
  },
  preview: {
    // this ensures that the browser opens upon preview start
    open: true,
    // this sets a default port to 3000
    port: 3000,
    // CORRECTION : Ajoute host pour preview réseau.
    host: true
  },
  // CORRECTION : Ajoute build pour optimiser (sourcemap pour debug, chunks pour perf).
  build: {
    sourcemap: true,  // Active pour debug en prod si besoin.
    rollupOptions: {
      output: {
        manualChunks: undefined,  // Évite fragmentation excessive pour Berry.
      },
    },
  },
});