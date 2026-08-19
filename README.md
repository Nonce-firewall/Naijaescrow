# 9ija Escrow - P2P Crypto Trading Platform

<div align="center">
  <strong>Trade securely with local bank transfers and instant blockchain execution</strong>
</div>

## What

9ija Escrow is a P2P (peer-to-peer) cryptocurrency trading platform enabling Nigerian traders to buy and sell USDT using local NGN bank transfers. The platform provides:

- **Secure Escrow**: Blockchain-verified transactions with instant settlement
- **Multiple Networks**: USDT on BSC, Tron, and Polygon
- **KYC Verification**: Automated identity verification for compliance
- **Admin Dashboard**: Real-time order management, dispute resolution, and analytics
- **User Dashboard**: Trade history, wallet integration, and transaction tracking

## Why

Traditional fiat-to-crypto onramps in Nigeria face barriers:
- High fees (5-15%)
- Long settlement times (24+ hours)
- Limited payment methods
- Lack of local language support

9ija Escrow reduces friction by combining the speed of blockchain with the familiarity of local bank transfers, offering competitive rates and instant execution.

## Architecture

```
src/
├── lib/
│   ├── dbHelpers.ts        # Supabase data access layer with validation
│   ├── schemas.ts          # Zod validation schemas (to be created)
│   └── supabase.ts         # Supabase client initialization
├── hooks/
│   ├── useAdminSettingsForm.ts  # Admin settings form state (extracted)
│   └── ...                      # Component-specific custom hooks
├── components/
│   ├── AuthPage.tsx             # Authentication UI
│   ├── AdminCMS.tsx             # Admin dashboard (to be refactored)
│   ├── UserDashboard.tsx        # User dashboard (to be refactored)
│   ├── admin/                   # Extracted admin sections
│   │   ├── OrdersTab.tsx
│   │   ├── KYCTab.tsx
│   │   ├── SettingsTab.tsx
│   │   └── ...
│   └── dashboard/               # Extracted user sections
│       ├── TradeTab.tsx
│       ├── HistoryTab.tsx
│       └── ...
└── types/
    └── index.ts                 # TypeScript type definitions

supabase-schema.sql             # Database schema and migrations
.env.example                    # Environment variable template
vite.config.ts                 # Vite configuration
vitest.config.ts               # Vitest test runner configuration
eslint.config.js               # ESLint configuration
.prettierrc                    # Prettier code formatting rules
```

**Tech Stack**:
- **Frontend**: React 19, Vite 6, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL), Netlify Functions
- **Blockchain**: Ethers.js (for wallet integration)
- **Testing**: Vitest, React Testing Library
- **Code Quality**: ESLint, Prettier, TypeScript strict mode

## Prerequisites

- Node.js 20 or higher
- npm 10 or higher
- Git
- Supabase account with a project initialized
- Firebase account (optional, for analytics)

## Install

```bash
# Clone the repository
git clone https://github.com/CryptoGangstar/9ijaescrow.git
cd 9ijaescrow

# Install dependencies
npm install

# Verify installation
node -v  # Should be v20+
npm -v   # Should be v10+
```

## Environment Setup

1. **Copy the environment template**:
   ```bash
   cp .env.example .env.local
   ```

2. **Fill in your Supabase credentials**:
   - Visit [Supabase Dashboard](https://app.supabase.com)
   - Select your project
   - Go to Settings → API → Copy `Project URL` and `Anon Key`
   - Add to `.env.local`:
     ```
     VITE_SUPABASE_URL=your_project_url
     VITE_SUPABASE_ANON_KEY=your_anon_key
     ```

3. **Initialize the database schema**:
   ```bash
   # Option 1: Via Supabase Dashboard (recommended)
   # 1. Go to SQL Editor in Supabase Dashboard
   # 2. Create a new query
   # 3. Copy contents of supabase-schema.sql and execute
   
   # Option 2: Via Supabase CLI
   supabase db push
   ```

4. **Set Firebase credentials** (optional, for analytics):
   ```
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

## Run

```bash
# Start development server
npm run dev

# App will be available at http://localhost:5000
```

**Verify it works**:
1. Open http://localhost:5000 in your browser
2. Click "Sign Up" and create a test account
3. You should see the authentication page
4. After login, access the user dashboard

## Build

```bash
# Production build
npm run build

# The output will be in the dist/ directory
# You can preview it locally:
npm run preview
```

## Test

```bash
# Run all tests
npm test

# Run tests in watch mode (rerun on file changes)
npm test -- --watch

# Run specific test file
npm test -- src/lib/dbHelpers.test.ts

# Generate coverage report
npm test -- --coverage
```

**Test coverage targets**:
- `src/lib/dbHelpers.ts`: Data access validation and transformations
- `src/lib/schemas.ts`: Input validation rules
- `src/components/AuthPage.tsx`: Authentication flow and validation
- Core business logic in extracted components

## Lint & Format

```bash
# Check for linting issues
npm run lint

# Check code formatting
npm run format:check

# Auto-fix formatting
npm run format
```

## Database Schema

The Supabase database includes the following tables:

- **users**: User profiles with KYC status and account state
- **orders**: Trading orders (buy/sell) with status and payment details
- **coins**: Supported cryptocurrency listings and rates
- **settings**: Admin configuration (bank details, wallets, markup rates)
- **announcements**: Admin announcements and system notices
- **disputes**: Trade disputes and resolution messages
- **dispute_messages**: Chat messages within dispute resolution

Full schema documentation: See `supabase-schema.sql`

## Development Workflow

### Making Changes

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** and write tests alongside:
   ```bash
   # Edit your code
   npm test -- --watch  # Run tests as you code
   npm run lint         # Check code quality
   ```

3. **Commit with clear messages**:
   ```bash
   # Use conventional commits
   git commit -m "feat: add order validation schema"
   git commit -m "test: add dbHelpers validation tests"
   ```

4. **Push and create a Pull Request**:
   ```bash
   git push origin feature/your-feature-name
   # Open PR on GitHub
   ```

5. **CI will automatically**:
   - Run type checking (`npm run lint`)
   - Run all tests (`npm test`)
   - Verify the build succeeds (`npm run build`)

### Refactoring Large Components

When working on AdminCMS.tsx or UserDashboard.tsx:

1. Extract each tab into a separate component in `src/components/admin/` or `src/components/dashboard/`
2. Keep components under 500 LOC
3. Move shared state to custom hooks (e.g., `useAdminSettingsForm`)
4. Add unit tests for each extracted component
5. Commit each extraction separately

## Troubleshooting

### "Cannot find module" errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Supabase connection fails
- Verify `.env.local` has correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Check that Supabase project is active in the dashboard
- Ensure database schema is initialized via `supabase-schema.sql`

### Tests fail with "jsdom environment not found"
- Ensure `vitest.config.ts` exists with jsdom environment configured
- Run `npm install -D jsdom`

### Port 5000 already in use
```bash
# Find and kill the process, or use a different port:
npm run dev -- --port 5001
```

## Contributing

1. Follow the development workflow above
2. Write tests for new features
3. Ensure all tests pass: `npm test`
4. Ensure lint passes: `npm run lint`
5. Keep commits small and focused
6. Reference related issues in commit messages: `fix: resolve #123`

## License

MIT

## Support

For issues or questions:
- Open an issue on [GitHub](https://github.com/CryptoGangstar/9ijaescrow/issues)
- Contact: cryptogangstar247@gmail.com
