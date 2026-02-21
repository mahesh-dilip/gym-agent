# GymAgent Product Roadmap

## Phase 1: Zero New Infrastructure
*Extend existing JSONB fields, tools, and cards. No new tables, no new libraries, no new components.*

**Estimated effort**: 2-4 days

### 1a. RPE/RIR Tracking
- Add `rpe` and `rir` fields to `set_details` JSONB (no migration needed)
- Update `log_exercise` tool schema to accept RPE/RIR
- Update `ExerciseLogCard` to show RPE input per set
- Update `SetDetail` type

### 1b. PR Auto-Detection
- After `persistExercise()`, compare against existing PR
- Return PR flag in tool output so AI can celebrate
- Add "NEW PR" badge to `ExerciseLogCard`

### 1c. Richer show_progress Output
- Add computed fields: total volume per session, estimated 1RM (Epley formula), training frequency, trend direction
- Update `ProgressCard` with summary stats row

### 1d. Data Export
- New API route (`/api/export`) querying workout_sessions + exercise_logs + recovery_logs
- CSV format download
- Button on history page

---

## Phase 2: One New Component, No New Dependencies
*New UI components using existing data, no new npm packages.*

**Estimated effort**: 3-5 days

### 2a. Rest Timer
- New `RestTimer` component (CSS countdown + circular progress)
- Shared state actions: REST_TIMER_START / TICK / DONE
- Auto-trigger after exercise confirmation in `ExerciseLogCard`
- Browser Notification API for background alerts
- AI suggests optimal rest based on exercise type/intensity

### 2b. Recovery Heatmap
- SVG body outline with muscle groups colored by recency/volume
- Static exercise → muscle group lookup table
- New `show_recovery_map` tool + `RecoveryHeatmapCard`

---

## Phase 3: Charting & Visualization ✅
*Installed chart.js + react-chartjs-2. Built chart components.*

### 3a. Progress Charts ✅
- Installed `chart.js` + `react-chartjs-2` (~20KB gzipped, mobile-optimized)
- New `ProgressChartCard` with line chart (weight or volume toggle)
- Extended `show_progress` tool with `view` parameter ("list" | "chart")
- Time range selector (4W / 3M / 6M / ALL)
- PR point highlighted in gold on chart

### 3b. Volume & Muscle Distribution Charts ✅
- New `show_analytics` tool returning weekly volume by muscle group
- New `AnalyticsCard` with doughnut chart (muscle distribution) + stacked bar chart (weekly volume)
- Shared `lib/muscle-groups.ts` module extracted from history page

### 3c. PR Dashboard ✅
- New `show_prs` tool computing PRs from exercise_logs (no separate table needed)
- New `PRDashboardCard` — clean list view with PR weight, est 1RM, improvement %
- Sorted by weight descending

---

## Phase 4: New Database Table + CRUD
*New Supabase table, migration, RLS policies, full CRUD flow.*

**Estimated effort**: 5-7 days

### 4a. Workout Templates
- New `workout_templates` table (user_id, name, exercises JSONB, usage_count, last_used_at)
- New `save_template` and `load_template` tools
- New `TemplateCard` and `TemplateListCard`
- AI suggests saving templates after sessions

### 4b. Onboarding Conversational Flow
- New `/onboarding` route with guided AI chat
- Captures: experience, goals, equipment, preferred split, injuries
- Populates `user_profile.preferences` and creates initial goals
- Redirect on first login

---

## Phase 5: Major New Systems
*Significant new architecture, possibly native bridge work.*

**Estimated effort**: 2-4 weeks

### 5a. Adaptive Multi-Week Programming
- New `programs` table (mesocycles, weeks, progressive overload rules)
- AI generates 4-12 week periodized plans
- Weekly auto-adjustment based on RPE trends
- Deload detection and recommendation
- Depends on: Phase 1a (RPE), Phase 4a (templates), Phase 3 (analytics)

### 5b. Apple Health / Google Fit Integration
- Native wrapper (Capacitor or Expo) for HealthKit/Health Connect
- Sync bodyweight, sleep, heart rate, steps
- Feed into recovery model
- Depends on: Phase 2b (recovery heatmap)

---

## Dependency Chain

```
Phase 1a (RPE) ──→ Phase 3 (Charts) ──→ Phase 5a (Programming)
Phase 1b (PR)  ──→ Phase 3c (PR Dashboard)
Phase 2b (Heatmap) ──→ Phase 5b (Health Integrations)
Phase 4a (Templates) ──→ Phase 5a (Programming)
```

## Features Deliberately Skipped
| Feature | Reason |
|---|---|
| Social feed / following | Hevy owns this. Focus on solo experience first. |
| Apple Watch app | Requires native dev. Build after native shell exists. |
| Exercise video library | Licensing + storage cost. Link to external resources. |
| Gamification (badges, XP) | Not what serious lifters want. AI coaching IS the engagement. |
| Coach marketplace | Different business model. AI IS the coach. |
| Voice logging | Let W8Log prove the market first. |
