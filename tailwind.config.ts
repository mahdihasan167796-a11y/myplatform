import type { Config } from "tailwindcss";

// Tailwind v4 is CSS-first — postcss.config.mjs + the @import in
// app/globals.css do the actual work of wiring Tailwind into the build.
// This file isn't required for that to function; it's kept here, empty,
// as the place to add custom theme tokens or plugins later if @theme in
// CSS ever isn't enough on its own.
const config: Config = {};

export default config;
