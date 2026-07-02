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
| Yard Map (2D + 3D) | `profiles.enable_yard_map` | **Yes** + opt-in | `useYardMapEnabled` | `dashboard/apiaries/[id]/map/layout.tsx` |

All columns default to `false` (the feature must be switched on under **Profile →
Preferences**). Logbook is preference-only, mirroring the label-printing toggle —
it is not a premium feature. CRM and Yard Map are premium: their profile toggle
only appears for active subscribers, and the hook ANDs the preference with
`resolveActiveSubscription()`. Unlike CRM/Logbook, Yard Map is **not** a top-level
nav item — it is a Quick Action on the apiary detail page — so it is not part of
the `NavFeature` union; gating is applied to that entry point plus the route guard
(which covers both `/map` and the nested `/map/3d`).

## Live refresh

Each hook caches the preference at module scope (5-min TTL, cleared on auth
change) and listens for a window event. The profile toggle calls
`notifyCrmPrefChanged()` / `notifyLogbookPrefChanged()` on save so the persistent
sidebar updates without a page reload. Each gated route also has a client layout
guard that redirects to `/dashboard` on direct URL access when the feature is off.
