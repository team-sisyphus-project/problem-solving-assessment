import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// 컴포넌트 계약 검증용 러너 설정. jsdom + Testing Library로 BriefScreen을
// 실제 렌더해 배정 문제 노출·격리(SC-2/M-2)를 자동 검증한다. 브라우저 자동화
// (Playwright 등)는 범위 밖 — 순수 단위/컴포넌트 레벨로만 계약을 검증한다.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    include: ["test/**/*.test.{ts,tsx}"],
  },
});
