@echo off
REM Restore PostCSS config after running tests
if exist postcss.config.mjs.backup (
    echo Restoring postcss.config.mjs...
    rename postcss.config.mjs.backup postcss.config.mjs
    echo PostCSS config restored successfully!
) else (
    if exist postcss.config.mjs (
        echo PostCSS config is already in place. No backup found.
    ) else (
        echo ERROR: Neither postcss.config.mjs nor postcss.config.mjs.backup found!
    )
)
pause
