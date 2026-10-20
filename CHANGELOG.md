# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- GitHub Actions CI/CD pipeline in `.github/workflows/ci.yml` running lint, format check, tests with coverage, and production build.
- Dependabot configuration in `.github/dependabot.yml` for automated weekly npm dependency security updates.
- Standalone `CONTRIBUTING.md` and `CHANGELOG.md` documentation.
- Comprehensive unit tests in `src/lib/dbHelpers.additional.test.ts` for `rowToOrder`, `rowToAnnouncement`, `rowToCoin`, and `rowToDispute` mappers.
- Offline mock client in `src/lib/supabase.mock.ts` enabling zero-network test suite execution.
- Tests for Zod data schemas and Nigerian Time (NGT) formatting utilities in `src/lib/schemas.test.ts`.
- Reproducible `package-lock.json` lockfile for reliable fresh clone installations.

### Changed

- Refactored dev server port configuration to standard port 3000 across `package.json`, `vite.config.ts`, and Docker setup.
- Upgraded `@testing-library/react` to React 19 compatible release.
- Made client initialization in `src/lib/supabase.ts` resilient against missing environment variables.

### Fixed

- Fixed camera capture handler event argument type mismatch in `UserDashboard.tsx`.
- Fixed Vitest bundled Vite plugin type compatibility in `vitest.config.ts`.
- Added JSDOM `window.scrollTo` mock in test setup to prevent unhandled motion warning logs during test runs.

## [1.0.0] - 2026-07-11

### Added

- Core P2P escrow trading engine supporting NGN bank transfers and USDT on BSC, Tron, and Polygon networks.
- User Dashboard with live trading journey, order status tracking, and KYC document submission.
- Admin CMS panel with real-time order approval, dispute resolution chat, custom coin listings, and announcements.
- Database schema with Row Level Security (RLS) policies and cascade rules on Supabase Postgres.
