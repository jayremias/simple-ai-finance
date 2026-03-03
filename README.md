# MoneyLens

Mobile-first personal finance app for tracking accounts, expenses, income, and subscriptions across multiple financial accounts. Combines manual entry with AI-powered receipt scanning and bank statement import.

## Tech Stack

| Layer      | Technology                             |
| ---------- | -------------------------------------- |
| Mobile     | React Native (Expo SDK 55) + Tamagui   |
| Backend    | Hono on Bun                            |
| Database   | PostgreSQL 16+ with Drizzle ORM        |
| Validation | Zod (shared between client and server) |
| Monorepo   | Turborepo + Bun workspaces             |
| Linter     | Biome                                  |

## Prerequisites

- [Bun](https://bun.sh/) (v1.2+)
- [Docker](https://www.docker.com/) (for local PostgreSQL)
- [Expo Go](https://expo.dev/go) app on your phone (for mobile development)

## Getting Started

```bash
# Clone the repo
git clone <repo-url>
cd finance-app

# Install dependencies
bun install
bun pm trust @biomejs/biome

# Start the database
docker compose up -d

# Copy environment variables
cp .env.example apps/api/.env

# Start all dev servers
bun dev
```

The API will be available at `http://localhost:3000/api/v1/health`.

## Project Structure

```
moneylens/
├── apps/
│   ├── api/                 # Hono backend
│   │   ├── src/
│   │   │   ├── index.ts     # Server entry point
│   │   │   ├── env.ts       # Environment validation (Zod)
│   │   │   ├── routes/      # Route handlers by domain
│   │   │   ├── middleware/   # Auth, validation, rate limiting
│   │   │   ├── services/    # Business logic layer
│   │   │   ├── lib/db/      # Drizzle schema & client
│   │   │   ├── jobs/        # Scheduled tasks
│   │   │   └── utils/       # Helpers
│   │   └── drizzle.config.ts
│   │
│   └── mobile/              # React Native (Expo) app
│       ├── App.tsx          # Provider hierarchy entry point
│       ├── src/
│       │   ├── screens/     # Screen components
│       │   ├── components/  # Shared UI components
│       │   ├── navigation/  # React Navigation setup
│       │   ├── hooks/       # TanStack Query hooks
│       │   ├── stores/      # Zustand stores
│       │   ├── services/    # API client (Axios)
│       │   ├── theme/       # Tamagui config
│       │   └── utils/       # Helpers
│       └── metro.config.js  # Monorepo resolution
│
├── packages/
│   └── shared/              # Shared between API and mobile
│       └── src/
│           ├── schemas/     # Zod validation schemas
│           ├── types/       # TypeScript interfaces
│           └── constants/   # Enums, defaults
│
├── docker-compose.yml       # Local PostgreSQL
├── turbo.json               # Turborepo config
└── biome.json               # Linter/formatter config
```

## Commands

```bash
bun dev              # Start all dev servers (Turborepo)
bun run build        # Production build
bun run lint         # Biome check
bun run format       # Biome format --write
bun run test         # Run tests
bun run db:generate  # Generate Drizzle migrations
bun run db:migrate   # Apply migrations
bun run db:studio    # Open Drizzle Studio
```

## Architecture

```
┌─────────────────────────────────┐
│     Mobile Client               │
│   React Native + Tamagui        │
└──────────────┬──────────────────┘
               │ HTTPS (REST)
               ▼
┌─────────────────────────────────┐
│     API Server (Hono on Bun)    │
│  Routes → Services → DB/Lib    │
└──────────────┬──────────────────┘
               │
               ▼
          PostgreSQL
```

## Documentation

- [Product Requirements (PRD)](docs/moneylens-mobile-prd.md) — features, phases, acceptance criteria
- [Technical Architecture](docs/moneylens-tech-overview.md) — system design, database schema, pipelines

## License

Private — All rights reserved.
