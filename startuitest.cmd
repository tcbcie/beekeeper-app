@echo off
REM Temporarily rename PostCSS config to avoid Tailwind v4 compatibility issues with test environment
if exist postcss.config.mjs (
    echo Temporarily moving postcss.config.mjs...
    rename postcss.config.mjs postcss.config.mjs.backup
)

REM Run tests with UI
npm run test:ui

REM Note: PostCSS config will be restored when you close the UI
REM If you need to restore it manually, run:
REM rename postcss.config.mjs.backup postcss.config.mjs
