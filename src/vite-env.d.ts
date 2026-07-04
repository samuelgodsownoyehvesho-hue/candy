/// <reference types="vite/client" />

// Grok API credentials are deliberately NOT exposed here as VITE_-prefixed
// client env vars — see .env.example and api/grok-sync.js. The Vercel
// serverless function reads GROK_API_KEY server-side via process.env;
// nothing Grok-related is bundled into client-side code.
