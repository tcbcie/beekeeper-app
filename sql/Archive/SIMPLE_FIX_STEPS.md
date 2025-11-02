# ✅ SIMPLE FIX: Team Invitation Decline Error

## Do These 3 Steps IN ORDER:

### 📝 STEP 1: Run This SQL
Go to **Supabase Dashboard** → **SQL Editor** → Paste and run:

```sql
ALTER TABLE public.team_invitations
ADD COLUMN IF NOT EXISTS declined_at TIMESTAMPTZ;
```

### 🔄 STEP 2: Restart PostgREST
Go to **Supabase Dashboard** → **Project Settings** → **API** → Find **PostgREST** section → Click **Restart**

(If you don't see a restart button, run this SQL instead:)
```sql
NOTIFY pgrst, 'reload schema';
```

Then **wait 2 minutes**.

### 🧪 STEP 3: Test
1. **Clear your browser cache** (Ctrl+Shift+Delete)
2. **Or open Incognito window**
3. Try declining the invitation again

---

## ⚡ FASTEST FIX (if you have Supabase CLI):

```bash
# Add the column
supabase db execute "ALTER TABLE public.team_invitations ADD COLUMN IF NOT EXISTS declined_at TIMESTAMPTZ;"

# Reload schema
supabase db execute "NOTIFY pgrst, 'reload schema';"
```

---

## 🔍 Verify It Worked

Run this SQL to confirm the column exists:

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'team_invitations'
  AND column_name = 'declined_at';
```

Should return: `declined_at`

---

## ❌ Still Not Working?

1. **Wait 10-15 minutes** (schema cache can be stubborn)
2. **Try in Incognito mode** (eliminates browser caching)
3. **Check** [TROUBLESHOOT_406_ERROR.md](TROUBLESHOOT_406_ERROR.md) for advanced debugging

---

## 📋 What This Fixes

- ❌ Before: `Could not find the 'declined_at' column`
- ✅ After: Decline invitation works properly
- ✅ Tracks when invitations are declined (like `accepted_at` for accepts)
