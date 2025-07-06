/// <reference types="node" />

// @ts-nocheck

import { resolve } from 'path'
import { defineConfig } from 'vite'
import { copyFileSync, mkdirSync } from 'fs'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        login: resolve(__dirname, 'login.html'),
        signup: resolve(__dirname, 'signup.html'),
        trainer: resolve(__dirname, 'trainer.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        scenarios: resolve(__dirname, 'scenarios.html'),
        about: resolve(__dirname, 'about.html'),
        coach: resolve(__dirname, 'coach.html'),
      },
    },
  },
  plugins: [
    // Custom plugin to copy JSON files to the dist root
    {
      name: 'copy-json-files',
      writeBundle() {
        try {
          // Copy JSON files to the dist directory
          copyFileSync(resolve(__dirname, 'src/en.json'), resolve(__dirname, 'dist/en.json'));
          copyFileSync(resolve(__dirname, 'src/cs.json'), resolve(__dirname, 'dist/cs.json'));
          copyFileSync(resolve(__dirname, 'src/sk.json'), resolve(__dirname, 'dist/sk.json'));
          console.log('Translation files copied to dist/');
        } catch (error) {
          console.warn('Could not copy translation files:', error);
        }
      }
    }
  ]
})