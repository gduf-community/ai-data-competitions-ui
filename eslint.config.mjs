import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextCoreWebVitals,
  ...nextTypescript,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "react-bits-main/**",
    "shadcn-dashboard-landing-template-main/**",
    "launch-ui-main/**",
    "ui-main/**",
    "lucide-main/**",
    "sonner-main/**",
    "recharts-main/**",
    "fullcalendar-main/**",
    "dnd-kit-main/**",
    "public/vendor/**",
  ]),
]);
