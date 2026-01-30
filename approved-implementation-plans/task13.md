# Tasks - Next.js Migration

- [ ] Next.js Infrastructure <!-- id: 46 -->
    - [ ] Update `packages/web/package.json` with Next.js & Dependencies <!-- id: 47 -->
    - [ ] Create `next.config.ts` <!-- id: 48 -->
    - [ ] Configure `tsconfig.json` for Next.js <!-- id: 49 -->
    - [ ] Remove Vite config and `index.html` <!-- id: 50 -->
- [ ] Core Logic Migration <!-- id: 51 -->
    - [ ] Create Root Layout (`src/app/layout.tsx`) <!-- id: 52 -->
    - [ ] Migrate Auth Page (`src/app/page.tsx`) <!-- id: 53 -->
    - [ ] Migrate Dashboard Page (`src/app/dashboard/page.tsx`) <!-- id: 54 -->
    - [ ] Adapt `api.ts` and `db.ts` for Client-Side execution <!-- id: 55 -->
- [ ] Docker & Deployment <!-- id: 56 -->
    - [ ] Update `packages/web/Dockerfile` for Next.js <!-- id: 57 -->
    - [ ] Verify `docker-compose` compatibility <!-- id: 58 -->
- [ ] Final Verification <!-- id: 59 -->
    - [ ] Run `npm run build` and `start` <!-- id: 60 -->
    - [ ] Verify full feature parity <!-- id: 61 -->
