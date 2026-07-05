/// <reference types="vite/client" />

// Groq API credentials are deliberately NOT exposed here as VITE_-prefixed
// client env vars — see .env.example and api/whisper-transcribe.js. The
// Vercel serverless function reads GROQ_API_KEY server-side via
// process.env; nothing Groq-related is bundled into client-side code.
