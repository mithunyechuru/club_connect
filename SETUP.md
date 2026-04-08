# Project Setup Guide

## Initial Setup

The project structure has been created with all necessary configuration files. Follow these steps to complete the setup:

### 1. Install Dependencies

```bash
npm install
```

This will install all required dependencies including:
- React 18 + TypeScript
- Vite (build tool)
- Material-UI (UI framework)
- Firebase SDK
- React Router
- Jest + React Testing Library
- fast-check (property-based testing)
- ESLint + Prettier

### 2. Install Firebase CLI (for emulators)

```bash
npm install -g firebase-tools
```

### 3. Start Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### 4. Start Firebase Emulators (Optional for local development)

In a separate terminal:
```bash
firebase emulators:start
```

The Firebase Emulator UI will be available at `http://localhost:4000`

Emulator ports:
- Auth: 9099
- Firestore: 8080
- Realtime Database: 9000
- Storage: 9199

### 5. Run Tests

Run all tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

Generate coverage report:
```bash
npm run test:coverage
```

### 6. Code Quality

Run linter:
```bash
npm run lint
```

Format code with Prettier:
```bash
npx prettier --write src/
```

## Project Structure

```
ClubConnect/
├── .kiro/                          # Kiro spec files
├── src/
│   ├── components/                 # React components
│   ├── services/                   # Firebase and API services
│   │   └── firebase.ts            # Firebase configuration
│   ├── types/                      # TypeScript type definitions
│   │   └── index.ts               # Core type definitions
│   ├── utils/                      # Utility functions
│   │   ├── validation.ts          # Validation utilities
│   │   ├── validation.test.ts     # Unit tests
│   │   └── validation.property.test.ts  # Property-based tests
│   ├── hooks/                      # Custom React hooks
│   ├── App.tsx                     # Main application component
│   ├── main.tsx                    # Application entry point
│   ├── index.css                   # Global styles
│   ├── setupTests.ts              # Test configuration
│   └── vite-env.d.ts              # Vite type definitions
├── .env.development                # Development environment variables
├── .env.production                 # Production environment variables
├── .eslintrc.cjs                   # ESLint configuration
├── .prettierrc                     # Prettier configuration
├── .gitignore                      # Git ignore rules
├── firebase.json                   # Firebase emulator configuration
├── index.html                      # HTML entry point
├── jest.config.js                  # Jest configuration
├── package.json                    # Project dependencies
├── tsconfig.json                   # TypeScript configuration
├── tsconfig.node.json             # TypeScript config for Node
├── vite.config.ts                 # Vite configuration
├── README.md                       # Project documentation
└── SETUP.md                        # This file
```

## Environment Variables

The project uses two environment files:

### .env.development (Local development with emulators)
- Uses Firebase emulators for local development
- Set `VITE_USE_FIREBASE_EMULATOR=true`

### .env.production (Production deployment)
- Uses live Firebase services
- Set `VITE_USE_FIREBASE_EMULATOR=false`

## Firebase Configuration

The Firebase configuration is already set up in `src/services/firebase.ts` with the provided credentials:

- Project ID: club-connect-497d8
- Auth Domain: club-connect-497d8.firebaseapp.com
- Database URL: https://club-connect-497d8-default-rtdb.firebaseio.com
- Storage Bucket: club-connect-497d8.firebasestorage.app

## Testing Infrastructure

The project includes comprehensive testing setup:

### Unit Tests
- Framework: Jest + React Testing Library
- Location: `*.test.ts` or `*.test.tsx` files
- Example: `src/utils/validation.test.ts`

### Property-Based Tests
- Framework: fast-check
- Location: `*.property.test.ts` files
- Example: `src/utils/validation.property.test.ts`
- Configuration: 100 runs per property test

### Test Coverage
- Target: 80% overall coverage
- Critical paths: 95% coverage
- Reports generated in `coverage/` directory

## Next Steps

1. Install dependencies: `npm install`
2. Start development server: `npm run dev`
3. Begin implementing features according to the spec tasks
4. Write tests alongside implementation
5. Use Firebase emulators for local development

## Troubleshooting

### npm install fails
- Ensure Node.js 18+ is installed
- Clear npm cache: `npm cache clean --force`
- Delete `node_modules` and `package-lock.json`, then retry

### Firebase emulator issues
- Ensure Firebase CLI is installed: `npm install -g firebase-tools`
- Check if ports are available (9099, 8080, 9000, 9199, 4000)
- Run `firebase emulators:start` in project root

### TypeScript errors
- Run `npm run build` to check for type errors
- Ensure all dependencies are installed
- Check `tsconfig.json` configuration

## Resources

- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Material-UI Documentation](https://mui.com/)
- [Jest Documentation](https://jestjs.io/)
- [fast-check Documentation](https://fast-check.dev/)
