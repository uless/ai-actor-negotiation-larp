# Ending generator

This instructor-only app matches a class deal to one of five fixed endings. It supports OpenAI and Anthropic. The browser never receives the provider API key, and the server does not save or log the deal text.

## Configuration

Copy `.env.example` to `.env.local` for local development. Choose your own `TEACHER_CODE`, provider, model, and API key. If `LLM_API_KEY` is absent, the app uses deterministic demo rules and labels the screen `Demo`.

Set `LLM_PROVIDER` to `openai` or `anthropic`. `LLM_BASE_URL` is optional for an OpenAI-compatible endpoint or proxy. Other providers can be added in `lib/core.mjs` by following the same adapter pattern.

For Vercel, set the Root Directory to this folder and add the same variables in the project settings.

## Checks

```bash
npm run check
npm test
```

The API allows 30 ending requests per client address in one hour.
