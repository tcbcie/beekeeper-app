/**
 * Changelog utilities for fetching and displaying version changelog entries
 */

import { supabase } from './supabase';

export interface ChangelogEntry {
  id: string;
  version: string;
  date: string;
  entry_type: 'feature' | 'bugfix' | 'improvement' | 'documentation';
  title: string;
  description: string;
  created_at: string;
  is_published: boolean;
}

export interface GroupedChangelog {
  version: string;
  date: string;
  entries: ChangelogEntry[];
}

/**
 * Fetch changelog entries from the database
 * @param limit Maximum number of entries to return (default: 50)
 * @param publishedOnly Only return published entries (default: true)
 * @returns Array of changelog entries
 */
export async function fetchChangelogEntries(
  limit: number = 50,
  publishedOnly: boolean = true
): Promise<ChangelogEntry[]> {
  let query = supabase
    .from('changelog')
    .select('*')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (publishedOnly) {
    query = query.eq('is_published', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching changelog:', error);
    return [];
  }

  return data || [];
}

/**
 * Fetch changelog entries grouped by version
 * @param versionLimit Maximum number of versions to return (default: 5)
 * @returns Array of grouped changelog entries by version
 */
export async function fetchGroupedChangelog(
  versionLimit: number = 5
): Promise<GroupedChangelog[]> {
  const entries = await fetchChangelogEntries(100); // Fetch more to ensure we get enough versions

  // Group entries by version
  const groupedMap = new Map<string, GroupedChangelog>();

  for (const entry of entries) {
    if (!groupedMap.has(entry.version)) {
      groupedMap.set(entry.version, {
        version: entry.version,
        date: entry.date,
        entries: [],
      });
    }
    groupedMap.get(entry.version)!.entries.push(entry);
  }

  // Convert to array and limit versions
  const grouped = Array.from(groupedMap.values())
    .sort((a, b) => {
      // Sort by version (descending) - simple string comparison works for semantic versions
      return compareVersions(b.version, a.version);
    })
    .slice(0, versionLimit);

  return grouped;
}

/**
 * Compare two semantic version strings
 * @param a First version
 * @param b Second version
 * @returns Positive if a > b, negative if a < b, 0 if equal
 */
function compareVersions(a: string, b: string): number {
  const aParts = a.split('.').map(Number);
  const bParts = b.split('.').map(Number);

  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aPart = aParts[i] || 0;
    const bPart = bParts[i] || 0;

    if (aPart > bPart) return 1;
    if (aPart < bPart) return -1;
  }

  return 0;
}

/**
 * Get icon for entry type
 */
export function getEntryTypeIcon(type: string): string {
  switch (type) {
    case 'feature':
      return '★'; // Star for new features
    case 'bugfix':
      return '✓'; // Checkmark for fixes
    case 'improvement':
      return '⚡'; // Lightning for improvements
    case 'documentation':
      return '🔧'; // Wrench for documentation
    default:
      return '•';
  }
}

/**
 * Get color for entry type
 */
export function getEntryTypeColor(type: string): string {
  switch (type) {
    case 'feature':
      return 'text-emerald-600';
    case 'bugfix':
      return 'text-green-600';
    case 'improvement':
      return 'text-blue-600';
    case 'documentation':
      return 'text-purple-600';
    default:
      return 'text-gray-600';
  }
}

/**
 * Format date from ISO string or date string
 */
export function formatChangelogDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
