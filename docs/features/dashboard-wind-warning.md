# Feature: Dashboard Strong Wind Warning

**Date:** 30 October 2026 · **Status:** Stage 1 implemented

## Overview

High winds have blown lids off and tumbled hives. When gusts of 90 km/h or more are forecast at an apiary in the next 72 hours, a banner above the seasonal top card says so, with time to strap the hives and weigh down the lids:

> **Strong winds forecast**
> Home: gusts up to 95 km/h, Saturday night
> Strap the hives and weigh down the lids before then.
> Met Éireann warnings (link)

## Rules (agreed with the owner)

- **All year**, for every apiary with hives and valid coordinates.
- **Amber from 90 km/h, red from 110 km/h**, judged on the strongest apiary. These are Met Éireann's yellow and orange gust levels as reported in the Irish press; not confirmed on Met Éireann's own site.
- **One line per apiary**, strongest first, giving that apiary's strongest gust and when.
- **A forecast, not an official warning:** it never says "Status Orange" or similar.
- **Cannot be dismissed.** It goes away once the wind has passed or the forecast improves.

## Data

One Open-Meteo request for all the apiaries (`hourly=wind_gusts_10m`, `timezone=Europe/Dublin`, 4 days, cut to 72 hours). It runs when the dashboard opens and whenever the user returns to the page, cached for 30 minutes per set of locations. No database change; Open-Meteo is already allowed by the Content Security Policy.

| Part | File |
|---|---|
| Levels and strongest gust | `src/lib/wind-warning.ts` |
| Request, cache, re-check | `src/hooks/useWindWarnings.ts` |
| Banner | `src/components/dashboard/WindWarningCard.tsx` |

## Edge cases

- **Calm forecast:** no banner.
- **Request fails:** no banner on a first load, so **no banner does not guarantee calm weather**. A banner already showing stays, and the next check tries again.
- **Apiary without coordinates, or with impossible ones:** left out, so one bad record cannot lose the warning for the others.
- **Missing hours in the forecast:** ignored.

## Stage 2 (not built)

Official Met Éireann warnings for rain, snow, ice and other hazards, from `https://www.met.ie/Open_Data/json/warning_IRELAND.json`. Blocked until each apiary has a reliable county, since apiaries have no county column and no published list of Met Éireann's region codes was found. The licence requires the headline, times and area to be shown unaltered, expired warnings removed, and Met Éireann credited.

Related: [dashboard-today-screen.md](./dashboard-today-screen.md).
