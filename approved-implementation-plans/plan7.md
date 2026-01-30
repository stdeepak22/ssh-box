# Implementation Plan - D3 SSH Box MVP

## Goal
Build a secure, cross-device SSH key vault with client-side encryption. The MVP will consist of a Backend API (DynamoDB) and a CLI tool.

## User Review Required
> [!IMPORTANT]
> **Tech Stack Choice**: Proposing **TypeScript** for both Backend (Node.js/AWS Lambda) and CLI (Node.js). This allows sharing the encryption logic directly.
>
> **AWS Prerequisites**: You will need an AWS account and local credentials configured to deploy the backend (DynamoDB + Lambda).
>
> **Encryption**: Using `AES-GCM` (via generic `crypto` module or `sodium-native`) for client-side encryption.

## Design Decisions

### Architecture: Docker on VM
- **Compute**: Node.js (Express/Fastify) server running in a Docker container.
- **Database**: DynamoDB (managed) or Local Database (e.g., SQLite via Docker). *Recommendation: Stick to DynamoDB for now as per PRD, but can easily swap to SQLite for full self-hosting if requested.*
- **Benefits**: Zero AWS Lambda dependency, portable, full control.
21: 
22: ### Client-Side Caching (IndexedDB)
23: - **Goal**: Reduce network calls and improve performance on page refresh.
24: - **Library**: `idb` (small wrapper for IndexedDB).
25: - **Logic**:
26:     - Load from IndexedDB on component mount for instant UI update.
27:     - Background fetch from server to check for updates.
28:     - Upsert to IndexedDB when server data is received.
29:     - Delete from IndexedDB on logout.

## Proposed Changes

### Structure
I propose a monorepo structure (using npm workspaces) to share code:
- `packages/common`: Shared types and encryption logic.
- `packages/backend`: Dockerized Node.js API.
- `packages/cli`: CLI tool.

### [NEW] `packages/common`
- **Goal**: Shared types and crypto functions.
- `src/types.ts`: Define `Secret`, `User` interfaces.
- `src/crypto.ts`: Implement `encrypt(data, password)`, `decrypt(data, password)` using PBKDF2 and AES-GCM.

### [NEW] `packages/backend`
- **Goal**: REST API server.
- **Stack**: Node.js, Express, Docker.
- `Dockerfile`: Container definition.
- `docker-compose.yml`: For local development/deployment.
- `src/server.ts`: Express app setup.
- `src/routes/`:
    - `auth.ts`: Register/Login (JWT).
    - `secrets.ts`: CRUD endpoints.
- `src/db.ts`: DynamoDB Client (or abstract adapter).

### [NEW] `packages/cli`
- **Goal**: Terminal interface for the user.
- **Stack**: Node.js, `commander`, `inquirer`.
- `src/index.ts`: Entry point.
- `src/commands/`:
    - `init.ts`: Login/Register.
    - `add.ts`: Encrypt local file -> Upload.
    - `get.ts`: Download -> Decrypt -> Save to file.

### [NEW] `packages/web`
- **Goal**: Web Dashboard for managing secrets.
- **Stack**: React, Vite, Tailwind CSS.
- **Features**:
    -   Login/Register (JWT).
    -   List Secrets.
    -   Decrypt Secrets locally (Browser).
    -   Add Encrypted Secrets.
- **Structure**:
    -   `src/App.tsx`: Routing.
    -   `src/pages/`: Auth, Dashboard.
    -   `src/components/`: UI Components.
    -   `src/lib/`: API Client, **IndexedDB Helper (`db.ts`)**.

### [MODIFY] `packages/common`
- **Refactor**: Switch `crypto.ts` to use **Web Crypto API** (Standard) instead of `node:crypto` to ensure compatibility with both Browser and Node.js (v19+ or via polyfill).

## Verification Plan

### Automated Tests
- **Unit Tests**:
    - `packages/common`: Verify encryption/decryption roundtrip.
    - `packages/backend`: Mock DynamoDB calls to verify logic.
    - Run: `npm test` in root.

### Manual Verification
1.  **Backend Deployment**:
    - Run `npm run deploy` (requires AWS credentials).
    - Verify DynamoDB table creation in AWS Console.
2.  **CLI End-to-End**:
    - `ssh-box register user@example.com`
    - `ssh-box login user@example.com`
    - `echo "secret-data" > test_key`
    - `ssh-box add --name test-key --file ./test_key`
    - `rm test_key`
    - `ssh-box get --name test-key`
    - Verify output matches "secret-data".
