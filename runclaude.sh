#!/usr/bin/env bash
# Linux version of runclaude.cmd: continue the last Claude Code session in this project.
# CLAUDE_CODE_USE_POWERSHELL_TOOL is left out: it only applies on Windows.
cd "$(dirname "$0")" || exit 1
exec claude -c --dangerously-skip-permissions "$@"
