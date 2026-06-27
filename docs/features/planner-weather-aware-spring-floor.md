# Planner: weather-aware spring/summer trade-off (Option B)

> **Status: SUPERSEDED.** The weather *trimming of the spring window* was reverted — feeding the
> forecast into the model dragged the recommended break far too early. The forecast is now shown as a
> **judgment-call note only**, and the recommendation is floored at the start of swarm season. The
> spring-strength floor (the trade-off slider) was kept. See `tbr-swarm-planner.md` for the current
> behaviour. The original design is retained below for history.

## Why

Today the planner refuses to break before the spring crop is fully off (`T ≥ spring-crop end`),
so it always protects the spring crop at full forager strength and only optimises the summer flow.
That removes a genuine choice: a beekeeper may accept the spring crop **tailing off on a declining
forager force** in exchange for a **stronger force for the summer crop**.

Crucially, the spring crop's *real* end is **weather-gated**: if the 10-day forecast has no foraging
opportunities, the remaining bloom yields nothing and breaking early costs nothing.

## Approach (confirmed: Option B, weather-aware)

A soft **"protect spring strength ≥ X %" floor** replaces the hard "break only after spring end"
constraint, with the spring window trimmed by the forecast.

### 1. Weather-effective spring end
- Fetch the apiary's **10-day** daily forecast (Open-Meteo forecast API — reuse the pattern in
  `VarroaWeather.tsx`): `temperature_2m_max/min`, `sunshine_duration`, `precipitation_sum`.
- Score each day with the existing **`calculateForagingHours()`** (`lib/gdd`); a day is a
  **foraging day** if it has **≥ 1 flyable hour** (the app's authoritative 12 °C / sunshine / rain rule).
- `effectiveSpringEnd = min(bloom-end, last foraging day in the horizon)`. A no-fly forecast near
  the end of bloom collapses the spring window toward today → the spring crop is "finished".

### 2. Acceptable-decline floor (the slider)
- `springFloor` ∈ 50–100 % (default **80 %**).
- Relaxed `earliest` = the earliest break date `T` that keeps **spring coverage ≥ floor**, where
  spring coverage = average forager strength over `[springStart, effectiveSpringEnd]`
  (reusing the `flowCoverage` maths on the spring window). If that window is empty (weather has
  ended the crop), the floor is satisfied trivially and `earliest` drops to today / `sliderEarliest`.

### 3. Recommendation
- Unchanged objective (maximise summer coverage), now searched within the relaxed, weather-aware
  `[earliest, latest]`. So a poor spring forecast (or a lower floor) lets it recommend an earlier
  break for a stronger summer.

### 4. UI
- **"Protect spring strength ≥ X %"** slider (default 80 %).
- A **forecast note**: *"Next 10 days: 2 foraging days"* — or *"No foraging weather forecast →
  spring crop treated as finished."*
- A **dual coverage readout**: *Spring 82 % · Summer 71 %* at the chosen date, so the trade-off is visible.
- The existing "earlier than feasible" slider warning is reframed to reference the floor.

## Maths

- `springCoverage(T)` = average `foragerForceAtOffset` over `[springStart, effectiveSpringEnd]` ÷ steady (0..1).
- Relaxed `earliest` = smallest `T ≥ sliderEarliest` with `springCoverage(T) ≥ floor` (bounded scan);
  spring coverage rises with later `T`, so this is the earliest break that honours the floor.

## Files to change

| File | Change |
|------|--------|
| `src/lib/tbr-model.ts` | `springCoverage()` helper (or reuse `flowCoverage` on the spring window); `planFromResolved` takes `effectiveSpringEnd` + `springFloor` and computes the relaxed `earliest`; expose `springCoverageScore` in the plan |
| `src/hooks/useTbrPlanner.ts` | Fetch the 10-day forecast; classify foraging days via `calculateForagingHours`; compute `effectiveSpringEnd` + a forecast summary; `springFloor` persisted state; thread into the plan; expose |
| `src/components/tools/TBRPlanner.tsx` | Spring-floor slider; forecast note; dual Spring/Summer coverage readout |
| `docs/features/tbr-swarm-planner.md` | Document the trade-off + weather gating |

No DB change. Reuses `calculateForagingHours` and the Open-Meteo forecast pattern (DRY).

## Defaults

- Forecast horizon: **10 days**. Foraging day: **≥ 1 flyable hour**. Spring floor default: **80 %**.

## Out of scope

- Per-day flyable weighting *inside* the spring window (we trim at the last foraging day; interspersed
  no-fly days mid-window are a second-order effect).
- Forecasting weather beyond the API horizon (assume normal foraging past it; bloom-end still caps).
