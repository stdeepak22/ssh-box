# SSH Box – Secure SSH Key Management

## Overview
SSH Box is a secure secrets management system designed for storing and managing SSH keys and other sensitive information. This monorepo provides a complete ecosystem with CLI, backend API, and web interfaces(coming soon), all built around a zero-knowledge vault architecture.

## Architecture

```
           ┌─────────────────┐     DynamoDB     ┌─────────────┐
           │   Backend API   │ ◄──────────────► │             │
           │-----------------│                  │   Secrets   │
           │                 │                  │   Storage   │
           │ - Auth routes   │                  │   (AWS)     │
           │ - Secret routes │                  │             │
           │ - JWT auth      │                  └─────────────┘
           └─────────────────┘
                   ▲
                   │ HTTP/REST
                   ▼
┌─────────────────────────────────────────────────────────┐
│                   Common Packages                       │
├─────────────────┬─────────────────┬─────────────────────┤
│    Types        │   Helper        │   Zero-Vault        │
│-----------------│-----------------│---------------------│
│  - AuthResponse │ - Password      │ - Encryption        │
│  - Encryption   │   helpers       │ - Session mgmt      │
│  - DB schemas   │ - Auth helpers  │ - Key wrapping      │      
└─────────────────┴─────────────────┴─────────────────────┘                               
        ▲                                    ▲          
        │ HTTP/REST                          │ HTTP/REST
        ▼                                    ▼          
┌─────────────────┐                  ┌─────────────────┐
│   CLI Tool      │                  │   Web UI        │ (to be done)
│-----------------│                  │-----------------│
│ - Interactive   │                  │ (Next.js)       │
│   shell         │                  │ - Dashboard     │
│ - Secret CRUD   │                  │ - Secret mgmt   │
└─────────────────┘                  └─────────────────┘
```

## Modules

### 🖥️ CLI Package (`@ssh-box/cli`)
Interactive command-line interface for secret management. Provides a shell-like experience with commands for authentication and CRUD operations on secrets.

- **Key Commands:** `login`, `add`, `get`, `list`, `remove`, `restore`, `set-master`
- **Features:** Interactive prompts, session management, file encryption support
- **Dependencies:** Common packages (types, helper, zero-vault)

### 🌐 Backend Package (`@ssh-box/backend`)
Express.js REST API server handling authentication and secret storage. Provides secure endpoints with JWT authentication and DynamoDB integration.

- **Key Routes:** `/auth`, `/secrets`, `/ping`
- **Features:** JWT middleware, CORS support, helmet security
- **Dependencies:** AWS SDK, JWT, Common types

### 🎨 Web Package (`@ssh-box/web`) (to be done)
Next.js web application providing a modern UI for secret management. React-based interface with Tailwind CSS styling.

- **Key Pages:** Dashboard, secret management interface
- **Features:** Real-time updates, responsive design
- **Dependencies:** Next.js, React, Common packages

### 📦 Common Packages (`@ssh-box/common/*`)
Shared utilities and types used across all packages. Provides consistent interfaces and cryptographic primitives.

#### `@ssh-box/common/types`
TypeScript type definitions for the entire system. Defines standard interfaces for authentication, encryption, and database operations.

#### `@ssh-box/common/helper`
Utility functions for authentication and password operations. Provides decorators and helpers for secure operations.

#### `@ssh-box/common/zero-vault`
Core cryptographic engine implementing zero-knowledge architecture. Handles key wrapping, session management, and encryption operations.

## How They Work Together

1. **Authentication Flow:**
   - CLI or Web app sends credentials to Backend `/auth` endpoint
   - Backend validates and returns JWT token
   - Client stores token for subsequent requests

2. **Secret Management Flow:**
   - Client requests vault unlock using master password
   - VaultService generates/retieves encryption keys
   - Secrets encrypted using AES-GCM with key wrapping
   - Auto-lock after 30 seconds of inactivity

3. **Data Flow:**
   - CLI/Web UI ↔ Common helper
   - Common Helper ↔ Backend via REST API
   - Backend ↔ DynamoDB for persistence
   - All packages share Common types and crypto

## Key Technologies

- **Runtime:** Node.js + TypeScript
- **CLI:** Commander.js, Inquirer.js
- **Backend:** Express.js, JWT, AWS SDK
- **Frontend:** Next.js, React, Tailwind CSS
- **Crypto:** Web Crypto API, AES-GCM, PBKDF2
- **Database:** AWS DynamoDB
- **Deployment:** Docker, Docker Compose

## Security Features

- **Zero-knowledge architecture:** Master password never stored
- **Session-based security:** Auto-lock after inactivity
- **Key wrapping:** Master password encrypts DEK, DEK encrypts data
- **JWT authentication:** Secure API access
- **Environment-based secrets:** No hardcoded credentials

## Quick Start

```bash
# Install dependencies (workspace-aware)
npm install

# Start backend
cd packages/backend
npm run dev

# Start web UI (new terminal)
cd packages/web
npm run dev

# Use CLI (new terminal)
cd packages/cli
npm run build
npm start
```

## Development Environment

- Uses npm workspaces for monorepo management
- Shared TypeScript configuration across packages
- Docker support for consistent development environments
- Hot reload for backend and web development

---

Built with ❤️ for secure secret management.
