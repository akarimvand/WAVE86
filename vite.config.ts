import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [tailwindcss(), react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {
        // Logs/backups/archives must NEVER trigger reloads — and must never
        // crash the server via EBUSY when a file is being written/copied
        // (a WAVE86.zip copy operation killed the whole dev process once).
        ignored: [
          '**/*.txt',
          '**/*.log',
          '**/dev_out.txt',
          '**/backups/**',
          '**/dist/**',
          '**/node_modules/**',
          '**/*.zip',
          '**/*.7z',
          '**/*.rar',
          '**/*.tmp',
          '**/*.part',
        ],
      },
    },
  };
});
