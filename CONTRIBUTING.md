# Contributing to 9ija Escrow

Thank you for your interest in contributing to 9ija Escrow! We welcome contributions that improve reliability, test coverage, code cleanliness, and security.

## Principles

1. **Ship features together with their tests**: Every PR or feature should include tests proving the new behavior.
2. **Atomic, focused changes**: Keep each feature or fix in its own focused pull request. Avoid bulk commits that mix refactors, features, and formatting.
3. **Reproducible builds**: All changes must pass CI cleanly (`npm run lint`, `npm test`, `npm run build`, and `npm run format:check`).

---

## Development Workflow

### 1. Fork & Clone

```bash
git clone https://github.com/Nonce-firewall/Naijaescrow.git
cd Naijaescrow
npm ci
```

### 2. Branching

Branch off `main` with a descriptive name:

```bash
git checkout -b feature/order-validation
# or
git checkout -b fix/dispute-chat-scroll
```

### 3. Running Locally

```bash
# Start the local development server (http://localhost:3000)
npm run dev

# Or start the full stack with Docker Compose
docker compose up --build
```

### 4. Testing & Code Quality

Always test your changes before submitting:

```bash
# Run unit and integration tests
npm test

# Run tests with coverage report
npm test -- --coverage

# Type check TypeScript codebase
npm run lint

# Check code formatting
npm run format:check
```

### 5. Commit Guidelines

We use conventional commit messages:

- `feat: add order status webhook handler`
- `fix: resolve auth state persistence race condition`
- `test: add unit tests for dispute resolver mapper`
- `refactor: extract KYCTab into standalone component`
- `docs: update installation instructions in README`

### 6. Submitting a Pull Request

- Provide a concise summary of the problem and your solution.
- Verify that GitHub Actions CI checks pass.
- Link any related issue numbers.
- Keep components modular and under 500 lines of code.

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
