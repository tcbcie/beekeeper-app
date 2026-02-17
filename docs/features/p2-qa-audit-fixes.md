# P2 QA Audit Fixes

## Overview
This batch addresses 25 P2 issues from the QA audit. After investigation, 7 were already fixed or not real issues, 3 were skipped (too risky/complex for the value), and 11 fixes were applied across 10 files.

## Fixes Applied

### Security
| ID | File | Description |
|----|------|-------------|
| SEC-10 | `src/components/chat/ChatMessage.tsx` | Only allow `http(s)` URLs in chat markdown links; blocks `javascript:` XSS |
| SEC-11 | `src/app/api/news/search/route.ts` | Cap search query length at 500 characters to prevent cost escalation |
| SEC-12 | `src/app/api/admin/knowledge-base/route.ts` | SSRF protection: HTTPS-only, block private/internal IPs |

### State Management
| ID | File | Description |
|----|------|-------------|
| STATE-7 | `src/hooks/useDashboardStats.ts` | `mountedRef` guards prevent setState after unmount |
| STATE-8 | `src/hooks/useImageUpload.ts` | `mountedRef` guards prevent setState/onError after unmount |
| STATE-9 | `src/lib/push-notifications.ts` | Flag prevents duplicate service worker message listeners on hot reload |

### Performance
| ID | File | Description |
|----|------|-------------|
| PERF-11 | `src/hooks/useHiveDetail.ts` | Single-pass inspection averages calculation (was 6 passes) |
| PERF-12 | `src/hooks/useRecordsData.ts` | Dropdown options only fetched once per mount |
| PERF-13 | `src/components/UpcomingEvents.tsx` | `priorityOrder` moved to module-level constant |

### Error Handling
| ID | File | Description |
|----|------|-------------|
| ERR-12 | `src/hooks/useImageUpload.ts` | Magic bytes validation rejects renamed non-image files |

### Code Quality
| ID | File | Description |
|----|------|-------------|
| QUAL-7 | `src/components/RenewSubscriptionModal.tsx` | Added justification to eslint-disable comment |

## Skipped Items (Already Fixed / Not Real)
SEC-13, SEC-14, ERR-11, ERR-13, PERF-9, PERF-14, QUAL-8

## Skipped Items (Too Risky / Complex)
SEC-15, ERR-14, QUAL-6
