# ARC Student Association Website

## Overview

Full-stack website for an architectural student association. Built with React + Vite on the frontend, Express on the backend, and PostgreSQL for the database.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite, Tailwind CSS, Shadcn/UI, Framer Motion, Wouter
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts/
├── api-server/         # Express API server
│   └── src/routes/     # events, news, team, gallery, resources, jobs, contact
└── arc-website/        # React + Vite frontend (served at /)
    └── src/
        ├── pages/      # Home, About, Events, Resources, Gallery, Blog, Contact
        ├── components/ # layout (Navbar, Footer, PageWrapper) + shared components
        └── index.css   # Architecture-inspired design tokens
lib/
├── api-spec/           # OpenAPI spec + Orval codegen config
├── api-client-react/   # Generated React Query hooks
├── api-zod/            # Generated Zod schemas from OpenAPI
└── db/
    └── src/schema/     # events, news, team, gallery, resources, jobs, contact
scripts/
└── src/seed.ts         # Database seeder with sample data
```

## Pages

1. **Home** — Hero slideshow, upcoming events preview, latest news, countdown timer, architect quotes
2. **About** — Mission statement, "Meet the Team" grid with executive members
3. **Events** — Full event calendar with list view, type badges, RSVP
4. **Resources** — Academic toolkit, software tutorials, equipment info, mentorship
5. **Gallery** — Filterable grid by category, lightbox, masonry layout
6. **Blog** — "The Drafting Board" with categories and author attribution
7. **Contact** — Contact form, social links, newsletter signup, FAQ accordion

## API Routes

- `GET /api/events?upcoming=bool&limit=n` — list events
- `POST /api/events` — create event
- `GET /api/events/:id` — get single event
- `GET /api/news?limit=n&category=x` — list news/blog posts
- `POST /api/news` — create news post
- `GET /api/news/:id` — get single post
- `GET /api/team` — list team members
- `GET /api/gallery?category=x` — list gallery images
- `GET /api/resources?type=x` — list resources
- `GET /api/jobs?type=x` — list job listings
- `POST /api/contact` — submit contact form
- `POST /api/newsletter` — subscribe to newsletter

## Database

All tables managed by Drizzle ORM: events, news, team, gallery, resources, jobs, contact, newsletter.

Run seed: `pnpm --filter @workspace/scripts run seed`
Push schema: `pnpm --filter @workspace/db run push`

## Codegen

After modifying `lib/api-spec/openapi.yaml`:
```bash
pnpm --filter @workspace/api-spec run codegen
```
