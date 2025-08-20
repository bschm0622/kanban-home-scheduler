# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a mobile-first kanban-style home organization app built with Astro, React, Tailwind CSS v4, and Convex backend. The app helps manage weekly tasks by organizing them in a kanban board format with a backlog and daily columns for each day of the week.

## Commands

All commands should be run from the project root:

- `npm run dev` - Start development server at localhost:4321
- `npm run build` - Build production site to ./dist/
- `npm run preview` - Preview build locally
- `npm run astro` - Run Astro CLI commands
- `npx convex dev` - Start Convex backend development server
- `npx convex deploy` - Deploy Convex functions to production

## Architecture

### Key Configuration Files
- `astro.config.mjs` - Main Astro configuration with sitemap integration and Tailwind CSS setup
- `src/siteConfig.ts` - Central site configuration including navigation, social links, and metadata
- `src/content.config.ts` - Content collections configuration for blog posts
- `tsconfig.json` - TypeScript configuration with path aliases (`@/*` maps to `src/*`)

### Directory Structure
- `src/pages/` - File-based routing with index and blog pages
- `src/layouts/` - Astro layout components (Layout.astro, MarkdownPostLayout.astro)
- `src/components/` - Reusable Astro components including navigation, theme toggle, and blog reel
- `src/blog/` - Markdown blog posts with frontmatter schema validation
- `src/styles/` - Global CSS styles
- `public/` - Static assets

### Content Management
- Blog posts are managed through Astro's content collections system
- Posts use glob loader pattern to load markdown files from `src/blog/`
- Schema validation enforces title, pubDate, description, author, and tags fields

### Styling
- Uses Tailwind CSS v4 as a Vite plugin
- Global styles in `src/styles/global.css`
- Theme toggle component suggests dark/light mode support

### Key Features
- Mobile-first responsive design optimized for phone usage
- Kanban board with backlog and weekly view (Monday-Sunday)
- Task creation with priority levels and descriptions
- Touch-friendly interface with large tap targets
- Real-time data sync with Convex backend
- Weekly task rollover functionality
- Task completion tracking
- Support for recurring tasks
- Horizontal scrolling for mobile kanban columns

### Backend (Convex)
- Real-time database with tasks, recurringTasks, and weeks tables
- Query functions for fetching current week tasks and backlog
- Mutation functions for creating, updating, completing, and deleting tasks
- Weekly rollover logic to move incomplete tasks back to backlog
- Recurring task generation system

### Environment Setup
- Requires `PUBLIC_CONVEX_URL` environment variable
- Copy `.env.example` to `.env` and configure Convex URL
- Run `npx convex dev` alongside `npm run dev` for development