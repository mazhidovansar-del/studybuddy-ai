# StudyBuddy AI

A personal study workspace that turns course notes into structured summaries, flashcards, and quizzes. The web app uses Next.js, React, and TypeScript; Firebase Authentication and Firestore provide sign-in and per-user storage; Google Gemini generates study materials.

## Features

- Sign in with Google or email and password.
- Upload PDF, TXT, and Markdown study material. PDF text is extracted in the browser; source files are not uploaded or stored.
- Save extracted notes and generated study packs to Firestore under the authenticated user's account.
- Generate a structured summary, key points, flashcards, and multiple-choice quiz.
- Edit, search, organize, and export study material.

Text sent to the study-generation action is processed by the configured Gemini API. Configure Firebase Authentication and Firestore rules for your Firebase project before use. Firebase web configuration is supplied through build-time public environment variables; it identifies the Firebase project and is not an Admin credential. Keep Admin credentials and the Gemini API key in server-only environment variables.

## Local development

1. Install Node.js 22.13 or later.
2. Copy `.env.example` to `.env.local` and fill in the Firebase web configuration and Gemini API key for your own project.
3. Put the Firebase Admin service-account JSON in `FIREBASE_SERVICE_ACCOUNT_JSON` as a single-line JSON value, or place a local-only `.firebase-service-account.json` in the project root.
4. Run `npm ci`, then `npm run dev` and open `http://localhost:5173`.

Never commit `.env.local`, `.dev.vars`, a service-account file, or provider credentials. Do not paste keys into source code.

## Netlify deployment

Build command: `npm run build`. Set the following variables in Netlify for the build and Functions runtime as appropriate, then deploy:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` (optional)
- `FIREBASE_SERVICE_ACCOUNT_JSON` (server only; Functions scope)
- `GEMINI_API_KEY` (server only; Functions scope)

Add the deployed domain to Firebase Authentication's authorized domains. Review Firebase security rules and API-key restrictions for your project.

## Commands

- `npm run dev` starts the local development server.
- `npm run build` creates a production build.
- `npm start` serves the built app locally.
- `npm test` runs the focused automated checks.
- `npm run lint` runs ESLint.
