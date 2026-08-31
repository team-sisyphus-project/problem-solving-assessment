import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// PORT may be injected via env (BASELINE convention). vite preview binds with
// --host, and the port prefers the PORT environment variable.
const port = process.env.PORT ? Number(process.env.PORT) : 5173;

export default defineConfig({
  plugins: [react()],
  server: { host: true, port },
  preview: { host: true, port },
});
