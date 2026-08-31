import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Runner configuration for component contract verification. Actually renders
// BriefScreen with jsdom + Testing Library to automatically verify assigned
// problem exposure and isolation (SC-2/M-2). Browser automation (Playwright
// and the like) is out of scope — contracts are verified purely at the
// unit/component level.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    include: ["test/**/*.test.{ts,tsx}"],
  },
});
