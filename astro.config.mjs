// @ts-check
import { defineConfig, fontProviders, envField } from 'astro/config';
import sitemap from "@astrojs/sitemap";
import react from "@astrojs/react";

import tailwindcss from '@tailwindcss/vite';


// https://astro.build/config
export default defineConfig({
  site: "https://home.beckyschmidt.me",
  output: "static",
  integrations: [sitemap(), react()],

  env: {
    schema: {
      CONVEX_URL: envField.string({
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