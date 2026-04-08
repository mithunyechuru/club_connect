# University Club & Event Management System

A comprehensive web application for managing university clubs, events, and student engagement.

## Features

- User authentication and role-based access control
- Club creation and management
- Event creation, RSVP, and attendance tracking
- Venue booking and conflict detection
- Real-time notifications
- Discussion forums and direct messaging
- Certificate generation
- Gamification with badges and achievements
- Analytics and reporting

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **UI Framework**: Material-UI
- **Backend**: Firebase (Firestore, Realtime Database, Authentication, Storage)
- **Routing**: React Router
- **Testing**: Jest, React Testing Library, fast-check
- **Code Quality**: ESLint, Prettier

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Firebase CLI (for emulator): `npm install -g firebase-tools`

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Start Firebase emulators (in a separate terminal):
```bash
firebase emulators:start
```

The application will be available at `http://localhost:5173`
Firebase Emulator UI will be available at `http://localhost:4000`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate test coverage report
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/     # React components
├── services/       # Firebase and API services
├── types/          # TypeScript type definitions
├── utils/          # Utility functions
├── hooks/          # Custom React hooks
├── App.tsx         # Main application component
└── main.tsx        # Application entry point
```

## Environment Variables

The project uses environment variables for Firebase configuration:

- `.env.development` - Development environment (uses Firebase emulators)
- `.env.production` - Production environment (uses live Firebase)

## Testing

The project uses a comprehensive testing strategy:

- **Unit Tests**: Jest + React Testing Library
- **Property-Based Tests**: fast-check
- **Integration Tests**: Firebase Emulator Suite

Run tests with:
```bash
npm test
```

## Firebase Emulator

The Firebase Emulator Suite allows local development without affecting production data:

- **Auth Emulator**: Port 9099
- **Firestore Emulator**: Port 8080
- **Realtime Database Emulator**: Port 9000
- **Storage Emulator**: Port 9199
- **Emulator UI**: Port 4000

## License

Private - University Project
