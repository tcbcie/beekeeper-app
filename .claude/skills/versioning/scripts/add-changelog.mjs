#!/usr/bin/env node
/**
 * Add Changelog Entry to Database
 *
 * This script adds a changelog entry to the database for a specific version.
 * It connects to Supabase and inserts the entry.
 *
 * Usage:
 *   node scripts/add-changelog.mjs <version> <type> <title> <description>
 *
 * Examples:
 *   node scripts/add-changelog.mjs 1.0.12 bugfix "Fixed login error" "Resolved issue where users couldn't log in with Google OAuth"
 *   node scripts/add-changelog.mjs 1.1.0 feature "Team Tasks" "Team members can now close tasks for shared hives"
 *
 * Types:
 *   feature       - New functionality
 *   bugfix        - Bug fixes
 *   improvement   - Enhancements to existing features
 *   documentation - Documentation updates
 */

import { createClient } from '@supabase/supabase-js';
import * as readline from 'readline';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..', '..', '..', '..');

// Read Supabase credentials from environment or .env.local
let supabaseUrl, supabaseKey;

try {
  const envPath = join(ROOT_DIR, '.env.local');
  const envContent = readFileSync(envPath, 'utf8');

  const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
  const keyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/);

  if (urlMatch && keyMatch) {
    supabaseUrl = urlMatch[1].trim();
    supabaseKey = keyMatch[1].trim();
  }
} catch (error) {
  console.error('❌ Error reading .env.local file');
  console.log('   Make sure .env.local exists with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Supabase credentials not found');
  console.log('   Add these to .env.local:');
  console.log('   NEXT_PUBLIC_SUPABASE_URL=your-url');
  console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  const args = process.argv.slice(2);

  let version, entryType, title, description;

  // Check if arguments were provided
  if (args.length >= 4) {
    [version, entryType, title, description] = args;
  } else {
    // Interactive mode
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║      Add Changelog Entry               ║');
    console.log('╚════════════════════════════════════════╝\n');

    // Read version from version.json
    try {
      const versionFile = join(ROOT_DIR, 'version.json');
      const versionData = JSON.parse(readFileSync(versionFile, 'utf8'));
      version = versionData.version;
      console.log(`📦 Version: ${version} (from version.json)\n`);
    } catch (error) {
      version = await prompt('📦 Version (e.g., 1.0.12): ');
    }

    console.log('📝 Entry Types:');
    console.log('   1. feature       - New functionality');
    console.log('   2. bugfix        - Bug fixes');
    console.log('   3. improvement   - Enhancements to existing features');
    console.log('   4. documentation - Documentation updates\n');

    const typeChoice = await prompt('🔢 Select type (1-4): ');
    const types = ['feature', 'bugfix', 'improvement', 'documentation'];
    entryType = types[parseInt(typeChoice) - 1] || 'feature';

    title = await prompt('📌 Title (brief summary): ');
    description = await prompt('📄 Description (detailed): ');
  }

  // Validate entry type
  const validTypes = ['feature', 'bugfix', 'improvement', 'documentation'];
  if (!validTypes.includes(entryType)) {
    console.error(`❌ Error: Invalid entry type "${entryType}"`);
    console.log(`   Valid types: ${validTypes.join(', ')}`);
    process.exit(1);
  }

  // Validate inputs
  if (!version || !title || !description) {
    console.error('❌ Error: All fields are required');
    console.log('   Usage: node scripts/add-changelog.mjs <version> <type> <title> <description>');
    process.exit(1);
  }

  // Get current date
  const date = new Date().toISOString().split('T')[0];

  console.log('\n📊 Changelog Entry:');
  console.log(`   Version: ${version}`);
  console.log(`   Type: ${entryType}`);
  console.log(`   Title: ${title}`);
  console.log(`   Description: ${description}`);
  console.log(`   Date: ${date}\n`);

  const confirm = await prompt('✅ Add this entry? (y/N): ');
  if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
    console.log('\n❌ Cancelled');
    process.exit(0);
  }

  // Insert into database
  try {
    const { data, error } = await supabase
      .from('changelog')
      .insert([{
        version,
        date,
        entry_type: entryType,
        title,
        description,
        is_published: true
      }])
      .select();

    if (error) {
      console.error('\n❌ Error inserting changelog entry:', error.message);
      console.log('\n💡 Troubleshooting:');
      console.log('   • Check that the changelog table exists');
      console.log('   • Verify Supabase credentials in .env.local');
      console.log('   • Ensure you have permission to insert entries');
      process.exit(1);
    }

    console.log('\n✅ Changelog entry added successfully!\n');
    console.log('📝 Entry ID:', data[0].id);
    console.log('\n💡 View it in the About page after deployment');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
