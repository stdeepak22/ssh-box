# Migration Plan - @ssh-box/web to Next.js

## Goal
Migrate the existing React + Vite web application to Next.js (App Router) to improve the architecture and prepare for future features.

## Proposed Changes

### [Component] `packages/web`
We will refactor the existing web package in place to minimize monorepo configuration changes.

#### Dependencies
- **[NEW]** `next`
- **[NEW]** `react`, `react-dom` (ensure latest compatible versions)
- **[DELETE]** `vite`, `@vitejs/plugin-react`
- **[DELETE]** `react-router-dom` (Next.js handles routing)

#### Configuration
- **[MODIFY]** `package.json`: Clear Vite scripts, add Next.js scripts (`dev`, `build`, `start`).
- **[NEW]** `next.config.ts`: Basic Next.js configuration.
- **[NEW]** `tsconfig.json`: Update to Next.js standards.
- **[DELETE]** `index.html`, `vite.config.ts`.

#### Directory Structure (App Router)
- **[NEW]** `src/app/layout.tsx`: Root layout with Tailwind fonts/styles.
- **[NEW]** `src/app/page.tsx`: Landing/Login page (migrated from `Auth.tsx`).
- **[NEW]** `src/app/dashboard/page.tsx`: Dashboard page (migrated from `Dashboard.tsx`).
- **[MODIFY]** `src/lib/api.ts`: Ensure compatibility with Next.js client-side execution.
- **[MODIFY]** `src/lib/db.ts`: Ensure IndexedDB only runs in client-side environment (`window` check).

### [Component] Dockerization
- **[MODIFY]** `packages/web/Dockerfile`: Update for Next.js production build (`next build` + `next start`).

## Verification Plan

### Automated Tests
- `npm run build` in `packages/web`.

### Manual Verification
1.  Run `npm run dev` in `packages/web`.
2.  Verify Auth flow (Login/Register).
3.  Verify Dashboard (List, Decrypt, Add Secret).
4.  Verify IndexedDB caching persistence and 5-min sync logic.
5.  Verify 401/403 global redirect still works via the interceptor.
