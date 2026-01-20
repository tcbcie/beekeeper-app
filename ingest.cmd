@echo off
setlocal enabledelayedexpansion

:: Ingest Documents Script for HiveCraic Knowledge Base
:: Wrapper for node scripts/ingest-documents.mjs

if "%~1"=="" goto :help
if "%~1"=="--help" goto :help
if "%~1"=="-h" goto :help
if "%~1"=="/?" goto :help

:: Pass all arguments to the node script
node scripts/ingest-documents.mjs %*
goto :end

:help
echo.
echo ========================================
echo  HiveCraic Knowledge Base Ingestion Tool
echo ========================================
echo.
echo USAGE:
echo   ingest ^<directory^>        Ingest all PDFs from a directory
echo   ingest --list             List all ingested sources
echo   ingest --delete ^<id^>      Delete a source by ID
echo   ingest --help             Show this help message
echo.
echo OPTIONS:
echo   --force     Re-ingest files even if already in database (duplicates)
echo   --ocr       Force OCR processing for all files (skip standard pdf-parse)
echo   --gemini    Force Gemini 2.0 Flash for OCR and translation
echo.
echo EXAMPLES:
echo   ingest "C:\Documents\Beekeeping PDFs"
echo   ingest ".\pdfs" --force
echo   ingest ".\pdfs" --gemini
echo   ingest ".\pdfs" --force --ocr
echo   ingest --list
echo   ingest --delete abc12345
echo.
echo FILENAME FORMAT (for automatic metadata extraction):
echo   Author (Year) Title.pdf
echo   Example: "Preuss (1919) Meine Betriebsweise.pdf"
echo.
echo ENVIRONMENT VARIABLES REQUIRED (in .env.local):
echo   NEXT_PUBLIC_SUPABASE_URL    - Supabase project URL
echo   SUPABASE_SERVICE_ROLE_KEY   - Supabase service role key
echo   OPENAI_API_KEY              - OpenAI API key (embeddings, OCR fallback)
echo   GOOGLE_API_KEY              - Google API key (optional, for Gemini)
echo.
echo CONFIG FILE (optional):
echo   scripts\ingest\ingestion.config.json
echo   - chunkSize: characters per chunk (default: 1000)
echo   - chunkOverlap: overlap between chunks (default: 200)
echo   - ocrProviderPreference: "gemini" or "openai"
echo   - translationProviderPreference: "gemini" or "openai"
echo.

:end
endlocal
