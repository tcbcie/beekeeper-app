// Use empty plugins in test environment to avoid Tailwind issues
const config = {
  plugins: process.env.VITEST ? [] : ["@tailwindcss/postcss"],
};

export default config;
