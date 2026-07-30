import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// PORT는 env로 주입될 수 있다(BASELINE 규약). vite preview는 --host로 바인딩하고
// 포트는 PORT 환경변수를 우선 사용한다.
const port = process.env.PORT ? Number(process.env.PORT) : 5173;

export default defineConfig({
  plugins: [react()],
  server: { host: true, port },
  preview: { host: true, port },
});
