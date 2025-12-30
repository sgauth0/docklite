# GEMINI.md

## Project Overview

This project, named DockLite, is a web hosting control panel built with Next.js. It provides a user interface for managing Docker containers, deploying websites, and managing databases. The application is designed to be a lightweight and easy-to-use alternative to more complex control panels.

### Main Technologies

*   **Framework**: [Next.js](https://nextjs.org/) 14 (with App Router)
*   **Language**: [TypeScript](https://www.typescriptlang.org/)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
*   **Docker Integration**: [dockerode](https://github.com/apocas/dockerode)
*   **Database**: [SQLite](https://www.sqlite.org/index.html) (via `better-sqlite3`)
*   **Authentication**: [iron-session](https://github.com/vvo/iron-session)

### Architecture

The application is structured as a standard Next.js project.

*   `app/`: Contains the Next.js pages and API routes. The dashboard is in `app/(dashboard)/` and is a protected route.
*   `lib/`: Contains the core business logic.
    *   `lib/docker.ts`: A wrapper around `dockerode` for all Docker-related operations.
    *   `lib/db.ts`: Manages the SQLite database connection and provides a data access layer.
    *   `lib/auth.ts`: Handles user authentication and session management with `iron-session`.
*   `data/`: Contains the SQLite database file (`docklite.db`).

## Building and Running

### Prerequisites

*   Node.js 20+
*   Docker installed and running
*   Access to Docker socket (`/var/run/docker.sock`)

### Key Commands

The following commands are defined in `package.json`:

*   **Development Server**: `npm run dev`
    *   Starts the Next.js development server.
*   **Production Build**: `npm run build`
    *   Builds the application for production.
*   **Production Server**: `npm start`
    *   Starts the Next.js production server.
*   **Linting**: `npm run lint`
    *   Runs ESLint to check for code quality.

## Development Conventions

### Coding Style

The project uses TypeScript and follows standard Next.js and React conventions. ESLint is configured to enforce code quality.

### Testing

There are no explicit testing practices or frameworks configured in the project.

### Contribution Guidelines

There are no explicit contribution guidelines in the project.
