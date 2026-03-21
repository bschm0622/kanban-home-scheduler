// @ts-check
import { defineConfig, fontProviders, envField } from 'astro/config';
import sitemap from "@astrojs/sitemap";
import react from "@astrojs/react";
import AstroPWA from '@vite-pwa/astro';

import tailwindcss from '@tailwindcss/vite';


// https://astro.build/config
export default defineConfig({
  site: "https://home.beckyschmidt.me",
  output: "static",
  integrations: [
    sitemap(), 
    react(),
    AstroPWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Schmidt Home Tasks',
        short_name: 'Home Tasks',
        description: 'Simple kanban-style task organizer for busy families',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        icons: [
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml'
          },
          {
            src: '/android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png',
            purpose: 'apple touch icon'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.convex\.cloud\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'convex-api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
              networkTimeoutSeconds: 3,
            },
          },
          {
            urlPattern: /^https:\/\/fonts\./,
            handler: 'CacheFirst',
            options: {
              cacheName: 'font-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 31536000 },
            },
          },
        ],
      },
    })
  ],

  env: {
    schema: {
      CONVEX_URL: envField.string({
        access: "public",
        context: "client",
      }),
      PUBLIC_CLERK_PUBLISHABLE_KEY: envField.string({
        access: "public", 
        context: "client",
      }),
    },
  },

  vite: {
    plugins: [tailwindcss()]
  },

  experimental: {
  fonts: [{
    provider: fontProviders.fontsource(),
      name: "Roboto",
      cssVariable: "--font-roboto"
    }]
  },

});