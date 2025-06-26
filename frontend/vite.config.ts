/// <reference types="node" />

// @ts-nocheck

import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        login: resolve(__dirname, 'login.html'),
        signup: resolve(__dirname, 'signup.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        scenarios: resolve(__dirname, 'scenarios.html'), // Make sure this new page is included
      },
    },
  },
})