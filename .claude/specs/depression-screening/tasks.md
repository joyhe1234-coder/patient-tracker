# Implementation Plan: Depression Screening

## Task Overview

Add "Depression Screening" as the 14th quality measure in the patient tracking system. Every change is a configuration-only extension of existing data structures. No new files, no new components, no schema changes. Five existing files require modification in a specific order to maintain consistency between the frontend config and the backend seed.

## Steering Document Compliance

- **Structure:** All changes target existing files under `frontend/src/config/`, `backend/src/services/`, and `backend/prisma/`. No new directories or files.
- **Patterns:** Reuses `Record<string, string[]>` config maps, `as const` array extension, `getDefaultDatePrompt()` fallback map, `createStatuses()` helper, and `prisma.upsert()` seed pattern — all established in the codebase.
- **Testing:** Extends `dropdownConfig.test.ts` (Vitest) and `statusColors.test.ts` (Vitest). No new test files are created.
- **Dependencies:** Task 1 (dropdownConfig.ts) must be completed before Task 5 (dropdownConfig.test.ts) because the test file imports from and asserts against the config.

## Dependency Chain

```
Task 1 (dropdownConfig.ts)  ──► Task 5 (dropdownConfig.test.ts)
Task 2 (statusColors.ts)    ──► Task 6 (statusColors.test.ts)
Task 3 (statusDatePromptResolver.ts)   [independent]
Task 4a (seed.ts — QualityMeasure)  ──► Task 4b (seed.ts — MeasureStatus)  ──► Task 4c (seed.ts — sample data)
```

Tasks 1, 2, 3, and 4a can be done in parallel. Tasks 4b and 4c must follow 4a within the same file.

## Implementation Phases

- **Phase 1 — Frontend Config (Tasks 1–2):** Register the measure and its statuses in the dropdown and color systems.
- **Phase 2 — Backend Fallback (Task 3):** Add three date prompt entries to the in-memory fallback map.
- **Phase 3 — Database Seed (Tasks 4a–4c):** Persist the QualityMeasure, MeasureStatus records, and sample patients.
- **Phase 4 — Tests (Tasks 5–6):** Update existing test assertions and add Depression Screening-specific cases.

## Key Reuse Points

- `createStatuses()` helper in `backend/prisma/seed.ts` (line 244): used identically for all other measures — reuse for Depression Screening statuses.
- `daysAgo()` and `daysFromNow()` helpers in `backend/prisma/seed.ts` (lines 703–712): already defined in the sample data section — reuse for measure config date values.
- Cervical Cancer Screening block in `seed.ts` (lines 289–299): nearest match for the upsert pattern (same `screeningType` parent, same `allowDuplicates: false`, same 4th measure slot).
- `YELLOW_STATUSES` / `BLUE_STATUSES` / `GREEN_STATUSES` arrays in `statusColors.ts`: append-only extension, no structural change.
- Existing `it('maps Screening to 3 screening measures')` test at line 52 of `dropdownConfig.test.ts`: update count from 3 to 4 and add the new measure to the contains assertions.

---

## Tasks

- [ ] 1. Add "Depression Screening" to the Screening dropdown and define its 7 statuses in `dropdownConfig.ts`
  - File: `frontend/src/config/dropdownConfig.ts`
  - In `REQUEST_TYPE_TO_QUALITY_MEASURE`, add `'Depression Screening'` to the `'Screening'` array (after `'Cervical Cancer Screening'`, before the closing bracket). Array will grow from 3 to 4 entries.
  - In `QUALITY_MEASURE_TO_STATUS`, add a new key `'Depression Screening'` with the following 7-element array in this exact order: `'Not Addressed'`, `'Called to schedule'`, `'Visit scheduled'`, `'Screening complete'`, `'Screening unnecessary'`, `'Patient declined'`, `'No longer applicable'`.
  - Do NOT modify `STATUS_TO_TRACKING1` — Depression Screening has no sub-selections (ASM-1).
  - Purpose: Registers Depression Screening in the cascading dropdown. `getQualityMeasuresForRequestType('Screening')` will now return 4 measures sorted alphabetically; `getMeasureStatusesForQualityMeasure('Depression Screening')` will return the 7-element array.
  - _Leverage: `frontend/src/config/dropdownConfig.ts` — existing `REQUEST_TYPE_TO_QUALITY_MEASURE` and `QUALITY_MEASURE_TO_STATUS` patterns_
  - _Requirements: REQ-DS-1 (AC-1, AC-2, AC-3), INT-1, INT-2, NFR-8_

- [ ] 2. Add 3 new Depression Screening status strings to the correct color arrays in `statusColors.ts`
  - File: `frontend/src/config/statusColors.ts`
  - Add `'Called to schedule'` to the `BLUE_STATUSES` array. This string is unique — do not confuse with `'Patient called to schedule AWV'` (different string, different measure).
  - Add `'Visit scheduled'` to the `YELLOW_STATUSES` array. This string is unique — do not confuse with `'Vaccination scheduled'` (blue) or `'AWV scheduled'` (blue).
  - Add `'Screening complete'` to the `GREEN_STATUSES` array. Note the exact spelling: no "d" suffix. `'Screening completed'` (with "d") is already present for Cervical Cancer — both must coexist as separate entries (EDGE-5).
  - Do NOT modify `GRAY_STATUSES` (`'Screening unnecessary'` and `'No longer applicable'` are already present) or `PURPLE_STATUSES` (`'Patient declined'` is already present).
  - Purpose: `getRowStatusColor()` will return the correct color for the 3 new unique Depression Screening statuses. The remaining 4 statuses already resolve via existing array entries.
  - _Leverage: `frontend/src/config/statusColors.ts` — existing `as const` array pattern; `getRowStatusColor()` requires no changes_
  - _Requirements: REQ-DS-2 (AC-1 through AC-7), REQ-DS-5 (AC-1), INT-3, EDGE-3, EDGE-4, EDGE-5_

- [ ] 3. Add 3 Depression Screening date prompt fallback entries to `getDefaultDatePrompt()` in `statusDatePromptResolver.ts`
  - File: `backend/src/services/statusDatePromptResolver.ts`
  - In the `defaultPrompts` object inside `getDefaultDatePrompt()`, add 3 new entries in the `// Screening statuses` section (after `'Screening completed': 'Date Completed'` at approximately line 71):
    - `'Called to schedule': 'Date Called'`
    - `'Visit scheduled': 'Date Scheduled'`
    - `'Screening complete': 'Date Completed'`
  - Do NOT add entries for `'Patient declined'`, `'Screening unnecessary'`, or `'No longer applicable'` — these already exist in the map (lines 112–118). Adding them would create duplicate keys and silently override the existing values.
  - Purpose: Provides correct date prompt labels for the 3 new unique status strings when the database has not been seeded (fallback path per NFR-6 and REQ-DS-8).
  - _Leverage: `backend/src/services/statusDatePromptResolver.ts` — existing `Record<string, string>` defaultPrompts pattern_
  - _Requirements: REQ-DS-3, REQ-DS-8 (AC-1, AC-2, AC-3), INT-4_

- [ ] 4a. Add the Depression Screening QualityMeasure upsert to the `qualityMeasures` array in `seed.ts`
  - File: `backend/prisma/seed.ts`
  - In the `qualityMeasures` `Promise.all([...])` array (around line 69), add a new `prisma.qualityMeasure.upsert()` call after the Cervical Cancer Screening entry (line 116). Use `sortOrder: 4` (Breast=1, Colon=2, Cervical=3, Depression=4).
  - Exact upsert:
    ```typescript
    prisma.qualityMeasure.upsert({
      where: { requestTypeId_code: { requestTypeId: screeningType.id, code: 'Depression Screening' } },
      update: {},
      create: {
        requestTypeId: screeningType.id,
        code: 'Depression Screening',
        label: 'Depression Screening',
        allowDuplicates: false,
        sortOrder: 4,
      },
    }),
    ```
  - After the `Promise.all` resolves, add the measure variable declaration alongside the existing ones (around line 229–241):
    ```typescript
    const depressionMeasure = qualityMeasures.find(qm => qm.code === 'Depression Screening')!;
    ```
  - Purpose: Creates the QualityMeasure database record that links Depression Screening to the Screening request type. This record is the parent for the 7 MeasureStatus records in Task 4b.
  - _Leverage: `backend/prisma/seed.ts` — Cervical Cancer Screening upsert pattern (lines 106–116); `screeningType.id` already resolved at line 62_
  - _Requirements: REQ-DS-6 (AC-1, AC-3), NFR-5_

- [ ] 4b. Add the 7 Depression Screening MeasureStatus records via `createStatuses()` in `seed.ts`
  - File: `backend/prisma/seed.ts`
  - After the Cervical Cancer Screening `createStatuses()` block (after line 299), add the following call using `depressionMeasure.id` from Task 4a:
    ```typescript
    // Depression Screening statuses
    await createStatuses(depressionMeasure.id, [
      { code: 'Not Addressed',         label: 'Not Addressed',         datePrompt: null,             baseDueDays: null, sortOrder: 1 },
      { code: 'Called to schedule',    label: 'Called to schedule',    datePrompt: 'Date Called',    baseDueDays: 7,    sortOrder: 2 },
      { code: 'Visit scheduled',       label: 'Visit scheduled',       datePrompt: 'Date Scheduled', baseDueDays: 1,    sortOrder: 3 },
      { code: 'Screening complete',    label: 'Screening complete',    datePrompt: 'Date Completed', baseDueDays: null, sortOrder: 4 },
      { code: 'Screening unnecessary', label: 'Screening unnecessary', datePrompt: 'Date Determined', baseDueDays: null, sortOrder: 5 },
      { code: 'Patient declined',      label: 'Patient declined',      datePrompt: 'Date Declined',  baseDueDays: null, sortOrder: 6 },
      { code: 'No longer applicable',  label: 'No longer applicable',  datePrompt: 'Date Determined', baseDueDays: null, sortOrder: 7 },
    ]);
    ```
  - Critical values: `'Called to schedule'` gets `baseDueDays: 7` (7-day follow-up timer); `'Visit scheduled'` gets `baseDueDays: 1` (1-day post-visit timer); all terminal statuses get `baseDueDays: null`.
  - Purpose: Creates the 7 MeasureStatus rows that provide `datePrompt` and `baseDueDays` to the backend API. These are the authoritative source — the frontend fallback in Task 3 is only used before this seed runs.
  - _Leverage: `backend/prisma/seed.ts` — `createStatuses()` helper at line 244; Cervical Cancer block (lines 289–299) as structural reference_
  - _Requirements: REQ-DS-3, REQ-DS-4, REQ-DS-6 (AC-2, AC-3), NFR-5_

- [ ] 4c. Add 6 Depression Screening sample patients and 7 measure rows to the seed data arrays in `seed.ts`
  - File: `backend/prisma/seed.ts`
  - In the `testPatients` array (starting at line 715), add 6 new patient objects after the Cervical Cancer patients block (after line 744). Use the `5552004xxx` phone number series to stay consistent with the Screening group numbering:
    ```typescript
    // Screening - Depression
    { name: 'Harper, Angela',   dob: new Date('1975-03-14'), phone: '5552004001', address: '217 Meadow St' },
    { name: 'Reed, Christine',  dob: new Date('1968-07-22'), phone: '5552004002', address: '218 Brook Ave' },
    { name: 'Price, Gloria',    dob: new Date('1972-11-08'), phone: '5552004003', address: '219 Willow Blvd' },
    { name: 'Butler, Diane',    dob: new Date('1980-05-30'), phone: '5552004004', address: '220 Aspen Lane' },
    { name: 'Howard, Margaret', dob: new Date('1963-09-12'), phone: '5552004005', address: '221 Spruce Road' },
    { name: 'Ward, Catherine',  dob: new Date('1970-01-25'), phone: '5552004006', address: '222 Poplar Court' },
    ```
  - In the `measureConfigs` array (starting at line 821), add 7 measure rows after the Cervical Cancer Screening block (after line 850). The 7th row reuses `'Reed, Christine'` to demonstrate the overdue (red) scenario:
    ```typescript
    // Depression Screening
    { patientName: 'Harper, Angela',   requestType: 'Screening', qualityMeasure: 'Depression Screening', measureStatus: 'Not Addressed',        statusDate: null,          tracking1: null, tracking2: null, notes: 'White - not addressed' },
    { patientName: 'Reed, Christine',  requestType: 'Screening', qualityMeasure: 'Depression Screening', measureStatus: 'Called to schedule',    statusDate: daysAgo(3),    tracking1: null, tracking2: null, notes: 'Blue - called 3 days ago (7 day timer)' },
    { patientName: 'Price, Gloria',    requestType: 'Screening', qualityMeasure: 'Depression Screening', measureStatus: 'Visit scheduled',       statusDate: daysFromNow(5), tracking1: null, tracking2: null, notes: 'Yellow - visit in 5 days' },
    { patientName: 'Butler, Diane',    requestType: 'Screening', qualityMeasure: 'Depression Screening', measureStatus: 'Screening complete',    statusDate: daysAgo(14),   tracking1: null, tracking2: null, notes: 'Green - completed 14 days ago' },
    { patientName: 'Howard, Margaret', requestType: 'Screening', qualityMeasure: 'Depression Screening', measureStatus: 'Screening unnecessary', statusDate: daysAgo(30),   tracking1: null, tracking2: null, notes: 'Gray - unnecessary' },
    { patientName: 'Ward, Catherine',  requestType: 'Screening', qualityMeasure: 'Depression Screening', measureStatus: 'Patient declined',      statusDate: daysAgo(10),   tracking1: null, tracking2: null, notes: 'Purple - declined' },
    { patientName: 'Reed, Christine',  requestType: 'Screening', qualityMeasure: 'Depression Screening', measureStatus: 'Called to schedule',    statusDate: daysAgo(14),   tracking1: null, tracking2: null, notes: 'Red - overdue (called 14 days ago, 7 day timer expired)' },
    ```
  - Purpose: Provides seed data to visually verify all 7 colors (white, blue, yellow, green, gray, purple, red) for Depression Screening rows on a fresh database. Follows the existing `existingPatientCount === 0` guard (line 685) — no data is created if patients already exist.
  - _Leverage: `backend/prisma/seed.ts` — `daysAgo()` and `daysFromNow()` helpers (lines 703–712); existing `testPatients`/`measureConfigs` array structure; round-robin assignment pattern (line 926)_
  - _Requirements: REQ-DS-7 (AC-1, AC-2, AC-3), NFR-5_

- [ ] 5. Update the two broken Screening assertions and add Depression Screening status tests in `dropdownConfig.test.ts`
  - File: `frontend/src/config/dropdownConfig.test.ts`
  - **Update assertion at line 52** — change the test title and assertions so that the Screening count reflects 4 measures instead of 3:
    - Change `it('maps Screening to 3 screening measures'` to `it('maps Screening to 4 screening measures'`
    - Change `toHaveLength(3)` to `toHaveLength(4)`
    - Add `expect(REQUEST_TYPE_TO_QUALITY_MEASURE['Screening']).toContain('Depression Screening');`
  - **Update assertion at line 159** — the sorted Screening array test currently asserts a 3-element array. Update it to assert the 4-element sorted array:
    ```typescript
    expect(result).toEqual([
      'Breast Cancer Screening',
      'Cervical Cancer Screening',
      'Colon Cancer Screening',
      'Depression Screening',
    ]);
    ```
  - **Add new `describe` block** for Depression Screening after the existing `QUALITY_MEASURE_TO_STATUS` describe block:
    ```typescript
    describe('Depression Screening', () => {
      it('has exactly 7 statuses', () => {
        const statuses = QUALITY_MEASURE_TO_STATUS['Depression Screening'];
        expect(statuses).toHaveLength(7);
      });

      it('has "Not Addressed" as the first status', () => {
        const statuses = QUALITY_MEASURE_TO_STATUS['Depression Screening'];
        expect(statuses[0]).toBe('Not Addressed');
      });

      it('contains all 7 required statuses', () => {
        const statuses = QUALITY_MEASURE_TO_STATUS['Depression Screening'];
        expect(statuses).toContain('Called to schedule');
        expect(statuses).toContain('Visit scheduled');
        expect(statuses).toContain('Screening complete');
        expect(statuses).toContain('Screening unnecessary');
        expect(statuses).toContain('Patient declined');
        expect(statuses).toContain('No longer applicable');
      });

      it('has no Tracking #1 options for any Depression Screening status', () => {
        const statuses = QUALITY_MEASURE_TO_STATUS['Depression Screening'];
        for (const status of statuses) {
          expect(getTracking1OptionsForStatus(status)).toBeNull();
        }
      });
    });
    ```
  - Purpose: Prevents regressions against the Screening count (EDGE-7), verifies the sorted 4-measure alphabetical order, and explicitly validates the 7-status shape, order, and no-tracking invariant for Depression Screening.
  - _Leverage: `frontend/src/config/dropdownConfig.test.ts` — existing Vitest describe/it/expect pattern; existing imports already include `QUALITY_MEASURE_TO_STATUS` and `getTracking1OptionsForStatus`_
  - _Requirements: REQ-DS-1 (AC-2), INT-2, EDGE-7, ASM-1_

- [ ] 6. Add Depression Screening color and overdue tests to `statusColors.test.ts`
  - File: `frontend/src/config/statusColors.test.ts`
  - **Update the 3 array length assertions** that will now be wrong after Task 2:
    - In `it('BLUE_STATUSES contains scheduled/ordered/in-progress statuses')` — add `expect(BLUE_STATUSES).toContain('Called to schedule');`
    - In `it('GREEN_STATUSES contains completed/at-goal statuses')` — add `expect(GREEN_STATUSES).toContain('Screening complete');`
    - In `it('YELLOW_STATUSES contains discussed/contacted statuses')` — add `expect(YELLOW_STATUSES).toContain('Visit scheduled');`
  - **Add a new `describe('Depression Screening colors')` block** inside the `describe('getRowStatusColor')` section, after the existing `'returns yellow for discussed/contacted statuses'` test:
    ```typescript
    describe('Depression Screening colors', () => {
      it('returns blue for "Called to schedule"', () => {
        expect(getRowStatusColor({ ...baseRow, measureStatus: 'Called to schedule' })).toBe('blue');
      });

      it('returns yellow for "Visit scheduled"', () => {
        expect(getRowStatusColor({ ...baseRow, measureStatus: 'Visit scheduled' })).toBe('yellow');
      });

      it('returns green for "Screening complete"', () => {
        expect(getRowStatusColor({ ...baseRow, measureStatus: 'Screening complete' })).toBe('green');
      });

      it('returns green for "Screening completed" (Cervical Cancer, unaffected)', () => {
        expect(getRowStatusColor({ ...baseRow, measureStatus: 'Screening completed' })).toBe('green');
      });

      it('returns gray for "Screening unnecessary"', () => {
        expect(getRowStatusColor({ ...baseRow, measureStatus: 'Screening unnecessary' })).toBe('gray');
      });

      it('returns purple for "Patient declined"', () => {
        expect(getRowStatusColor({ ...baseRow, measureStatus: 'Patient declined' })).toBe('purple');
      });

      it('returns red for overdue "Called to schedule"', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
        expect(
          getRowStatusColor({ ...baseRow, measureStatus: 'Called to schedule', dueDate: '2025-06-01' })
        ).toBe('red');
      });

      it('returns red for overdue "Visit scheduled"', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
        expect(
          getRowStatusColor({ ...baseRow, measureStatus: 'Visit scheduled', dueDate: '2025-06-01' })
        ).toBe('red');
      });

      it('does NOT return red for overdue "Patient declined" (purple is terminal)', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
        expect(
          getRowStatusColor({ ...baseRow, measureStatus: 'Patient declined', dueDate: '2025-06-01' })
        ).toBe('purple');
      });

      it('does NOT return red for overdue "Screening unnecessary" (gray is terminal)', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
        expect(
          getRowStatusColor({ ...baseRow, measureStatus: 'Screening unnecessary', dueDate: '2025-06-01' })
        ).toBe('gray');
      });
    });
    ```
  - Purpose: Verifies the 3 new color additions work, confirms "Screening completed" (with "d") is not broken by the addition of "Screening complete" (without "d"), and tests the overdue override for Depression Screening's active statuses vs. terminal statuses (REQ-DS-5).
  - _Leverage: `frontend/src/config/statusColors.test.ts` — existing `baseRow` fixture, `vi.useFakeTimers()`/`vi.setSystemTime()` pattern, `afterEach(() => vi.useRealTimers())` pattern_
  - _Requirements: REQ-DS-2, REQ-DS-5 (AC-1, AC-2, AC-3), EDGE-5_
