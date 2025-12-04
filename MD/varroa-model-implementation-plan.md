# Randy's Varroa Model - Web Application Implementation Plan

## Executive Summary

This document provides a comprehensive plan to implement Randy's Varroa Mite Population Model as a modern web application using Next.js, React, TypeScript, Tailwind CSS, and Supabase. The goal is to replicate and enhance the functionality of the Excel model while providing a better user experience through real-time calculations, interactive charts, and persistent data storage.

---

## 1. Model Analysis Summary

### 1.1 Core Functionality

The Excel model simulates Varroa destructor mite population dynamics in honey bee colonies over a full year (24 bi-weekly periods). Key features include:

- **Population Growth Modeling**: Exponential growth using r-values (intrinsic rate of increase)
- **Treatment Efficacy Simulation**: Multiple treatment types with varying efficacies
- **Colony Type Templates**: 9 predefined colony profiles for different scenarios
- **Mite Immigration Modeling**: 5 preset immigration scenarios based on apiary environment
- **Dynamic Calculations**: Real-time updates based on colony conditions, brood levels, and treatments
- **Collapse Risk Assessment**: Tracks % of worker cells invaded (>30% indicates collapse risk)

### 1.2 Key Input Parameters

| Parameter | Type | Options/Range |
|-----------|------|---------------|
| Colony Type | Selection | D (Default), N (Nuc), P (Package), A (Custom), B (High-latitude), C (California), R (Randy's almonds), S (Swarming), F (Feral) |
| Starting Mite Population | Number | Typically 10-500 |
| Mite Immigration Level | Selection | 0 (No neighbors), 1 (Managed), 2 (Troubled), 3 (Collapsing ferals), 4 (Treatment-free urban), X (Custom) |
| Hemisphere | Toggle | Northern / Southern |
| Treatment Schedule | Per-period values | 0-100% reduction per period |

### 1.3 Calculated Outputs (Per Period)

- Varroa population at start of period
- Net daily rate of mite increase (r-value)
- Mite immigration from drift
- Estimated % of worker cells invaded
- Estimated % of mites phoretic (for treatment efficacy)
- Adult bee population
- Brood cell count
- Drone brood percentage

### 1.4 Core Mathematical Model

```
Mite Population Growth: P(t+1) = P(t) × e^(r × days) + immigration - (P(t) × treatment_efficacy)

Where:
- P(t) = mite population at time t
- r = daily intrinsic rate of increase (varies by season: -0.005 to +0.051)
- days = period length (typically 14-16 days)
- immigration = mites entering from external sources
- treatment_efficacy = % mites killed (adjusted for % phoretic)
```

---

## 2. Technology Stack

### 2.1 Frontend
- **Next.js 14+** - App Router with Server Components
- **React 18+** - UI components with hooks
- **TypeScript** - Type safety throughout
- **Tailwind CSS** - Utility-first styling
- **Recharts** or **Chart.js** - Interactive data visualization
- **React Hook Form + Zod** - Form handling and validation
- **Framer Motion** - Smooth animations for UX

### 2.2 Backend
- **Supabase** - PostgreSQL database, authentication, row-level security
- **Next.js API Routes** - Server-side logic where needed
- **Edge Functions** - Complex calculations if needed

### 2.3 Development Tools
- **ESLint + Prettier** - Code quality
- **Jest + React Testing Library** - Unit/integration testing
- **Playwright** - E2E testing
- **Storybook** - Component documentation

---

## 3. Database Schema

### 3.1 Core Tables

```sql
-- Users (handled by Supabase Auth, extended with profile)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  location TEXT,
  hemisphere TEXT DEFAULT 'northern' CHECK (hemisphere IN ('northern', 'southern')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Colony Type Templates (predefined + user custom)
CREATE TABLE colony_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  code CHAR(1) UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Colony Type Period Data (24 periods per colony type)
CREATE TABLE colony_type_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colony_type_id UUID REFERENCES colony_types(id) ON DELETE CASCADE,
  period_index INTEGER NOT NULL CHECK (period_index BETWEEN 0 AND 24),
  period_date DATE NOT NULL,
  is_cold_period BOOLEAN DEFAULT FALSE,
  is_nectar_flow BOOLEAN DEFAULT FALSE,
  brood_frames DECIMAL(4,2) DEFAULT 0,
  bee_frames DECIMAL(4,2) DEFAULT 0,
  drone_brood_pct DECIMAL(4,3) DEFAULT 0,
  UNIQUE(colony_type_id, period_index)
);

-- Mite Immigration Presets
CREATE TABLE immigration_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  level INTEGER NOT NULL CHECK (level BETWEEN 0 AND 5),
  name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Immigration Period Data
CREATE TABLE immigration_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preset_id UUID REFERENCES immigration_presets(id) ON DELETE CASCADE,
  period_index INTEGER NOT NULL CHECK (period_index BETWEEN 0 AND 24),
  mite_count INTEGER DEFAULT 0,
  UNIQUE(preset_id, period_index)
);

-- Treatment Types Reference
CREATE TABLE treatment_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  efficacy_min DECIMAL(4,3),
  efficacy_max DECIMAL(4,3),
  requires_broodless BOOLEAN DEFAULT FALSE,
  duration_days INTEGER DEFAULT 1,
  notes TEXT,
  sort_order INTEGER DEFAULT 0
);

-- User Simulations (saved scenarios)
CREATE TABLE simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  colony_type_id UUID REFERENCES colony_types(id),
  starting_mite_population INTEGER DEFAULT 100,
  immigration_preset_id UUID REFERENCES immigration_presets(id),
  hemisphere TEXT DEFAULT 'northern',
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Simulation Treatments (per period)
CREATE TABLE simulation_treatments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id UUID REFERENCES simulations(id) ON DELETE CASCADE,
  period_index INTEGER NOT NULL CHECK (period_index BETWEEN 0 AND 24),
  treatment_type_id UUID REFERENCES treatment_types(id),
  efficacy_override DECIMAL(4,3),
  notes TEXT,
  UNIQUE(simulation_id, period_index)
);

-- Simulation Results Cache (optional - for quick loading)
CREATE TABLE simulation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id UUID REFERENCES simulations(id) ON DELETE CASCADE,
  period_index INTEGER NOT NULL,
  period_date DATE NOT NULL,
  mite_population DECIMAL(10,2),
  r_value DECIMAL(8,6),
  mite_immigration INTEGER,
  pct_cells_invaded DECIMAL(5,3),
  pct_mites_phoretic DECIMAL(5,3),
  adult_bees INTEGER,
  brood_cells INTEGER,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(simulation_id, period_index)
);

-- Audit/History
CREATE TABLE simulation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id UUID REFERENCES simulations(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES profiles(id),
  change_type TEXT NOT NULL,
  previous_values JSONB,
  new_values JSONB,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.2 Row-Level Security Policies

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE colony_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulations ENABLE ROW LEVEL SECURITY;
-- ... etc for all tables

-- Example policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can view system colony types"
  ON colony_types FOR SELECT
  USING (is_system = TRUE OR user_id = auth.uid());

CREATE POLICY "Users can manage own simulations"
  ON simulations FOR ALL
  USING (user_id = auth.uid());
```

---

## 4. Application Architecture

### 4.1 Directory Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   ├── register/
│   │   └── forgot-password/
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx                 # Dashboard home
│   │   ├── simulations/
│   │   │   ├── page.tsx             # List simulations
│   │   │   ├── new/page.tsx         # Create new
│   │   │   └── [id]/
│   │   │       ├── page.tsx         # View/edit simulation
│   │   │       └── results/page.tsx # Detailed results
│   │   ├── colony-types/
│   │   │   ├── page.tsx             # Manage colony types
│   │   │   └── [id]/page.tsx        # Edit custom type
│   │   ├── treatments/
│   │   │   └── page.tsx             # Treatment reference
│   │   └── settings/
│   │       └── page.tsx             # User preferences
│   ├── api/
│   │   ├── simulations/
│   │   ├── calculations/
│   │   └── export/
│   ├── layout.tsx
│   └── page.tsx                     # Landing page
├── components/
│   ├── ui/                          # Base UI components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── slider.tsx
│   │   ├── tooltip.tsx
│   │   └── ...
│   ├── charts/
│   │   ├── MitePopulationChart.tsx
│   │   ├── BroodBeeRatioChart.tsx
│   │   ├── TreatmentTimelineChart.tsx
│   │   └── ColonyHealthGauge.tsx
│   ├── simulation/
│   │   ├── SimulationForm.tsx
│   │   ├── ColonyTypeSelector.tsx
│   │   ├── TreatmentScheduler.tsx
│   │   ├── ImmigrationSelector.tsx
│   │   ├── ResultsPanel.tsx
│   │   └── PeriodDataTable.tsx
│   ├── colony/
│   │   ├── ColonyTypeEditor.tsx
│   │   ├── PeriodEditor.tsx
│   │   └── ColonyPreview.tsx
│   └── layout/
│       ├── Header.tsx
│       ├── Sidebar.tsx
│       ├── Footer.tsx
│       └── Navigation.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── calculations/
│   │   ├── varroa-model.ts          # Core calculation engine
│   │   ├── r-values.ts              # R-value calculations
│   │   ├── treatment-efficacy.ts    # Treatment calculations
│   │   ├── colony-dynamics.ts       # Bee/brood calculations
│   │   └── types.ts                 # TypeScript interfaces
│   ├── hooks/
│   │   ├── useSimulation.ts
│   │   ├── useCalculations.ts
│   │   ├── useColonyTypes.ts
│   │   └── useDebounce.ts
│   └── utils/
│       ├── dates.ts
│       ├── formatting.ts
│       └── export.ts
├── types/
│   ├── database.ts                  # Supabase generated types
│   ├── simulation.ts
│   └── colony.ts
└── constants/
    ├── colony-types.ts              # Default colony type data
    ├── immigration-presets.ts       # Default immigration data
    └── treatments.ts                # Treatment reference data
```

### 4.2 Core Calculation Engine

```typescript
// lib/calculations/varroa-model.ts

export interface SimulationInput {
  colonyType: ColonyTypeData;
  startingMitePopulation: number;
  immigrationPreset: ImmigrationData;
  treatments: TreatmentSchedule[];
  hemisphere: 'northern' | 'southern';
}

export interface PeriodResult {
  periodIndex: number;
  periodDate: Date;
  mitePopulation: number;
  rValue: number;
  miteImmigration: number;
  pctCellsInvaded: number;
  pctMitesPhoretic: number;
  adultBees: number;
  broodCells: number;
  dronebroodPct: number;
  treatmentApplied: string | null;
  treatmentEfficacy: number;
  collapseRisk: 'low' | 'moderate' | 'high' | 'critical';
}

export interface SimulationResult {
  periods: PeriodResult[];
  peakMitePopulation: number;
  peakMiteDate: Date;
  totalImmigration: number;
  treatmentsApplied: number;
  finalMitePopulation: number;
  collapseRiskPeriods: number;
}

export function runSimulation(input: SimulationInput): SimulationResult {
  const periods: PeriodResult[] = [];
  let currentMitePopulation = input.startingMitePopulation;
  
  // Constants from the Excel model
  const BEES_PER_FRAME = 2000;
  const BROOD_CELLS_PER_FRAME = 4500;
  
  for (let i = 0; i < 25; i++) {
    const periodData = input.colonyType.periods[i];
    const immigration = input.immigrationPreset.periods[i]?.miteCount ?? 0;
    const treatment = input.treatments.find(t => t.periodIndex === i);
    
    // Calculate r-value based on colony conditions
    const rValue = calculateRValue(
      periodData,
      currentMitePopulation,
      input.hemisphere
    );
    
    // Calculate bee and brood populations
    const adultBees = periodData.beeFrames * BEES_PER_FRAME;
    const broodCells = periodData.broodFrames * BROOD_CELLS_PER_FRAME;
    
    // Calculate phoretic percentage
    const pctMitesPhoretic = calculatePhoreticPct(broodCells, adultBees);
    
    // Apply treatment if scheduled
    let treatmentEfficacy = 0;
    if (treatment) {
      treatmentEfficacy = calculateEffectiveTreatmentEfficacy(
        treatment,
        pctMitesPhoretic
      );
      currentMitePopulation *= (1 - treatmentEfficacy);
    }
    
    // Apply population growth
    const periodDays = calculatePeriodDays(i);
    currentMitePopulation = currentMitePopulation * Math.exp(rValue * periodDays);
    
    // Add immigration
    currentMitePopulation += immigration;
    
    // Calculate cell invasion percentage
    const pctCellsInvaded = calculateCellInvasion(
      currentMitePopulation,
      broodCells
    );
    
    // Determine collapse risk
    const collapseRisk = determineCollapseRisk(pctCellsInvaded);
    
    periods.push({
      periodIndex: i,
      periodDate: getPeriodDate(i, input.hemisphere),
      mitePopulation: Math.max(0, Math.round(currentMitePopulation * 100) / 100),
      rValue,
      miteImmigration: immigration,
      pctCellsInvaded,
      pctMitesPhoretic,
      adultBees,
      broodCells,
      dronebroodPct: periodData.droneBroodPct,
      treatmentApplied: treatment?.treatmentType.name ?? null,
      treatmentEfficacy,
      collapseRisk
    });
  }
  
  return {
    periods,
    peakMitePopulation: Math.max(...periods.map(p => p.mitePopulation)),
    peakMiteDate: periods.reduce((a, b) => 
      a.mitePopulation > b.mitePopulation ? a : b
    ).periodDate,
    totalImmigration: periods.reduce((sum, p) => sum + p.miteImmigration, 0),
    treatmentsApplied: input.treatments.length,
    finalMitePopulation: periods[periods.length - 1].mitePopulation,
    collapseRiskPeriods: periods.filter(p => 
      p.collapseRisk === 'high' || p.collapseRisk === 'critical'
    ).length
  };
}

function calculateRValue(
  periodData: ColonyPeriodData,
  mitePopulation: number,
  hemisphere: string
): number {
  // Base r-value calculation from Excel model
  // r = f(brood, bees, season, temperature)
  
  if (periodData.isColdPeriod && periodData.broodFrames < 0.5) {
    // Winter/broodless period - mite mortality exceeds reproduction
    return -0.005012541823544286; // From Excel model
  }
  
  // Calculate based on brood:bee ratio and season
  const broodCells = periodData.broodFrames * 4500;
  const adultBees = periodData.beeFrames * 2000;
  
  if (adultBees === 0) return 0;
  
  const broodBeeRatio = broodCells / adultBees;
  
  // R-value increases with brood availability
  // Maximum around 0.051 during peak brood season
  const baseR = 0.021; // Base intrinsic rate
  const seasonalModifier = periodData.isNectarFlow ? 1.5 : 1.0;
  const broodModifier = Math.min(broodBeeRatio * 2, 2.5);
  
  return baseR * seasonalModifier * broodModifier;
}

function calculatePhoreticPct(broodCells: number, adultBees: number): number {
  // From Excel model - based on brood availability
  if (broodCells === 0) return 1.0; // All mites phoretic when broodless
  
  // Typical: 15-50% phoretic depending on brood level
  const maxBrood = 30000;
  const broodRatio = Math.min(broodCells / maxBrood, 1);
  
  return Math.max(0.15, 0.85 - (broodRatio * 0.7));
}

function calculateEffectiveTreatmentEfficacy(
  treatment: TreatmentSchedule,
  pctMitesPhoretic: number
): number {
  const baseEfficacy = treatment.efficacyOverride ?? treatment.treatmentType.efficacyMax;
  
  if (treatment.treatmentType.requiresBroodless) {
    // Oxalic acid etc - only kills phoretic mites
    return baseEfficacy * pctMitesPhoretic;
  }
  
  // Treatments that penetrate brood (formic acid, amitraz)
  return baseEfficacy;
}

function calculateCellInvasion(mitePopulation: number, broodCells: number): number {
  if (broodCells === 0) return 0;
  
  // Poisson distribution model from Excel
  const mitesInBrood = mitePopulation * 0.6; // ~60% in brood
  const mitesPerCell = mitesInBrood / broodCells;
  
  // Probability of cell invasion using Poisson
  return 1 - Math.exp(-mitesPerCell);
}

function determineCollapseRisk(pctCellsInvaded: number): string {
  if (pctCellsInvaded >= 0.30) return 'critical';
  if (pctCellsInvaded >= 0.20) return 'high';
  if (pctCellsInvaded >= 0.10) return 'moderate';
  return 'low';
}
```

---

## 5. UI/UX Design Specifications

### 5.1 Key Screens

#### 5.1.1 Dashboard
- **Purpose**: Quick overview of saved simulations, recent activity
- **Components**:
  - Welcome banner with quick-start button
  - Recent simulations grid (cards with mini-charts)
  - Quick stats (total simulations, favorites, risk alerts)
  - Educational tip of the day

#### 5.1.2 Simulation Builder (Main Screen)
- **Purpose**: Create and run simulations with real-time feedback
- **Layout**: Two-column design
  - Left: Input controls (collapsible sections)
  - Right: Live results chart and summary

**Input Sections:**
1. **Colony Profile**
   - Colony type dropdown with preview
   - Custom colony type builder link
   - Hemisphere toggle

2. **Starting Conditions**
   - Starting mite population (slider + input)
   - Immigration level selector with descriptions

3. **Treatment Schedule**
   - Interactive timeline with 24 periods
   - Drag-and-drop treatment placement
   - Treatment type selector with efficacy info
   - Quick presets (spring treatment, late summer, etc.)

4. **Advanced Options** (collapsible)
   - Custom r-value overrides
   - Brood break simulation
   - Custom immigration values

#### 5.1.3 Results View
- **Primary Chart**: Area chart showing mite population over time
  - Color-coded risk zones (green/yellow/orange/red)
  - Treatment markers on timeline
  - Immigration indicators
  
- **Secondary Charts**:
  - Brood:Bee ratio line chart
  - Stacked area: Phoretic vs In-brood mites
  - Colony health score over time

- **Data Table**:
  - Expandable/collapsible period data
  - Sortable columns
  - Export to CSV/Excel

- **Summary Cards**:
  - Peak mite population and date
  - Total immigration
  - Treatments applied
  - Risk assessment score

#### 5.1.4 Colony Type Manager
- **Purpose**: View/create custom colony types
- **Features**:
  - Side-by-side comparison of types
  - Period-by-period editor
  - Visual brood/bee population curve preview
  - Import/export functionality

#### 5.1.5 Treatment Reference
- **Purpose**: Educational resource on treatments
- **Content**:
  - Treatment efficacy cards
  - Application timing recommendations
  - Pros/cons for each treatment
  - Links to research papers

### 5.2 Design System

#### Color Palette
```css
/* Primary */
--amber-500: #f59e0b;    /* Main accent - bee/honey themed */
--amber-600: #d97706;    /* Hover states */

/* Risk Levels */
--risk-low: #22c55e;     /* Green */
--risk-moderate: #eab308; /* Yellow */
--risk-high: #f97316;    /* Orange */
--risk-critical: #ef4444; /* Red */

/* Neutrals */
--slate-50: #f8fafc;     /* Background */
--slate-100: #f1f5f9;    /* Card background */
--slate-700: #334155;    /* Text */
--slate-900: #0f172a;    /* Headings */

/* Chart Colors */
--chart-mites: #7c3aed;  /* Purple for mites */
--chart-bees: #f59e0b;   /* Amber for bees */
--chart-brood: #10b981;  /* Emerald for brood */
--chart-treatment: #3b82f6; /* Blue for treatments */
```

#### Typography
- **Headings**: Inter (or system sans-serif)
- **Body**: Inter
- **Monospace** (data): JetBrains Mono

#### Component Patterns
- Cards with subtle shadows and rounded corners
- Form inputs with clear labels and helper text
- Tooltips for all technical terms
- Loading skeletons for async data
- Toast notifications for actions

### 5.3 Responsive Design
- **Desktop (>1024px)**: Full two-column layout
- **Tablet (768-1024px)**: Stacked layout with collapsible sidebar
- **Mobile (<768px)**: Single column, simplified charts, swipeable periods

### 5.4 Accessibility
- WCAG 2.1 AA compliance
- Keyboard navigation for all interactive elements
- Screen reader labels for charts
- High contrast mode support
- Reduced motion option

---

## 6. Implementation Phases

### Phase 1: Foundation (Week 1-2)
**Goal**: Basic infrastructure and core calculations

**Tasks**:
1. Project setup (Next.js, TypeScript, Tailwind, ESLint)
2. Supabase project creation and schema migration
3. Authentication flow (login, register, password reset)
4. Base UI component library (buttons, inputs, cards)
5. Core calculation engine (TypeScript port of Excel formulas)
6. Unit tests for calculation engine

**Deliverables**:
- Running Next.js app with auth
- Database with seed data
- Calculation engine with 100% test coverage

### Phase 2: Core Features (Week 3-4)
**Goal**: Working simulation builder

**Tasks**:
1. Simulation form UI
2. Colony type selector with previews
3. Treatment scheduler component
4. Immigration level selector
5. Real-time calculation integration
6. Basic results display

**Deliverables**:
- Create and run simulations
- View results in table format
- Save simulations to database

### Phase 3: Visualization (Week 5-6)
**Goal**: Interactive charts and enhanced results

**Tasks**:
1. Main mite population chart (Recharts/Chart.js)
2. Brood:bee ratio chart
3. Treatment timeline visualization
4. Risk indicator gauges
5. Period-by-period data table
6. Chart interactions (zoom, hover, tooltips)

**Deliverables**:
- Full chart suite
- Interactive data exploration
- Visual risk indicators

### Phase 4: Advanced Features (Week 7-8)
**Goal**: Power user features

**Tasks**:
1. Custom colony type builder
2. Custom immigration settings
3. Simulation comparison view
4. Export functionality (CSV, PDF report)
5. Brood break scenario
6. Treatment recommendation engine

**Deliverables**:
- Full customization capability
- Data export
- Advanced scenarios

### Phase 5: Polish & Launch (Week 9-10)
**Goal**: Production-ready application

**Tasks**:
1. Performance optimization
2. Mobile responsiveness
3. Error handling and edge cases
4. Analytics integration
5. Help documentation
6. User onboarding flow
7. Load testing
8. Security audit

**Deliverables**:
- Production deployment
- Documentation
- Monitoring setup

---

## 7. Testing Strategy

### 7.1 Unit Tests
- Calculation engine functions (100% coverage required)
- Utility functions
- Custom hooks

### 7.2 Integration Tests
- Database operations
- API routes
- Authentication flows

### 7.3 E2E Tests (Playwright)
- Complete simulation workflow
- User registration and login
- Save and load simulations
- Export functionality

### 7.4 Visual Regression Tests
- Chart rendering
- Responsive layouts
- Component states

---

## 8. Data Migration

### 8.1 Seed Data Required

1. **Colony Types** (from Excel):
   - D: Default temperate climate
   - N: Starting with nuc
   - P: Starting with package
   - B: High-latitude (5-month brood break)
   - C: California almond pollinator
   - R: Randy's almond bees (split 4 ways)
   - S: Swarming colony
   - F: Feral colony

2. **Immigration Presets**:
   - Level 0: No neighbors (0 mites/year)
   - Level 1: Mite-managed apiary (200 mites/year)
   - Level 2: Mite-troubled apiaries (500 mites/year)
   - Level 3: Collapsing ferals (1000 mites/year)
   - Level 4: Treatment-free urban (2000 mites/year)

3. **Treatment Types**:
   - High-efficacy synthetic (amitraz) - 95%
   - Apiguard (thymol) - 90%
   - Formic acid (strong) - 90%
   - Formic acid (knockback) - 50%
   - Oxalic acid (with brood) - 15-45%
   - Oxalic acid (broodless) - 80-95%
   - Sugar dusting - 25%
   - Drone brood removal - 15-20%
   - OA/glycerin towels - 85% (over 45 days)

### 8.2 Migration Script

```typescript
// scripts/seed-data.ts
import { createClient } from '@supabase/supabase-js';
import { COLONY_TYPES, IMMIGRATION_PRESETS, TREATMENTS } from '../src/constants';

async function seedDatabase() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // Seed colony types
  for (const colonyType of COLONY_TYPES) {
    const { data: type } = await supabase
      .from('colony_types')
      .insert({
        code: colonyType.code,
        name: colonyType.name,
        description: colonyType.description,
        is_system: true
      })
      .select()
      .single();

    // Seed period data
    await supabase
      .from('colony_type_periods')
      .insert(
        colonyType.periods.map((period, index) => ({
          colony_type_id: type.id,
          period_index: index,
          ...period
        }))
      );
  }

  // Similar for immigration presets and treatments...
}
```

---

## 9. Performance Considerations

### 9.1 Calculation Optimization
- Memoize expensive calculations
- Use Web Workers for complex simulations
- Debounce input changes (300ms)
- Cache simulation results

### 9.2 Data Loading
- Paginate simulation history
- Lazy load chart libraries
- Optimistic UI updates
- Stale-while-revalidate caching

### 9.3 Bundle Size
- Dynamic imports for charts
- Tree shaking
- Image optimization
- Code splitting by route

---

## 10. Security Considerations

### 10.1 Authentication
- Supabase Auth with email/password
- Optional: Google/GitHub OAuth
- Session management with secure cookies
- Rate limiting on auth endpoints

### 10.2 Authorization
- Row-Level Security on all tables
- Server-side validation of ownership
- API route protection with middleware

### 10.3 Data Protection
- Input sanitization
- CSRF protection (built into Next.js)
- Content Security Policy headers
- Regular dependency audits

---

## 11. Monitoring & Analytics

### 11.1 Error Tracking
- Sentry for error reporting
- Custom error boundaries
- API error logging

### 11.2 Performance Monitoring
- Core Web Vitals tracking
- API response times
- Database query performance

### 11.3 Usage Analytics
- Simulation counts
- Feature usage
- User engagement metrics

---

## 12. Future Enhancements

### 12.1 Phase 2 Features
- Multi-colony apiary management
- Weather data integration for r-value adjustment
- Treatment cost calculator
- Community colony type sharing
- Mobile app (React Native)

### 12.2 Integrations
- Hive scale data import
- Weather API for local conditions
- Export to common beekeeping apps
- API for third-party tools

### 12.3 AI/ML Enhancements
- Treatment timing recommendations
- Risk prediction model
- Anomaly detection for unusual patterns

---

## 13. Reference Data (from Excel)

### 13.1 Default Colony Type - Period Data

| Period | Date | Cold | Flow | Brood Frames | Bee Frames | Drone % |
|--------|------|------|------|--------------|------------|---------|
| 0 | Jan 1 | 1 | 0 | 0 | 8 | 0 |
| 1 | Jan 15 | 1 | 0 | 0.25 | 8 | 0 |
| 2 | Feb 1 | 1 | 0 | 0.33 | 8 | 0 |
| 3 | Feb 15 | 1 | 0 | 0.75 | 7 | 0 |
| 4 | Mar 1 | 1 | 0 | 1 | 7 | 0 |
| 5 | Mar 15 | 1 | 0 | 2 | 6 | 0 |
| 6 | Apr 1 | 0 | 1 | 3 | 6 | 3% |
| 7 | Apr 15 | 0 | 1 | 5 | 8 | 6% |
| 8 | May 1 | 0 | 1 | 6 | 11 | 6% |
| 9 | May 15 | 0 | 1 | 6.5 | 15 | 6% |
| 10 | Jun 1 | 0 | 1 | 7 | 19 | 5% |
| 11 | Jun 15 | 0 | 1 | 6.5 | 22 | 5% |
| 12 | Jul 1 | 0 | 1 | 6 | 24 | 5% |
| 13 | Jul 15 | 0 | 1 | 5 | 25 | 5% |
| 14 | Aug 1 | 0 | 1 | 4.5 | 25 | 5% |
| 15 | Aug 15 | 0 | 1 | 4 | 22 | 5% |
| 16 | Sep 1 | 0 | 0 | 3.5 | 19 | 2% |
| 17 | Sep 15 | 0 | 0 | 4 | 16 | 2% |
| 18 | Oct 1 | 1 | 0 | 2 | 15 | 0 |
| 19 | Oct 15 | 1 | 0 | 0.5 | 12 | 0 |
| 20 | Nov 1 | 1 | 0 | 0.25 | 9 | 0 |
| 21 | Nov 15 | 1 | 0 | 0.125 | 8.5 | 0 |
| 22 | Dec 1 | 1 | 0 | 0.1 | 8.25 | 0 |
| 23 | Dec 15 | 1 | 0 | 0 | 8 | 0 |

### 13.2 Immigration Presets by Period (mites/period)

| Period | Level 0 | Level 1 | Level 2 | Level 3 | Level 4 |
|--------|---------|---------|---------|---------|---------|
| 0-10 | 0 | 0 | 0 | 0 | 0 |
| 11 | 0 | 2 | 5 | 10 | 20 |
| 12 | 0 | 3 | 5 | 10 | 30 |
| 13 | 0 | 5 | 15 | 21 | 45 |
| 14 | 0 | 10 | 20 | 45 | 75 |
| 15 | 0 | 15 | 50 | 130 | 200 |
| 16 | 0 | 30 | 100 | 175 | 400 |
| 17 | 0 | 40 | 125 | 210 | 500 |
| 18 | 0 | 50 | 100 | 180 | 400 |
| 19 | 0 | 30 | 50 | 130 | 200 |
| 20 | 0 | 10 | 25 | 75 | 100 |
| 21 | 0 | 5 | 5 | 14 | 30 |
| 22-24 | 0 | 0 | 0 | 0 | 0 |
| **Total** | **0** | **200** | **500** | **1000** | **2000** |

---

## 14. Success Metrics

### 14.1 Technical
- Page load time < 2 seconds
- Calculation time < 100ms
- 99.9% uptime
- Zero critical security vulnerabilities

### 14.2 User Engagement
- User registration conversion > 30%
- Simulations per user > 3
- Return user rate > 40%
- Feature adoption metrics

### 14.3 Quality
- Bug reports < 5/week after launch
- User satisfaction > 4.5/5
- Support ticket resolution < 24 hours

---

## Appendix A: Claude Code Prompts

### A.1 Initial Project Setup
```
Create a new Next.js 14 project with TypeScript, Tailwind CSS, and Supabase.
Include:
- App Router structure
- Supabase client configuration
- Authentication middleware
- Base UI components (Button, Card, Input, Select)
- ESLint and Prettier configuration
```

### A.2 Database Setup
```
Generate Supabase migrations for the Varroa Model application schema
including:
- profiles, colony_types, colony_type_periods
- immigration_presets, immigration_periods
- treatment_types, simulations, simulation_treatments
- Row-level security policies for all tables
- Indexes for common queries
```

### A.3 Calculation Engine
```
Implement the Varroa mite population model calculation engine in TypeScript.
The engine should:
- Accept colony type data, starting population, immigration, and treatments
- Calculate 25 periods of mite population dynamics
- Use exponential growth model with r-values
- Account for phoretic vs in-brood mites for treatment efficacy
- Calculate cell invasion percentage and collapse risk
- Return detailed per-period results

Reference the mathematical model from the implementation plan.
```

### A.4 Chart Components
```
Create a Recharts-based MitePopulationChart component that:
- Shows mite population over 24 periods as an area chart
- Color-codes risk zones (green < 1000, yellow < 3000, orange < 5000, red > 5000)
- Marks treatment applications on the timeline
- Shows immigration as subtle indicators
- Includes interactive tooltips with period details
- Is responsive and accessible
```

---

*Document Version: 1.0*
*Created: Based on Randy's Varroa Model V2024A*
*Target: Web Application Implementation*
