'use client'

import { useEffect, useState } from 'react';
import {
  fetchGroupedChangelog,
  type GroupedChangelog,
  getEntryTypeIcon,
  getEntryTypeColor,
  formatChangelogDate,
} from '@/lib/changelog';

interface ChangelogDisplayProps {
  versionLimit?: number;
}

export default function ChangelogDisplay({ versionLimit = 5 }: ChangelogDisplayProps) {
  const [changelog, setChangelog] = useState<GroupedChangelog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadChangelog() {
      try {
        setLoading(true);
        const data = await fetchGroupedChangelog(versionLimit);
        setChangelog(data);
        setError(null);
      } catch (err) {
        console.error('Error loading changelog:', err);
        setError('Failed to load changelog');
      } finally {
        setLoading(false);
      }
    }

    loadChangelog();
  }, [versionLimit]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-800 dark:text-red-300">
        <p>{error}</p>
      </div>
    );
  }

  if (changelog.length === 0) {
    return (
      <div className="bg-sage-50 dark:bg-slate-800 border border-border rounded-lg p-6 text-text-secondary text-center">
        <p>No changelog entries found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {changelog.map((versionGroup, index) => (
        <div key={versionGroup.version}>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <span className={`px-2 py-1 text-xs rounded font-semibold ${
              index === 0
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-sage-100 dark:bg-slate-700 text-text-secondary'
            }`}>
              v{versionGroup.version}
            </span>
            {formatChangelogDate(versionGroup.date)}
          </h3>
          <ul className="mt-3 space-y-2 text-text-secondary">
            {versionGroup.entries.map((entry) => (
              <li key={entry.id} className="flex items-start gap-2">
                <span className={`mt-1 ${getEntryTypeColor(entry.entry_type)}`}>
                  {getEntryTypeIcon(entry.entry_type)}
                </span>
                <span>
                  <strong>{entry.title}:</strong> {entry.description}
                </span>
              </li>
            ))}
          </ul>
          {index < changelog.length - 1 && (
            <div className="mt-6 border-t border-border pt-6"></div>
          )}
        </div>
      ))}

      {changelog.length >= versionLimit && (
        <div className="mt-6 text-center text-sm text-text-tertiary">
          <p>Showing last {versionLimit} versions</p>
        </div>
      )}
    </div>
  );
}
