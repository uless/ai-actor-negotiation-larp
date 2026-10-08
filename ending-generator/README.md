# Ending generator

This instructor-only app matches a class deal to one of five fixed endings. The browser never receives the Anthropic API key, and the server does not save or log the deal text.

## Configuration

Copy `.env.example` to `.env.local` for local development. Choose your own `TEACHER_CODE`. If `ANTHROPIC_API_KEY` is absent, the app uses deterministic demo rules and labels the screen `Demo`.

For Vercel, set the Root Directory to this folder and add the same variables in the project settings.

## Checks

```bash
npm run check
npm test
```

The API allows 30 ending requests per client address in one hour.
