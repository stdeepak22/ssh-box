# Implementation Plan - D3 SSH Box MVP

## Goal
Build a secure, cross-device SSH Key Box with client-side encryption. The MVP will consist of a Backend API (DynamoDB) and a CLI tool.

## User Review Required
> [!IMPORTANT]
> **Tech Stack Choice**: Proposing **TypeScript** for both Backend (Node.js/AWS Lambda) and CLI (Node.js). This allows sharing the encryption logic directly.
>
> **AWS Prerequisites**: You will need an AWS account and local credentials configured to deploy the backend (DynamoDB + Lambda).
>
> **Encryption**: Using `AES-GCM` (via generic `crypto` module or `sodium-native`) for client-side encryption.

## Proposed Changes

### Structure
I propose a monorepo structure (using npm workspaces) to share code:
- `packages/common`: Shared types and encryption logic.
- `packages/backend`: AWS Serverless API (Serverless Framework or CDK).
- `packages/cli`: CLI tool.

### [NEW] `packages/common`
- **Goal**: Shared types and crypto functions.
- `src/types.ts`: Define `Secret`, `User` interfaces.
- `src/crypto.ts`: Implement `encrypt(data, password)`, `decrypt(data, password)` using PBKDF2 for key derivation and AES-GCM.

### [NEW] `packages/backend`
- **Goal**: API to store/retrieve encrypted blobs.
- **Stack**: Node.js, AWS Lambda, API Gateway, DynamoDB.
- `serverless.yml`: Define DynamoDB table and Functions.
- `src/handlers/`:
    - `auth.ts`: Register/Login (Issue JWT).
    - `secrets.ts`: CRUD for secrets (Get, Put, List).

### [NEW] `packages/cli`
- **Goal**: Terminal interface for the user.
- **Stack**: Node.js, `commander`, `inquirer`.
- `src/index.ts`: Entry point.
- `src/commands/`:
    - `init.ts`: Login/Register.
    - `add.ts`: Encrypt local file -> Upload.
    - `get.ts`: Download -> Decrypt -> Save to file.

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
