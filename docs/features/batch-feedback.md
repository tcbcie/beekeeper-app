# Batch Feedback Feature

Allow consumers to leave star ratings and comments on public honey batches via the trace page.

## Overview

When a consumer scans a QR code and views the public trace page, they can:
- Rate the honey from 1-5 stars
- Leave an optional comment
- Submit feedback anonymously

## Database

### New Table: `batch_feedback`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| batch_id | UUID | FK → batch_runs (required) |
| rating | INTEGER | 1-5 star rating (required) |
| comment | TEXT | Optional feedback comment |
| created_at | TIMESTAMPTZ | When feedback was submitted |

### RLS Policy

- **Insert**: Allow anonymous inserts (public access for consumers)
- **Select**: Only batch owner can view feedback for their batches
- **No update/delete**: Feedback is immutable once submitted

### Database Function

Create `submit_batch_feedback(trace_code, rating, comment)` RPC function:
- Validates trace_code exists and batch is public
- Validates rating is 1-5
- Inserts feedback record
- Returns success/error
- Uses `SECURITY DEFINER` to bypass RLS

## UI Changes

### File: `src/app/(trace)/trace/[batchCode]/page.tsx`

Add feedback section at bottom of trace page:

```
┌─────────────────────────────────────────┐
│  How was this honey?                    │
│                                         │
│  ☆ ☆ ☆ ☆ ☆  (clickable stars)          │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ Share your thoughts (optional)  │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  [Submit Feedback]                      │
│                                         │
│  ✓ Feedback submitted! Thank you.       │
└─────────────────────────────────────────┘
```

### Star Rating Component

- 5 star icons (outline when unselected, filled when selected)
- Hover preview effect
- Click to select rating
- Required before submit

### Feedback Form States

1. **Default**: Stars + comment field + submit button
2. **Submitting**: Button shows loading state
3. **Success**: Show thank you message, hide form
4. **Error**: Show error toast

## Implementation Steps

### Phase 1: Database
1. Create `batch_feedback` table with migration
2. Create `submit_batch_feedback()` RPC function
3. Add RLS policies

### Phase 2: UI
1. Add star rating component to trace page
2. Add comment textarea
3. Add submit button with loading state
4. Handle success/error states
5. Store submission in localStorage to prevent duplicate submissions

## Optional Feedback Toggle

Beekeepers can enable or disable the feedback form per batch via a toggle in the batch form:

- **Field**: `show_feedback` (boolean, default `true`)
- **Location**: Batch form in Honey Provenance tool, below the apiary image toggle
- **Behaviour**: When disabled, the "How was this honey?" section is hidden on the public trace page
- **Backwards compatible**: Existing batches default to `true` (feedback shown)

## Security Considerations

- Rate limiting: Consider adding rate limiting to prevent spam (future enhancement)
- No PII collected: Feedback is anonymous
- Validation: Rating must be 1-5, comment length limited
- Duplicate prevention: Use localStorage to track if user already submitted for this batch

## Beekeeper View

Beekeepers can view feedback in the Traceability tool (Tools → Honey Provenance → Batches):

### Batch Card Display
- Shows star icon + average rating + review count
- Only displayed when feedback exists

### Feedback Modal
- Click feedback icon (MessageSquare) to open modal
- Shows summary: average rating, total reviews
- Lists all reviews with: star rating, comment, date
- Scrollable for many reviews

### Database Functions
- `get_batch_feedback_summary(user_id)` - Returns batch_id, count, average for user's batches
- `get_batch_feedback_details(batch_id, user_id)` - Returns full feedback list for a batch

## Files Modified

| File | Changes |
|------|---------|
| Database | `batch_feedback` table, `submit_batch_feedback()`, `get_batch_feedback_summary()`, `get_batch_feedback_details()` |
| `src/app/(trace)/trace/[batchCode]/page.tsx` | Added FeedbackForm component |
| `src/components/trace/FeedbackForm.tsx` | Consumer feedback form (stars + comment) |
| `src/components/tools/TraceabilityTool.tsx` | Beekeeper feedback view (summary + modal) |

## Verification

1. Navigate to a public trace page
2. Click stars to select rating (1-5)
3. Optionally enter a comment
4. Click Submit
5. Verify success message appears
6. Refresh page - form should be hidden (localStorage tracks submission)
7. Check database for new feedback record
