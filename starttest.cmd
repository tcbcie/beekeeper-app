@echo off
REM Temporarily rename PostCSS config to avoid Tailwind v4 compatibility issues with test environment
if exist postcss.config.mjs (
    echo Temporarily moving postcss.config.mjs...
    rename postcss.config.mjs postcss.config.mjs.backup
)

REM Run tests
npm run test:run

REM Restore PostCSS config
if exist postcss.config.mjs.backup (
    echo Restoring postcss.config.mjs...
    rename postcss.config.mjs.backup postcss.config.mjs
)

echo.
echo Tests completed!
echo.
echo Other test commands:
echo - npm test           : Run tests in watch mode
echo - npm run test:ui    : Explore tests visually
echo - npm run test:coverage : See test coverage report
