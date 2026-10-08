# Implementation Plan: To-Do List Life Dashboard

## Overview

Implement a fully client-side, single-page web application using plain HTML, CSS, and Vanilla JavaScript. The app delivers four core widgets (Greeting, Focus Timer, Task Manager, Quick Links) on one screen, with all data persisted via `localStorage`. No build step, no frameworks, no server required — the app opens directly from `index.html`.

The implementation follows a strict **validate → mutate → persist → re-render** cycle, a single shared `AppState` object as the source of truth, event delegation for list-based widgets, and CSS custom properties for theme switching.

---

## Tasks

- [x] 1. Scaffold project file structure
  - Create `index.html` at the project root with the HTML5 doctype, `<head>` metadata (charset, viewport, title), `<link>` to `css/style.css`, and `<script defer>` pointing to `js/app.js`
  - Create `css/style.css` as an empty file with section comment banners (matching the 11-section layout from the design)
  - Create `js/app.js` as an empty file with the 9 section comment banners from the design (`CONSTANTS & CONFIG`, `APP STATE`, `LOCAL STORAGE HELPERS`, `GREETING WIDGET`, `FOCUS TIMER`, `TASK MANAGER`, `QUICK LINKS`, `THEME`, `INIT`)
  - Verify `index.html` opens in a browser without console errors
  - _Requirements: 10.1, 10.2, 10.3_

- [x] 2. Implement CSS custom properties and theming foundation
  - [x] 2.1 Write CSS token block and base reset
    - Define all `--color-*` custom properties for light theme on `:root` and dark overrides on `body[data-theme="dark"]` exactly as specified in the design
    - Add CSS reset (`box-sizing: border-box`, margin/padding resets, `font-family`) and base `body` styles consuming `--color-bg` and `--color-text`
    - _Requirements: 8.1, 8.2, 10.1_

  - [x] 2.2 Implement main grid layout and responsive breakpoint
    - Write the `main` grid using `display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 1.5rem; padding: 1.5rem;`
    - Add the responsive section for narrow viewports (single column stack)
    - Style `<header>` with flex layout for theme toggle alignment
    - _Requirements: 11.1, 11.2, 10.3_

- [x] 3. Build HTML semantic structure
  - [x] 3.1 Write the full `index.html` body markup
    - Add `<body data-theme="light">`, `<header>` with `#theme-toggle` button (`aria-label="Toggle dark mode"`), and `<main>` containing four `<section>` elements: `#greeting-widget`, `#timer-widget`, `#task-widget`, `#links-widget`
    - Inside `#timer-widget`: add MM:SS display, Start/Stop/Reset buttons, duration input and label, inline validation message container
    - Inside `#task-widget`: add task input form, inline validation message container, sort `<select>` with all five options, `#task-list` `<ul>`
    - Inside `#links-widget`: add label + URL input form, inline validation message containers, `#links-list` container
    - Inside `#greeting-widget`: add placeholders for time, date, and greeting text nodes
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 10.3_

- [x] 4. Implement AppState and localStorage helpers
  - [x] 4.1 Define `AppState` and `CONSTANTS`
    - Write the `SORT_ORDERS` constant object with all five keys from the design
    - Write the `AppState` object with all fields: `tasks`, `links`, `timerDuration`, `sortOrder`, `theme`, and the three ephemeral timer fields (`timerRemaining`, `timerRunning`, `timerIntervalId`)
    - _Requirements: 9.1, 9.3_

  - [x] 4.2 Implement `Storage` helper module
    - Write `Storage.isAvailable()` — tests `localStorage` with a probe write/read/delete, returns boolean
    - Write `Storage.load(key, defaultValue)` — wraps `JSON.parse(localStorage.getItem(key))` in try/catch, returns `defaultValue` on any error or null result
    - Write `Storage.save(key, value)` — wraps `localStorage.setItem(key, JSON.stringify(value))` in try/catch; on failure sets a module-level `storageUnavailable` flag
    - Implement the persistent non-blocking storage-unavailable banner: shown once when the flag is first set, hidden when storage is available
    - _Requirements: 9.1, 9.2, 9.4_

  - [ ]* 4.3 Write property test for Storage key independence (Property 13)
    - **Property 13: localStorage key failures are isolated**
    - **Validates: Requirements 9.1, 9.2**
    - Use `fc.record` of boolean failure flags per key; mock `Storage.load` per key; assert each successful key returns correct value and no key failure throws
    - Tag: `// Feature: todo-life-dashboard, Property 13: localStorage key failures are isolated`

- [x] 5. Implement Greeting Widget
  - [x] 5.1 Implement `getGreeting(hour)` and `renderGreeting()`
    - Write `getGreeting(hour)` — returns `"Good morning"` (05–11), `"Good afternoon"` (12–17), `"Good evening"` (18–21), `"Good night"` (22–04) for any integer 0–23
    - Write `renderGreeting()` — reads `new Date()`, formats time as HH:MM (24h), formats date as "DayName, MonthName D, YYYY" using `Intl.DateTimeFormat` with the user's local timezone; falls back to UTC with visible "UTC" label if timezone detection fails; updates DOM text nodes
    - Start a `setInterval(renderGreeting, 60_000)` in `init()` for the live-update tick
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ]* 5.2 Write property test for time-based greeting (Property 8)
    - **Property 8: Time-based greeting is total and exhaustive**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
    - Use `fc.integer({ min: 0, max: 23 })`; assert return value is one of the four expected strings; assert no hour produces an unexpected string
    - Tag: `// Feature: todo-life-dashboard, Property 8: Time-based greeting is total and exhaustive`

- [x] 6. Implement Focus Timer — core countdown
  - [x] 6.1 Implement timer state and render function
    - Write `renderTimer()` — formats `AppState.timerRemaining` (seconds) as zero-padded MM:SS, updates the display; sets button enabled/disabled states based on `timerRunning` and whether remaining is 0
    - Implement the `tick()` function — decrements `AppState.timerRemaining` by 1, calls `renderTimer()`; when remaining reaches 0 clears the interval, sets `timerRunning = false`, triggers completion signal
    - Implement the audible/visible completion signal (1–5 s): play a short `AudioContext` beep or show a CSS flash animation on the timer display
    - _Requirements: 3.1, 3.5_

  - [x] 6.2 Implement `onTimerStart()`, `onTimerStop()`, `onTimerReset()`
    - `onTimerStart()`: guard — return immediately if `timerRunning === true` or `timerRemaining === 0`; otherwise set `timerRunning = true`, start `setInterval(tick, 1000)`, store interval id in `AppState.timerIntervalId`, call `renderTimer()`
    - `onTimerStop()`: clear interval, set `timerRunning = false`, call `renderTimer()` (displayed value must remain unchanged)
    - `onTimerReset()`: call `onTimerStop()`, set `timerRemaining = AppState.timerDuration * 60`, call `renderTimer()`
    - Wire Start/Stop/Reset button listeners in `init()`
    - _Requirements: 3.2, 3.3, 3.4, 3.6, 3.7, 3.8_

  - [ ]* 6.3 Write property test for timer start idempotence (Property 11)
    - **Property 11: Timer start is idempotent when not in idle/paused state**
    - **Validates: Requirements 3.6, 3.7**
    - Use `fc.integer({ min: 1, max: 10 })` × `fc.constantFrom('running', 'done')`; call `onTimerStart()` N times; assert `timerRunning` and `timerRemaining` are unchanged
    - Tag: `// Feature: todo-life-dashboard, Property 11: Timer start is idempotent when not in idle/paused state`

- [x] 7. Implement Configurable Timer Duration
  - [x] 7.1 Implement `validateTimerDuration(value)` and `onTimerDurationChange(event)`
    - Write `validateTimerDuration(value)` — returns `false` for non-integer, empty string, or value outside [1, 120]; returns `true` otherwise
    - Write `onTimerDurationChange(event)` — calls `validateTimerDuration`; on failure show inline validation message and retain previous value; on success: if timer is running call `onTimerStop()`, set `AppState.timerDuration = value`, set `timerRemaining = value * 60`, call `Storage.save('tld_timerDuration', value)`, call `renderTimer()`
    - Implement `loadTimerDuration()` — reads `tld_timerDuration` from localStorage, validates, returns valid integer or default 25
    - Wire duration input listener in `init()`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ]* 7.2 Write property test for timer duration persistence round-trip (Property 9)
    - **Property 9: Timer duration persistence round-trip**
    - **Validates: Requirements 4.4**
    - Use `fc.integer({ min: 1, max: 120 })`; call `Storage.save('tld_timerDuration', d)` then `loadTimerDuration()`; assert returned value equals `d`
    - Tag: `// Feature: todo-life-dashboard, Property 9: Timer duration persistence round-trip`

  - [ ]* 7.3 Write property test for invalid timer durations rejected (Property 10)
    - **Property 10: Invalid timer durations are rejected without mutating state**
    - **Validates: Requirements 4.5**
    - Use `fc.oneof(fc.string(), fc.integer({ min: 121 }), fc.integer({ max: 0 }), fc.float())`; assert `validateTimerDuration` returns `false` and `AppState.timerDuration` remains unchanged
    - Tag: `// Feature: todo-life-dashboard, Property 10: Invalid timer durations are rejected without mutating state`

- [x] 8. Checkpoint — Core widgets functional
  - Ensure `index.html` opens in browser, greeting displays correct time/date/message, timer counts down, start/stop/reset work, duration change works, localStorage persists timer duration across reload. Ask the user if questions arise.

- [x] 9. Implement Task Manager — add and render
  - [x] 9.1 Implement `validateTaskDescription(value)` and `onTaskAdd(event)`
    - Write `validateTaskDescription(value)` — returns `false` for empty/whitespace-only strings and strings exceeding 200 characters; returns `true` otherwise
    - Write `onTaskAdd(event)` — prevent default; validate description; on failure show inline message and retain focus on input; on success create a `Task` object (`id` via `crypto.randomUUID()` with timestamp fallback, `description`, `completed: false`, `createdAt: Date.now()`), push to `AppState.tasks`, call `Storage.save('tld_tasks', AppState.tasks)`, call `renderTasks()`, clear the input field
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ]* 9.2 Write property test for whitespace-only task rejection (Property 2)
    - **Property 2: Whitespace-only and empty task descriptions are rejected**
    - **Validates: Requirements 5.2**
    - Use `fc.stringOf(fc.constantFrom(' ', '\t', '\n'))`; assert `validateTaskDescription` returns `false` and task list is unchanged
    - Tag: `// Feature: todo-life-dashboard, Property 2: Whitespace-only and empty task descriptions are rejected`

  - [ ]* 9.3 Write property test for over-length task rejection (Property 3)
    - **Property 3: Over-length task descriptions are rejected**
    - **Validates: Requirements 5.3, 5.7**
    - Use `fc.string({ minLength: 201 })`; assert `validateTaskDescription` returns `false` and task list is unchanged
    - Tag: `// Feature: todo-life-dashboard, Property 3: Over-length task descriptions are rejected`

  - [x] 9.4 Implement `renderTasks()` and `getSortedTasks(tasks, sortOrder)`
    - Write `getSortedTasks(tasks, sortOrder)` — creates a shallow copy via `[...tasks]`, applies the correct `sort` comparator for each of the five `SORT_ORDERS` values, returns the sorted copy without mutating the original array
    - Write `renderTasks()` — calls `getSortedTasks(AppState.tasks, AppState.sortOrder)`, clears `#task-list`, and re-renders each task as a `<li>` with `data-task-id` and `data-action` attributes for toggle/edit/delete buttons; applies completed visual style to completed tasks
    - _Requirements: 5.1, 6.1, 6.2_

  - [ ]* 9.5 Write property test for sort immutability (Property 6)
    - **Property 6: Sort does not mutate stored task order**
    - **Validates: Requirements 6.2**
    - Use `fc.array(taskArb)` and `fc.constantFrom(...Object.values(SORT_ORDERS))`; deep-clone the input before calling `getSortedTasks`; assert original array is unchanged (same length, same order)
    - Tag: `// Feature: todo-life-dashboard, Property 6: Sort does not mutate stored task order`

  - [ ]* 9.6 Write property test for sort determinism (Property 7)
    - **Property 7: Sort is pure and deterministic**
    - **Validates: Requirements 6.1, 6.2**
    - Use same arbitraries as P6; call `getSortedTasks` twice with identical args; assert both returned arrays have identical element ordering
    - Tag: `// Feature: todo-life-dashboard, Property 7: Sort is pure and deterministic`

- [x] 10. Implement Task Manager — edit, toggle, delete, sort
  - [x] 10.1 Implement task event delegation and `onTaskToggle(id)` / `onTaskDelete(id)`
    - Register a single `click` listener on `#task-list` using event delegation: resolve `e.target.closest('[data-action]')`, read `data-task-id` from the nearest `[data-task-id]` ancestor, dispatch to `onTaskToggle`, `onTaskEdit`, or `onTaskDelete` based on `data-action`
    - `onTaskToggle(id)`: find task by id, flip `completed`, call `Storage.save`, call `renderTasks()`
    - `onTaskDelete(id)`: filter task from `AppState.tasks`, call `Storage.save`, call `renderTasks()`
    - _Requirements: 5.8, 5.9, 5.10_

  - [ ]* 10.2 Write property test for task toggle inverse (Property 4)
    - **Property 4: Task completion toggle is its own inverse**
    - **Validates: Requirements 5.8**
    - Use `fc.record({ id: fc.uuid(), description: fc.string(), completed: fc.boolean() })`; toggle twice; assert final `completed` equals initial `completed`
    - Tag: `// Feature: todo-life-dashboard, Property 4: Task completion toggle is its own inverse`

  - [ ]* 10.3 Write property test for task deletion isolation (Property 5)
    - **Property 5: Task deletion removes the target and only the target**
    - **Validates: Requirements 5.9**
    - Use a non-empty `fc.array(taskArb, { minLength: 1 })` and pick a random task id from it; assert deleted id absent and all other tasks unchanged
    - Tag: `// Feature: todo-life-dashboard, Property 5: Task deletion removes the target and only the target`

  - [x] 10.4 Implement `onTaskEdit(id)` with inline edit mode
    - On `onTaskEdit(id)`: replace the task's `<li>` text with an `<input>` pre-populated with the current description; show Confirm and Cancel controls
    - On confirm: call `validateTaskDescription`; on failure show inline message, retain edit field; on success update `AppState.tasks[i].description`, call `Storage.save`, call `renderTasks()` (exits edit mode)
    - On cancel: call `renderTasks()` (restores original display without saving)
    - _Requirements: 5.4, 5.5, 5.6, 5.7_

  - [x] 10.5 Implement sort control and `onSortChange(event)`
    - `onSortChange(event)`: set `AppState.sortOrder = event.target.value`, call `Storage.save('tld_sortOrder', AppState.sortOrder)`, call `renderTasks()`
    - In `init()`: restore `sortOrder` from localStorage via `Storage.load('tld_sortOrder', 'default')`, set the `<select>` value to match
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 10.6 Write property test for task storage round-trip (Property 1)
    - **Property 1: Task storage round-trip**
    - **Validates: Requirements 5.1, 5.10, 5.11**
    - Use `fc.string({ minLength: 1, maxLength: 200 })` filtered for non-whitespace-only; add task, `JSON.stringify` + `JSON.parse` the task list; assert result contains a task with matching description and `completed === false`
    - Tag: `// Feature: todo-life-dashboard, Property 1: Task storage round-trip`

- [x] 11. Checkpoint — Task Manager functional
  - Verify add/edit/complete/delete all work, inline validation messages show correctly, sort re-orders without mutating stored data, all task state persists across page reload. Ask the user if questions arise.

- [x] 12. Implement Quick Links
  - [x] 12.1 Implement `validateLinkUrl(url)` and `onLinkAdd(event)`
    - Write `validateLinkUrl(url)` — returns `false` for any string not starting with `http://` or `https://`; returns `true` otherwise
    - Write `onLinkAdd(event)` — prevent default; validate label (1–50 chars, non-empty) and URL (1–2048 chars, valid scheme); on any failure show the correct inline message and preserve entered values; on success create `Link` object (`id`, `label`, `url`), push to `AppState.links`, call `Storage.save('tld_links', AppState.links)`, call `renderLinks()`, clear the form
    - _Requirements: 7.1, 7.3, 7.4, 7.5, 7.7_

  - [ ]* 12.2 Write property test for link URL scheme validation (Property 12)
    - **Property 12: Link URL scheme validation rejects non-HTTP(S) inputs**
    - **Validates: Requirements 7.4**
    - Use `fc.string()` filtered to exclude strings starting with `http://` or `https://`; assert `validateLinkUrl` returns `false` and links collection is unchanged
    - Tag: `// Feature: todo-life-dashboard, Property 12: Link URL scheme validation rejects non-HTTP(S) inputs`

  - [x] 12.3 Implement `renderLinks()` and `onLinkDelete(id)`
    - Write `renderLinks()` — clears `#links-list`, re-renders each link as a button (`data-link-id`, `data-action="open"`) plus a delete button (`data-action="delete"`); button text equals `link.label`
    - Register a single `click` listener on `#links-list` via event delegation; `data-action="open"` opens the URL in a new tab (`window.open(url, '_blank', 'noopener,noreferrer')`); `data-action="delete"` calls `onLinkDelete(id)`
    - `onLinkDelete(id)`: filter link from `AppState.links`, call `Storage.save`, call `renderLinks()`
    - _Requirements: 7.2, 7.6, 7.7, 7.8, 7.9_

- [x] 13. Implement Light/Dark Mode toggle
  - [x] 13.1 Implement `renderTheme()` and `onThemeToggle()`
    - Write `renderTheme()` — calls `document.body.setAttribute('data-theme', AppState.theme)`; updates `#theme-toggle` icon (🌙 for light → dark, ☀️ for dark → light) and `aria-label`
    - Write `onThemeToggle()` — flips `AppState.theme` between `'light'` and `'dark'`, calls `Storage.save('tld_theme', AppState.theme)`, calls `renderTheme()`
    - Wire `#theme-toggle` click listener in `init()`
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 13.2 Style theme toggle button in CSS
    - Add CSS rules for `#theme-toggle` in the Header section of `style.css` — position, size, cursor, no background border by default; transitions on color/background so theme switches are smooth
    - Add `/* ── 10. ANIMATIONS & TRANSITIONS ── */` section with transition rules on `body`, `.widget`/`section`, and buttons for smooth theme change
    - _Requirements: 8.1, 8.2_

- [x] 14. Implement `init()` — full hydration and wiring
  - [x] 14.1 Write `init()` and `renderAll()`
    - Write `renderAll()` — calls `renderGreeting()`, `renderTimer()`, `renderTasks()`, `renderLinks()`, `renderTheme()` in sequence
    - Write `init()`:
      1. Check `Storage.isAvailable()`; set flag and show banner if unavailable
      2. Load all persisted keys: `tld_theme`, `tld_timerDuration`, `tld_sortOrder`, `tld_tasks`, `tld_links` via `Storage.load` with their defaults; validate each value (replace out-of-range or unrecognized values with defaults)
      3. Hydrate `AppState` from loaded values; set `timerRemaining = timerDuration * 60`
      4. Set sort `<select>` value to `AppState.sortOrder`
      5. Call `renderAll()`
      6. Register all event listeners (task form submit, links form submit, sort change, theme toggle, timer buttons, duration input) — using event delegation where applicable
      7. Start the `setInterval(renderGreeting, 60_000)` clock tick
    - Call `init()` at bottom of `app.js` (deferred by `<script defer>`)
    - _Requirements: 1.3, 4.6, 5.11, 6.4, 6.5, 7.8, 8.4, 8.5, 8.6, 9.1, 9.2, 10.3_

- [ ] 15. Implement widget CSS — Greeting, Timer, Tasks, Links
  - [ ] 15.1 Style all four widget sections
    - Write CSS for each widget section in its designated block in `style.css`:
      - `#greeting-widget`: center-aligned text, large time font-size, muted date color
      - `#timer-widget`: prominent MM:SS display, button row, duration input + label
      - `#task-widget`: task input form row, sort select alignment, task list items with checkbox/toggle, edit/delete button placement, completed task strikethrough
      - `#links-widget`: add-link form two-column layout (label + URL), link button grid
    - Write `/* ── 9. VALIDATION MESSAGES ── */` CSS: inline error messages styled in `--color-danger`, small font-size, appearing below their associated field
    - All rules consume only `--color-*` tokens — no hardcoded color values
    - _Requirements: 10.1, 10.3, 11.2_

- [~] 16. Final checkpoint — Full integration
  - Open `index.html` directly from the filesystem (no dev server). Verify:
    - All four widgets render without console errors
    - Greeting shows correct time, date, and time-appropriate message
    - Timer starts, stops, resets, counts to 00:00 with completion signal, respects configurable duration
    - Tasks: add, edit (confirm + cancel), toggle, delete, all five sort orders — all work; invalid inputs show inline messages
    - Links: add with valid label + URL opens in new tab; invalid inputs show inline messages; delete removes link
    - Theme toggle applies to all components without reload; persists across reload
    - All state (tasks, links, theme, timer duration, sort order) restores correctly on reload
    - Ensure all automated tests pass. Ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- All `*` property-based tests require the [fast-check](https://github.com/dubzzz/fast-check) library (`npm install fast-check` for test runner; does not affect the app bundle)
- Each task references specific requirements for traceability
- All color values must go through CSS custom property tokens — never hardcode colors outside the token block
- The `validate → mutate → persist → re-render` cycle must be followed for every state-changing operation
- Checkpoints (tasks 8, 11, 16) ensure incremental validation at meaningful milestones
- The `timerRunning`, `timerRemaining`, and `timerIntervalId` fields in `AppState` are ephemeral — never persisted to `localStorage`
- Event delegation is required for `#task-list` and `#links-list` to avoid listener leak on re-render

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "3.1"] },
    { "id": 2, "tasks": ["2.2", "4.1"] },
    { "id": 3, "tasks": ["4.2"] },
    { "id": 4, "tasks": ["4.3", "5.1"] },
    { "id": 5, "tasks": ["5.2", "6.1"] },
    { "id": 6, "tasks": ["6.2", "7.1"] },
    { "id": 7, "tasks": ["6.3", "7.2", "7.3", "9.1"] },
    { "id": 8, "tasks": ["9.2", "9.3", "9.4"] },
    { "id": 9, "tasks": ["9.5", "9.6", "10.1"] },
    { "id": 10, "tasks": ["10.2", "10.3", "10.4", "10.5"] },
    { "id": 11, "tasks": ["10.6", "12.1"] },
    { "id": 12, "tasks": ["12.2", "12.3"] },
    { "id": 13, "tasks": ["13.1"] },
    { "id": 14, "tasks": ["13.2", "14.1"] },
    { "id": 15, "tasks": ["15.1"] }
  ]
}
```
