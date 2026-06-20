# Navigation feature gating

Some menu items are hidden behind a per-user profile toggle so the sidebar only
shows what each beekeeper actually uses.

## Mechanism

`NavItem` in `src/lib/navigation.ts` has an optional `feature?: NavFeature`
(`'crm' | 'logbook'`). Items live in their normal group (e.g. **Activity**); the
renderers drop the ones whose feature isn't enabled via:

```ts
filterByFeatures(items, { crm: crmEnabled, logbook: logbookEnabled })
```

`Sidebar` and `MobileDrawer` build that flags object from the gating hooks and
filter each group; a group that ends up empty isn't rendered. The mobile bottom
nav bar only ever shows `bottomNav` items, none of which are feature-gated.

## Gated features

| Feature | Column | Subscription? | Hook | Route guard |
|---------|--------|---------------|------|-------------|
| CRM (Customers, Orders) | `profiles.enable_crm` | **Yes** + opt-in | `useCrmEnabled` | `dashboard/crm/layout.tsx` |
| Logbook | `profiles.enable_logbook` | No — opt-in only | `useLogbookEnabled` | `dashboard/logbook/layout.tsx` |

Both columns default to `false` (the feature must be switched on under **Profile →
Preferences**). Logbook is preference-only, mirroring the label-printing toggle —
it is not a premium feature. Customers and Orders now sit in the **Activity**
group (after Tasks & Events) rather than a separate "Sales" section.

## Live refresh

Each hook caches the preference at module scope (5-min TTL, cleared on auth
change) and listens for a window event. The profile toggle calls
`notifyCrmPrefChanged()` / `notifyLogbookPrefChanged()` on save so the persistent
sidebar updates without a page reload. Each gated route also has a client layout
guard that redirects to `/dashboard` on direct URL access when the feature is off.
