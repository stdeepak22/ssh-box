
# D3 SSH Key Box - PRD + SDD

## Product Overview
**Goal:** Provide secure, cross-device, encrypted storage for SSH keys and config data.

**Primary use:** Store SSH keys securely, access anywhere.
**Secondary use:** Store other small secrets/configs.

**Key feature:** Zero-knowledge encryption (client-side encryption, D3).

**Platforms:** 
- CLI / SH script (Linux, macOS, Windows)
- Web app (React or similar)
- Browser extension (Chrome)
- IDE integration (VSCode)

## User Tiers

| Tier | Max Keys | Versions per Key | Notes |
|------|----------|-----------------|-------|
| Free | 15 | 2 | Current + 1 previous version |
| Paid | 50 | 6 | Current + 5 previous versions, rollback |

## Core Features

1. **End-to-end encryption:**  
   - Client derives encryption key from **master password**  
   - Encrypt SSH keys locally before sending to backend  
   - Decrypt locally when retrieved

2. **Multi-device sync:**  
   - Encrypted blobs stored in DynamoDB  
   - Pull latest + history versions  
   - Optional caching to reduce cost

3. **Versioning:**  
   - Free: 1 previous version  
   - Paid: 5 previous versions  
   - Stored as separate items in DynamoDB

4. **Authentication:**  
   - Email / username + password  
   - JWT / token for CLI/web authentication  
   - Server never stores master password

## System Design - DynamoDB Backend

### Database Design

**Table:** UserSecrets

| Field | Type | Notes |
|-------|------|------|
| user_id | string (PK) | Unique per user |
| secret_id | string (SK) | Unique per secret |
| version | number | Current = 1, previous versions = 2…6 |
| ciphertext | string | Encrypted SSH key / config |
| salt | string | For KDF |
| iv | string | Initialization vector for AES-GCM / ChaCha20 |
| metadata | JSON | Key name, timestamp, description, tags |
| created_at | timestamp | Record creation time |
| updated_at | timestamp | Record last updated |

**Sort Key pattern:** `secret_id#version`

### Version Management

- Add new secret → version = 1  
- Update secret → increment version, keep previous versions  
- Rollback → select previous version → overwrite current  
- Free users: keep 2 versions max  
- Paid users: keep 6 versions max  

### User Authentication

1. Register → email + password → hash & store in Users table  
2. Login → validate password → generate JWT  
3. JWT used to authorize access to UserSecrets  
4. Master password never sent to server

### CLI / SH Script

- Fetch encrypted secrets → decrypt locally  
- Push new/updated secret → encrypt locally → send to API  
- Commands example:
\`\`\`bash
ssh-box add --name mykey --file ~/.ssh/id_rsa
ssh-box get --name mykey > ~/.ssh/id_rsa
ssh-box rollback --name mykey --version 2
\`\`\`

### Web / Extension / VSCode Integration

- Web: React dashboard for managing keys  
- Chrome extension: quick access, copy keys  
- VSCode: pull keys directly for dev environment  
- All use same backend API + JWT auth + client encryption

### DynamoDB Setup Instructions

1. Create Table `UserSecrets` with PK: user_id, SK: secret_id#version  
2. Create Users Table: `Users` (user_id, email, password_hash, created_at)  
3. Optional GSI for metadata.name search  
4. IAM roles: backend API access only, user auth via JWT  
5. Data management: prune old versions based on tier  

### Cost Optimization

- Cache secrets locally  
- Batch reads (BatchGetItem) for multiple secrets  
- TTL or version pruning for free users  

### Security Notes

- Encryption: AES-GCM / ChaCha20-Poly1305 with master password-derived key  
- HTTPS for all API calls  
- JWT auth with short expiry + refresh tokens  

## Deployment / Multi-Platform Publishing

| Platform | Notes |
|----------|-------|
| Ubuntu (APT) | SH script packaged as .deb |
| macOS (Homebrew / brew) | CLI binary packaged |
| Windows (winget / Chocolatey) | CLI executable |
| Web | Hosted on Netlify / Vercel |
| Chrome Extension | Packaged .crx |
| VSCode | Extension using VSCode API |

## Architecture Diagram

\`\`\`mermaid
flowchart TD
    subgraph User Devices
        A[CLI / SH Script] -->|Encrypt| E[Client Encryption]
        B[Web App] -->|Encrypt| E
        C[Chrome / VSCode Extension] -->|Encrypt| E
    end

    E -->|Send Encrypted| F[Backend API / Auth (JWT)]
    F --> G[DynamoDB UserSecrets Table]
    G --> F
    F -->|Return Encrypted| E
    E -->|Decrypt Locally| A & B & C

    %% Versioning
    subgraph Versioning
        G --> H[Version History Management]
        H --> G
    end
\`\`\`
