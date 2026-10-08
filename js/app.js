// ── 1. CONSTANTS & CONFIG ─────────────────────────────

const SORT_ORDERS = {
  DEFAULT:            'default',
  ALPHA_ASC:          'alpha-asc',
  ALPHA_DESC:         'alpha-desc',
  INCOMPLETE_FIRST:   'incomplete',
  COMPLETED_FIRST:    'completed',
};

// ── 2. APP STATE ──────────────────────────────────────

const AppState = {
  tasks: [],
  links: [],
  timerDuration: 25,
  sortOrder: 'default',
  theme: 'light',
  // ephemeral timer state (not persisted)
  timerRemaining: null,
  timerRunning: false,
  timerIntervalId: null,
};

// ── 3. LOCAL STORAGE HELPERS ──────────────────────────

/**
 * Module-level flag: set to true the first time Storage.save() fails.
 * Once true the storage-unavailable banner is shown once and never re-shown.
 */
let storageUnavailable = false;

/**
 * Show the storage-unavailable banner (once).
 * Looks for #storage-banner and removes the `hidden` attribute.
 */
function _showStorageBanner() {
  const banner = document.getElementById('storage-banner');
  if (banner) {
    banner.removeAttribute('hidden');
  }
}

/**
 * Hide the storage-unavailable banner (e.g. storage became available again).
 */
function _hideStorageBanner() {
  const banner = document.getElementById('storage-banner');
  if (banner) {
    banner.setAttribute('hidden', '');
  }
}

const Storage = {
  /**
   * Tests whether localStorage is readable and writable.
   * Performs a probe write/read/delete; returns true on success, false otherwise.
   * @returns {boolean}
   */
  isAvailable() {
    const probe = '__tld_probe__';
    try {
      localStorage.setItem(probe, '1');
      const val = localStorage.getItem(probe);
      localStorage.removeItem(probe);
      return val === '1';
    } catch (_) {
      return false;
    }
  },

  /**
   * Reads and JSON-parses a localStorage key.
   * Returns `defaultValue` if the key is missing, null, or cannot be parsed.
   * Never throws.
   * @param {string} key
   * @param {*} defaultValue
   * @returns {*}
   */
  load(key, defaultValue) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return defaultValue;
      const parsed = JSON.parse(raw);
      return parsed !== null ? parsed : defaultValue;
    } catch (_) {
      return defaultValue;
    }
  },

  /**
   * JSON-serializes `value` and writes it to localStorage under `key`.
   * On any error sets the module-level `storageUnavailable` flag and shows
   * the persistent non-blocking banner (only the first time).
   * Never throws.
   * @param {string} key
   * @param {*} value
   */
  save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      // If a previous save failed but storage works now, hide the banner.
      if (storageUnavailable) {
        storageUnavailable = false;
        _hideStorageBanner();
      }
    } catch (_) {
      if (!storageUnavailable) {
        storageUnavailable = true;
        _showStorageBanner();
      }
    }
  },
};

// ── 4. GREETING WIDGET ────────────────────────────────

/**
 * Returns a time-appropriate greeting string for the given hour (0–23).
 * - 05–11 → "Good morning"
 * - 12–17 → "Good afternoon"
 * - 18–21 → "Good evening"
 * - 22–23, 00–04 → "Good night"
 * @param {number} hour  Integer in [0, 23]
 * @returns {string}
 */
function getGreeting(hour) {
  if (hour >= 5  && hour <= 11) return 'Good morning';
  if (hour >= 12 && hour <= 17) return 'Good afternoon';
  if (hour >= 18 && hour <= 21) return 'Good evening';
  return 'Good night'; // 22–23 and 0–4
}

/**
 * Reads the current time, formats it, then updates the greeting DOM nodes.
 *
 * Happy path (Intl available, timezone detectable):
 *   - #greeting-time  → HH:MM in 24-hour format, user's local timezone
 *   - #greeting-date  → "DayName, MonthName D, YYYY" in user's local timezone
 *   - #greeting-message → getGreeting(localHour)
 *
 * Fallback (Intl throws or timezone detection fails):
 *   - #greeting-time  → HH:MM derived from UTC values
 *   - #greeting-date  → "DayName, MonthName D, YYYY (UTC)"
 *   - #greeting-message → getGreeting(utcHour)
 *
 * If DOM nodes are missing, the function exits silently.
 */
function renderGreeting() {
  const timeEl    = document.getElementById('greeting-time');
  const dateEl    = document.getElementById('greeting-date');
  const messageEl = document.getElementById('greeting-message');

  // All three nodes must exist; if the widget isn't in the DOM yet, bail out.
  if (!timeEl || !dateEl || !messageEl) return;

  const now = new Date();

  try {
    // ── Local timezone formatting ────────────────────────────────────────────

    // HH:MM in 24-hour format using the user's locale/timezone.
    // hour12: false ensures 00–23 output; minimumIntegerDigits pads single digits.
    const timeFmt = new Intl.DateTimeFormat([], {
      hour:   '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    // "DayName, MonthName D, YYYY" — e.g. "Monday, July 7, 2025"
    const dateFmt = new Intl.DateTimeFormat([], {
      weekday: 'long',
      year:    'numeric',
      month:   'long',
      day:     'numeric',
    });

    // Some environments return "24:xx" for midnight; normalise to "00:xx".
    const timeStr = timeFmt.format(now).replace(/^24:/, '00:');
    const dateStr = dateFmt.format(now);

    // Extract the local hour so we can pass it to getGreeting().
    // We parse it back from the formatted HH:MM string to stay consistent
    // with whatever timezone the Intl formatter resolved.
    const localHour = parseInt(timeStr.slice(0, 2), 10) % 24;

    timeEl.textContent    = timeStr;
    dateEl.textContent    = dateStr;
    messageEl.textContent = getGreeting(localHour);

  } catch (_) {
    // ── UTC fallback ─────────────────────────────────────────────────────────
    // Intl is unavailable or threw; fall back to UTC values and add "(UTC)" label.

    const utcHour   = now.getUTCHours();
    const utcMinute = now.getUTCMinutes();

    // Zero-pad to two digits.
    const hh = String(utcHour).padStart(2, '0');
    const mm = String(utcMinute).padStart(2, '0');

    // Build a date string from UTC parts.
    const DAY_NAMES   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const MONTH_NAMES = ['January','February','March','April','May','June',
                         'July','August','September','October','November','December'];
    const dayName   = DAY_NAMES[now.getUTCDay()];
    const monthName = MONTH_NAMES[now.getUTCMonth()];
    const day       = now.getUTCDate();
    const year      = now.getUTCFullYear();

    timeEl.textContent    = `${hh}:${mm}`;
    dateEl.textContent    = `${dayName}, ${monthName} ${day}, ${year} (UTC)`;
    messageEl.textContent = getGreeting(utcHour);
  }
}

// ── 5. FOCUS TIMER ────────────────────────────────────

/**
 * Formats a duration in whole seconds as a zero-padded "MM:SS" string.
 * MM is always at least 2 digits (can exceed 59 for long durations).
 * SS is always exactly 2 digits (00–59).
 * @param {number} totalSeconds  Non-negative integer number of seconds.
 * @returns {string}  e.g. 1500 → "25:00", 90 → "01:30", 0 → "00:00"
 */
function formatTime(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

/**
 * Plays a short audible beep using the Web Audio API (sine wave ~440 Hz, ~0.5 s).
 * Wrapped in try/catch so it never breaks the completion flow if the audio
 * context is unavailable (e.g. in a sandboxed environment or unit-test context).
 */
function playCompletionBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, ctx.currentTime);

    // Ramp gain down to avoid a click artifact at the end of the beep.
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.5);

    // Close the context once the beep is done to release audio hardware.
    oscillator.onended = () => ctx.close();
  } catch (_) {
    // Audio unavailable — silent fallback; the CSS flash still fires.
  }
}

/**
 * Emits the completion signal when the countdown reaches 00:00.
 * - Audible: 440 Hz sine-wave beep (~0.5 s) via AudioContext.
 * - Visible:  adds `timer-complete-flash` CSS class to the timer display
 *             element (#timer-display), then removes it after 3 seconds.
 *
 * Satisfies requirement 3.5: signal lasts between 1 and 5 seconds.
 */
function emitCompletionSignal() {
  // Audible signal
  playCompletionBeep();

  // Visible signal — CSS keyframe animation via class toggle
  const display = document.getElementById('timer-display');
  if (display) {
    display.classList.add('timer-complete-flash');
    setTimeout(() => {
      display.classList.remove('timer-complete-flash');
    }, 3000);
  }
}

/**
 * Reads `AppState.timerRemaining` and `AppState.timerRunning` and updates
 * every timer-related DOM element accordingly:
 *
 *   #timer-display  — updated to the current MM:SS string
 *   #timer-start    — disabled when the timer is running OR at 00:00
 *   #timer-stop     — disabled when the timer is not running
 *   #timer-reset    — always enabled
 *
 * Exits silently when DOM elements are missing so it is safe to call
 * before the DOM is fully built.
 */
function renderTimer() {
  const display   = document.getElementById('timer-display');
  const btnStart  = document.getElementById('timer-start');
  const btnStop   = document.getElementById('timer-stop');
  const btnReset  = document.getElementById('timer-reset');

  if (!display) return; // Timer widget not in DOM yet

  display.textContent = formatTime(AppState.timerRemaining);

  const atZero   = AppState.timerRemaining === 0;
  const running  = AppState.timerRunning;

  if (btnStart)  btnStart.disabled  = running || atZero;
  if (btnStop)   btnStop.disabled   = !running;
  if (btnReset)  btnReset.disabled  = false; // always enabled
}

/**
 * Called by `setInterval` once per second while the timer is running.
 * Decrements `AppState.timerRemaining` by 1, then re-renders the display.
 * When the remaining time reaches 0:
 *   1. Clears the active interval.
 *   2. Sets `AppState.timerRunning` to false.
 *   3. Sets `AppState.timerIntervalId` to null.
 *   4. Calls `emitCompletionSignal()`.
 */
function tick() {
  AppState.timerRemaining = Math.max(0, AppState.timerRemaining - 1);
  renderTimer();

  if (AppState.timerRemaining === 0) {
    clearInterval(AppState.timerIntervalId);
    AppState.timerIntervalId = null;
    AppState.timerRunning    = false;
    emitCompletionSignal();
  }
}

/**
 * Starts the focus timer countdown.
 *
 * Guards (return immediately without side-effects):
 *   - `AppState.timerRunning === true`  → timer is already counting down (Req 3.7)
 *   - `AppState.timerRemaining === 0`   → timer is exhausted; reset is required first (Req 3.6)
 *
 * Otherwise:
 *   1. Sets `AppState.timerRunning = true`.
 *   2. Starts a 1-second interval calling `tick()`.
 *   3. Stores the interval ID in `AppState.timerIntervalId`.
 *   4. Calls `renderTimer()` to update button states immediately (Req 3.2, 3.8).
 *
 * NOTE: `init()` will wire the Start button's click listener to this function.
 */
function onTimerStart() {
  // Guard: already running or exhausted — ignore activation
  if (AppState.timerRunning || AppState.timerRemaining === 0) return;

  AppState.timerRunning    = true;
  AppState.timerIntervalId = setInterval(tick, 1000);
  renderTimer();
}

/**
 * Pauses the focus timer without changing the remaining time.
 *
 *   1. Clears the active interval (safe to call even if null).
 *   2. Sets `AppState.timerRunning = false`.
 *   3. Calls `renderTimer()` — the displayed MM:SS value is unchanged (Req 3.3).
 *
 * NOTE: `init()` will wire the Stop button's click listener to this function.
 */
function onTimerStop() {
  clearInterval(AppState.timerIntervalId);
  AppState.timerIntervalId = null;
  AppState.timerRunning    = false;
  renderTimer();
}

/**
 * Resets the focus timer to the full configured duration.
 *
 *   1. Calls `onTimerStop()` to halt any active countdown and clear the interval.
 *   2. Restores `AppState.timerRemaining` to `AppState.timerDuration * 60` (Req 3.4).
 *   3. Calls `renderTimer()` to reflect the restored duration in the display.
 *
 * NOTE: `init()` will wire the Reset button's click listener to this function.
 */
function onTimerReset() {
  onTimerStop();
  AppState.timerRemaining = AppState.timerDuration * 60;
  renderTimer();
}

/**
 * Validates a candidate timer duration value.
 *
 * Returns `true` only when `value` is a finite integer in the inclusive
 * range [1, 120].  Returns `false` for:
 *   - Empty strings or non-numeric strings
 *   - Non-integer numbers (e.g. 1.5, NaN, Infinity)
 *   - Integers below 1 or above 120
 *
 * Requirement 4.1, 4.5
 *
 * @param {*} value  The candidate value to test (typically the result of
 *                   parseInt on the input field).
 * @returns {boolean}
 */
function validateTimerDuration(value) {
  // Reject empty strings up front (parseInt('') → NaN).
  if (value === '' || value === null || value === undefined) return false;
  // Must be a finite integer within the accepted range.
  return Number.isInteger(value) && value >= 1 && value <= 120;
}

/**
 * Handles changes to the timer-duration input field.
 *
 * Flow:
 *   1. Parse `event.target.value` as a base-10 integer.
 *   2. Call `validateTimerDuration(value)`.
 *   3. On failure: set `#timer-duration-error` text and return (retain old
 *      `AppState.timerDuration`).
 *   4. On success:
 *      a. Clear any existing error message.
 *      b. If the timer is currently running, call `onTimerStop()`.
 *      c. Set `AppState.timerDuration` and `AppState.timerRemaining`.
 *      d. Persist the new duration via `Storage.save`.
 *      e. Call `renderTimer()` to update the display.
 *
 * Requirement 4.2, 4.3, 4.4, 4.5
 *
 * NOTE: `init()` will wire the duration input's `change` listener to this
 * function.  The listener registration is handled there.
 *
 * @param {Event} event  The `change` (or `input`) event from the duration
 *                       input element.
 */
function onTimerDurationChange(event) {
  const value = parseInt(event.target.value, 10);
  const errorEl = document.getElementById('timer-duration-error');

  if (!validateTimerDuration(value)) {
    // Show inline validation message and leave the previous duration intact.
    if (errorEl) {
      errorEl.textContent = 'Please enter a whole number between 1 and 120.';
    }
    // Restore the input to the current (still-valid) timer duration.
    event.target.value = AppState.timerDuration;
    return;
  }

  // Valid input — clear any previous error message.
  if (errorEl) {
    errorEl.textContent = '';
  }

  // If the countdown is active, stop it before applying the new duration.
  if (AppState.timerRunning) {
    onTimerStop();
  }

  // Commit the new duration to state, storage, and the display.
  AppState.timerDuration    = value;
  AppState.timerRemaining   = value * 60;
  Storage.save('tld_timerDuration', value);
  renderTimer();
}

/**
 * Reads `tld_timerDuration` from localStorage, validates the stored value,
 * and returns a safe integer in [1, 120].
 *
 * Falls back to `25` when:
 *   - The key is absent or contains malformed JSON.
 *   - The stored value is not an integer in [1, 120].
 *
 * Requirement 4.6
 *
 * @returns {number}  A valid timer duration in minutes (integer, 1–120).
 */
function loadTimerDuration() {
  const raw = Storage.load('tld_timerDuration', 25);
  const val = Number(raw);
  return Number.isInteger(val) && val >= 1 && val <= 120 ? val : 25;
}

// ── 6. TASK MANAGER ───────────────────────────────────

/**
 * Validates a candidate task description value.
 *
 * Returns `false` for:
 *   - Empty strings (length 0)
 *   - Whitespace-only strings (trim() yields empty string)
 *   - Strings exceeding 200 characters
 *
 * Returns `true` for any non-empty, non-whitespace-only string of 1–200 characters.
 *
 * Requirements 5.2, 5.3
 *
 * @param {string} value  The candidate description to validate.
 * @returns {boolean}
 */
function validateTaskDescription(value) {
  if (typeof value !== 'string') return false;
  if (value.trim().length === 0) return false;
  if (value.length > 200) return false;
  return true;
}

/**
 * Handles submission of the add-task form.
 *
 * Flow:
 *   1. Prevent the default form submission.
 *   2. Read and validate the description from the input field.
 *   3. On failure:
 *      - Empty/whitespace: display "Task description is required." in #task-input-error.
 *      - Over 200 characters: display "Task description cannot exceed 200 characters."
 *        in #task-input-error.
 *      - Retain focus on the input field.
 *   4. On success:
 *      - Clear any existing #task-input-error message.
 *      - Generate a UUID using crypto.randomUUID() with a timestamp/random fallback.
 *      - Create a Task object: { id, description, completed: false, createdAt: Date.now() }.
 *      - Push to AppState.tasks.
 *      - Persist via Storage.save('tld_tasks', AppState.tasks).
 *      - Call renderTasks() to update the UI.
 *      - Clear the input field.
 *
 * NOTE: renderTasks() is implemented in task 9.4 and will be defined shortly after.
 *
 * Requirements 5.1, 5.2, 5.3
 *
 * @param {Event} event  The `submit` event from the add-task form.
 */
function onTaskAdd(event) {
  event.preventDefault();

  const input   = document.getElementById('task-input');
  const errorEl = document.getElementById('task-input-error');
  const value   = input ? input.value : '';

  if (!validateTaskDescription(value)) {
    // Determine which inline message to show.
    if (errorEl) {
      if (value.trim().length === 0) {
        errorEl.textContent = 'Task description is required.';
      } else {
        errorEl.textContent = 'Task description cannot exceed 200 characters.';
      }
    }
    // Retain focus on the input field.
    if (input) input.focus();
    return;
  }

  // Valid input — clear any previous error message.
  if (errorEl) {
    errorEl.textContent = '';
  }

  // Generate a unique ID: prefer crypto.randomUUID(), fall back to timestamp+random.
  const id = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `task-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  /** @type {Task} */
  const task = {
    id,
    description: value,
    completed: false,
    createdAt: Date.now(),
  };

  AppState.tasks.push(task);
  Storage.save('tld_tasks', AppState.tasks);
  renderTasks();

  // Clear the input field after successful add.
  if (input) input.value = '';
}

/**
 * Returns a sorted shallow copy of `tasks` according to `sortOrder`.
 * The original array is never mutated — a spread copy is sorted in place
 * and returned.
 *
 * Sort orders:
 *   'alpha-asc'   — A → Z by description (locale-aware)
 *   'alpha-desc'  — Z → A by description (locale-aware)
 *   'incomplete'  — incomplete tasks first (false < true numerically)
 *   'completed'   — completed tasks first (true > false numerically)
 *   'default'     — insertion order, ascending by createdAt timestamp
 *
 * Requirements 6.1, 6.2
 *
 * @param {Task[]}    tasks      Source array of task objects (not mutated).
 * @param {SortOrder} sortOrder  One of the SORT_ORDERS values.
 * @returns {Task[]}  A new sorted array.
 */
function getSortedTasks(tasks, sortOrder) {
  const copy = [...tasks];
  switch (sortOrder) {
    case 'alpha-asc':  return copy.sort((a, b) => a.description.localeCompare(b.description));
    case 'alpha-desc': return copy.sort((a, b) => b.description.localeCompare(a.description));
    case 'incomplete': return copy.sort((a, b) => a.completed - b.completed);
    case 'completed':  return copy.sort((a, b) => b.completed - a.completed);
    default:           return copy.sort((a, b) => a.createdAt - b.createdAt);
  }
}

/**
 * Re-renders the entire task list from `AppState.tasks` using the active
 * `AppState.sortOrder`.
 *
 * Steps:
 *   1. Obtain a sorted copy via `getSortedTasks`.
 *   2. Clear all children of `#task-list`.
 *   3. For each task build a `<li>` with:
 *        - `data-task-id` attribute set to the task's id.
 *        - Class `completed` when `task.completed` is true (CSS strikethrough).
 *        - A `<span>` containing the task description.
 *        - A toggle button  (`data-action="toggle"`, aria-label="Toggle complete").
 *        - An edit button   (`data-action="edit"`,   aria-label="Edit task").
 *        - A delete button  (`data-action="delete"`, aria-label="Delete task").
 *   4. Append each `<li>` to `#task-list`.
 *
 * Event delegation for the action buttons is registered once in `init()` on
 * the `#task-list` element; this function only builds the DOM.
 *
 * Requirements 5.1, 6.1, 6.2
 */
function renderTasks() {
  const listEl = document.getElementById('task-list');
  if (!listEl) return; // Widget not in DOM yet

  const sorted = getSortedTasks(AppState.tasks, AppState.sortOrder);

  // Clear existing items
  listEl.innerHTML = '';

  sorted.forEach((task) => {
    const li = document.createElement('li');
    li.dataset.taskId = task.id;
    if (task.completed) {
      li.classList.add('completed');
    }

    // Description span
    const span = document.createElement('span');
    span.textContent = task.description;

    // Toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.dataset.action = 'toggle';
    toggleBtn.textContent = '✓';
    toggleBtn.setAttribute('aria-label', 'Toggle complete');

    // Edit button
    const editBtn = document.createElement('button');
    editBtn.dataset.action = 'edit';
    editBtn.textContent = 'Edit';
    editBtn.setAttribute('aria-label', 'Edit task');

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.dataset.action = 'delete';
    deleteBtn.textContent = '✕';
    deleteBtn.setAttribute('aria-label', 'Delete task');

    li.appendChild(toggleBtn);
    li.appendChild(span);
    li.appendChild(editBtn);
    li.appendChild(deleteBtn);

    listEl.appendChild(li);
  });
}

/**
 * Flips the `completed` status of the task with the given `id`, then persists
 * and re-renders the list.
 *
 * Flow:
 *   1. Find the task in `AppState.tasks` by id.
 *   2. Toggle `task.completed` (true → false, false → true).
 *   3. Call `Storage.save('tld_tasks', AppState.tasks)`.
 *   4. Call `renderTasks()` to reflect the updated status.
 *
 * Requirement 5.8
 *
 * @param {string} id  The unique id of the task to toggle.
 */
function onTaskToggle(id) {
  const task = AppState.tasks.find((t) => t.id === id);
  if (!task) return; // Guard: unknown id — no-op

  task.completed = !task.completed;
  Storage.save('tld_tasks', AppState.tasks);
  renderTasks();
}

/**
 * Removes the task with the given `id` from `AppState.tasks`, then persists
 * and re-renders the list.
 *
 * Flow:
 *   1. Filter `AppState.tasks` to exclude the task with the matching id.
 *   2. Assign the result back to `AppState.tasks`.
 *   3. Call `Storage.save('tld_tasks', AppState.tasks)`.
 *   4. Call `renderTasks()` to reflect the removal.
 *
 * Requirement 5.9
 *
 * @param {string} id  The unique id of the task to delete.
 */
function onTaskDelete(id) {
  AppState.tasks = AppState.tasks.filter((t) => t.id !== id);
  Storage.save('tld_tasks', AppState.tasks);
  renderTasks();
}

/**
 * Switches the task `<li>` for the given `id` into inline-edit mode.
 *
 * DOM transformation:
 *   - Finds the `<li data-task-id="…">` in `#task-list`.
 *   - Clears its contents and replaces them with:
 *       <input type="text">               — pre-populated with the current description
 *       <button data-action="confirm-edit">Confirm</button>
 *       <button data-action="cancel-edit">Cancel</button>
 *       <p class="validation-message">   — hidden until validation fails
 *
 * Confirm flow:
 *   1. Call `validateTaskDescription(input.value)`.
 *   2. On failure: populate the `<p>` with the appropriate error message and
 *      return (leave the edit field intact so the user can correct it).
 *   3. On success: update `AppState.tasks[i].description`, call
 *      `Storage.save('tld_tasks', AppState.tasks)`, call `renderTasks()`
 *      (which exits edit mode by re-rendering the normal list item).
 *
 * Cancel flow:
 *   - Call `renderTasks()` to restore the original display without saving.
 *
 * Requirements 5.4, 5.5, 5.6, 5.7
 *
 * @param {string} id  The unique id of the task to edit.
 */
function onTaskEdit(id) {
  // Find the task in state
  const task = AppState.tasks.find((t) => t.id === id);
  if (!task) return; // Guard: unknown id — no-op

  // Find the corresponding <li> in the DOM
  const listEl = document.getElementById('task-list');
  if (!listEl) return;
  const li = listEl.querySelector(`[data-task-id="${id}"]`);
  if (!li) return;

  // ── Build the edit UI ──────────────────────────────────────────────────────

  // Text input pre-populated with the current description
  const editInput = document.createElement('input');
  editInput.type = 'text';
  editInput.value = task.description;
  editInput.setAttribute('aria-label', 'Edit task description');
  editInput.classList.add('task-edit-input');

  // Confirm button
  const confirmBtn = document.createElement('button');
  confirmBtn.dataset.action = 'confirm-edit';
  confirmBtn.textContent = 'Confirm';
  confirmBtn.setAttribute('aria-label', 'Confirm edit');

  // Cancel button
  const cancelBtn = document.createElement('button');
  cancelBtn.dataset.action = 'cancel-edit';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.setAttribute('aria-label', 'Cancel edit');

  // Inline validation message (hidden until needed)
  const validationMsg = document.createElement('p');
  validationMsg.classList.add('validation-message');
  validationMsg.textContent = '';

  // ── Wire button listeners ──────────────────────────────────────────────────

  confirmBtn.addEventListener('click', () => {
    const newValue = editInput.value;

    if (!validateTaskDescription(newValue)) {
      // Show the appropriate inline error and keep the edit field open
      if (newValue.trim().length === 0) {
        validationMsg.textContent = 'Task description is required.';
      } else {
        validationMsg.textContent = 'Task description cannot exceed 200 characters.';
      }
      editInput.focus();
      return;
    }

    // Valid — commit the change, persist, and re-render (exits edit mode)
    task.description = newValue;
    Storage.save('tld_tasks', AppState.tasks);
    renderTasks();
  });

  cancelBtn.addEventListener('click', () => {
    // Restore the original display without saving
    renderTasks();
  });

  // Allow confirming with Enter key while the input is focused
  editInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmBtn.click();
    if (e.key === 'Escape') cancelBtn.click();
  });

  // ── Swap the <li> contents ─────────────────────────────────────────────────
  li.innerHTML = '';
  li.appendChild(editInput);
  li.appendChild(confirmBtn);
  li.appendChild(cancelBtn);
  li.appendChild(validationMsg);

  // Focus the input so the user can start typing immediately
  editInput.focus();
  // Place cursor at the end of the pre-populated text
  editInput.setSelectionRange(editInput.value.length, editInput.value.length);
}

/**
 * Sets up event delegation on `#task-list`.
 * A single `click` listener resolves the nearest `[data-action]` ancestor,
 * reads the task id from the nearest `[data-task-id]` ancestor, and
 * dispatches to the appropriate handler.
 *
 * NOTE: Called from `init()` once the DOM is ready.
 *
 * Delegation pattern (registered in init()):
 *
 *   document.getElementById('task-list').addEventListener('click', (e) => {
 *     const btn = e.target.closest('[data-action]');
 *     if (!btn) return;
 *     const id = btn.closest('[data-task-id]').dataset.taskId;
 *     switch (btn.dataset.action) {
 *       case 'toggle': onTaskToggle(id); break;
 *       case 'edit':   onTaskEdit(id);   break;
 *       case 'delete': onTaskDelete(id); break;
 *     }
 *   });
 *
 * Requirements 5.8, 5.9, 5.10
 */
function setupTaskListDelegation() {
  const taskListEl = document.getElementById('task-list');
  if (!taskListEl) return;

  taskListEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const taskItem = btn.closest('[data-task-id]');
    if (!taskItem) return;

    const id = taskItem.dataset.taskId;

    switch (btn.dataset.action) {
      case 'toggle': onTaskToggle(id); break;
      case 'edit':   onTaskEdit(id);   break;
      case 'delete': onTaskDelete(id); break;
    }
  });
}

/**
 * Handles changes to the sort-order `<select>` control.
 *
 * Flow (validate → mutate → persist → re-render):
 *   1. Read the newly selected value from `event.target.value`.
 *   2. Set `AppState.sortOrder` to the selected value.
 *   3. Persist the new sort order via `Storage.save('tld_sortOrder', AppState.sortOrder)`.
 *   4. Call `renderTasks()` to re-render the task list in the new order.
 *      The underlying `AppState.tasks` array is NOT modified — sorting is
 *      applied at render time by `getSortedTasks` (Requirement 6.2).
 *
 * Requirements 6.1, 6.2, 6.3
 *
 * NOTE: `init()` wires this handler and restores sortOrder from localStorage:
 *   1. Load sortOrder from storage:
 *        `AppState.sortOrder = Storage.load('tld_sortOrder', 'default');`
 *   2. Set select value to match:
 *        `document.getElementById('sort-select').value = AppState.sortOrder;`
 *   3. Wire the listener:
 *        `document.getElementById('sort-select').addEventListener('change', onSortChange);`
 * Requirements 6.4, 6.5
 *
 * @param {Event} event  The `change` event from the sort `<select>` element.
 */
function onSortChange(event) {
  AppState.sortOrder = event.target.value;
  Storage.save('tld_sortOrder', AppState.sortOrder);
  renderTasks();
}

// ── 7. QUICK LINKS ────────────────────────────────────

/**
 * Validates that a URL string starts with `http://` or `https://`.
 *
 * Returns `false` for any string that does not begin with one of those two
 * schemes (including empty strings, ftp://, mailto:, etc.).
 * Returns `true` for any string that does begin with `http://` or `https://`.
 *
 * Requirement 7.4
 *
 * @param {string} url  The candidate URL string to validate.
 * @returns {boolean}
 */
function validateLinkUrl(url) {
  if (typeof url !== 'string') return false;
  return url.startsWith('http://') || url.startsWith('https://');
}

/**
 * Handles submission of the add-link form.
 *
 * Validation order and inline error messages:
 *   Label field (#link-label-input → #link-label-error):
 *     - Empty / whitespace-only → "Label is required."
 *     - > 50 characters          → "Label cannot exceed 50 characters."
 *   URL field (#link-url-input → #link-url-error):
 *     - Empty / whitespace-only → "URL is required."
 *     - doesn't start with http:// or https:// → "URL must begin with http:// or https://"
 *     - > 2048 characters        → "URL cannot exceed 2048 characters."
 *
 * On any validation failure the form stays open with entered values preserved.
 *
 * On success:
 *   - Clear both error elements.
 *   - Generate a UUID (crypto.randomUUID() with timestamp/random fallback).
 *   - Create a Link object { id, label, url }.
 *   - Push to AppState.links.
 *   - Persist via Storage.save('tld_links', AppState.links).
 *   - Call renderLinks() (implemented in task 12.3).
 *   - Clear both input fields.
 *
 * Requirements 7.1, 7.3, 7.4, 7.5, 7.7
 *
 * @param {Event} event  The `submit` event from the add-link form.
 */
function onLinkAdd(event) {
  event.preventDefault();

  const labelInput  = document.getElementById('link-label');
  const urlInput    = document.getElementById('link-url');
  const labelError  = document.getElementById('link-label-error');
  const urlError    = document.getElementById('link-url-error');

  const labelValue  = labelInput  ? labelInput.value  : '';
  const urlValue    = urlInput    ? urlInput.value    : '';

  // ── Validate label ────────────────────────────────────────────────────────
  let labelValid = true;

  if (labelValue.trim().length === 0) {
    if (labelError) labelError.textContent = 'Label is required.';
    labelValid = false;
  } else if (labelValue.length > 50) {
    if (labelError) labelError.textContent = 'Label cannot exceed 50 characters.';
    labelValid = false;
  } else {
    if (labelError) labelError.textContent = '';
  }

  // ── Validate URL ──────────────────────────────────────────────────────────
  let urlValid = true;

  if (urlValue.trim().length === 0) {
    if (urlError) urlError.textContent = 'URL is required.';
    urlValid = false;
  } else if (!validateLinkUrl(urlValue)) {
    if (urlError) urlError.textContent = 'URL must begin with http:// or https://';
    urlValid = false;
  } else if (urlValue.length > 2048) {
    if (urlError) urlError.textContent = 'URL cannot exceed 2048 characters.';
    urlValid = false;
  } else {
    if (urlError) urlError.textContent = '';
  }

  // ── Bail out if either field failed validation ─────────────────────────────
  if (!labelValid || !urlValid) return;

  // ── Both fields valid — clear errors ──────────────────────────────────────
  if (labelError) labelError.textContent = '';
  if (urlError)   urlError.textContent   = '';

  // ── Generate a unique id ──────────────────────────────────────────────────
  const id = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `link-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  /** @type {Link} */
  const link = {
    id,
    label: labelValue,
    url:   urlValue,
  };

  AppState.links.push(link);
  Storage.save('tld_links', AppState.links);
  renderLinks();

  // ── Clear the form ─────────────────────────────────────────────────────────
  if (labelInput) labelInput.value = '';
  if (urlInput)   urlInput.value   = '';
}

/**
 * Re-renders the entire links collection from `AppState.links`.
 *
 * Steps:
 *   1. Obtain `#links-list`; exit silently if absent.
 *   2. Clear all children of `#links-list`.
 *   3. For each link build a `<div class="link-item">` containing:
 *        - An `<a>` element with `data-link-id` and `data-action="open"` that
 *          displays `link.label` as its text content.
 *        - A delete `<button>` with `data-link-id`, `data-action="delete"`, and
 *          `aria-label="Delete link"`.
 *   4. Append each `<div>` to `#links-list`.
 *
 * Event delegation for the action elements is registered once in `init()` via
 * `setupLinksListDelegation()`; this function only builds the DOM.
 *
 * Requirements 7.2, 7.6, 7.8, 7.9
 */
function renderLinks() {
  const listEl = document.getElementById('links-list');
  if (!listEl) return; // Widget not in DOM yet

  // Clear existing items
  listEl.innerHTML = '';

  AppState.links.forEach((link) => {
    const div = document.createElement('div');
    div.classList.add('link-item');

    // Open button — displayed as the link label
    const openBtn = document.createElement('a');
    openBtn.dataset.linkId = link.id;
    openBtn.dataset.action = 'open';
    openBtn.textContent    = link.label;
    openBtn.href           = '#'; // prevent browser navigation; action handled via delegation
    openBtn.setAttribute('role', 'button');
    openBtn.setAttribute('aria-label', `Open ${link.label}`);

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.dataset.linkId = link.id;
    deleteBtn.dataset.action = 'delete';
    deleteBtn.textContent    = '✕';
    deleteBtn.setAttribute('aria-label', 'Delete link');

    div.appendChild(openBtn);
    div.appendChild(deleteBtn);

    listEl.appendChild(div);
  });
}

/**
 * Removes the link with the given `id` from `AppState.links`, then persists
 * and re-renders the links collection.
 *
 * Flow (validate → mutate → persist → re-render):
 *   1. Filter `AppState.links` to exclude the link with the matching id.
 *   2. Assign the result back to `AppState.links`.
 *   3. Call `Storage.save('tld_links', AppState.links)`.
 *   4. Call `renderLinks()` to reflect the removal.
 *
 * Requirement 7.6, 7.7
 *
 * @param {string} id  The unique id of the link to delete.
 */
function onLinkDelete(id) {
  AppState.links = AppState.links.filter((l) => l.id !== id);
  Storage.save('tld_links', AppState.links);
  renderLinks();
}

/**
 * Sets up event delegation on `#links-list`.
 * A single `click` listener resolves the nearest `[data-action]` ancestor,
 * reads the link id from that element's `data-link-id` attribute, and
 * dispatches to the appropriate handler.
 *
 *   - `data-action="open"`   → opens the link's URL in a new tab.
 *   - `data-action="delete"` → calls `onLinkDelete(id)`.
 *
 * NOTE: Called from `init()` once the DOM is ready.
 *
 * Requirements 7.2, 7.6
 */
function setupLinksListDelegation() {
  const linksListEl = document.getElementById('links-list');
  if (!linksListEl) return;

  linksListEl.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;

    const id     = el.dataset.linkId;
    const action = el.dataset.action;

    if (action === 'open') {
      e.preventDefault(); // prevent <a> href="#" navigation
      const link = AppState.links.find((l) => l.id === id);
      if (link) {
        window.open(link.url, '_blank', 'noopener,noreferrer');
      }
    } else if (action === 'delete') {
      onLinkDelete(id);
    }
  });
}

// ── 8. THEME ──────────────────────────────────────────

/**
 * Applies the current theme to the DOM and updates the toggle button's
 * icon and accessible label to reflect the action it will perform next.
 *
 * Steps:
 *   1. Sets `data-theme` on `<body>` to `AppState.theme` — CSS custom
 *      properties keyed on `body[data-theme="dark"]` handle all colour changes.
 *   2. Finds `#theme-toggle` and updates:
 *        - When theme is 'light': icon → 🌙, aria-label → "Switch to dark mode"
 *          (clicking will switch TO dark, so the icon previews the destination).
 *        - When theme is 'dark':  icon → ☀️, aria-label → "Switch to light mode"
 *
 * Exits silently when `#theme-toggle` is not in the DOM.
 *
 * Requirements 8.1, 8.2, 8.3
 */
function renderTheme() {
  // Apply the theme attribute — CSS takes care of all colour token overrides.
  document.body.setAttribute('data-theme', AppState.theme);

  const toggleBtn = document.getElementById('theme-toggle');
  if (!toggleBtn) return; // Widget not in DOM yet — bail out silently.

  if (AppState.theme === 'light') {
    // Currently light → next action is switching to dark → show moon icon.
    toggleBtn.textContent = '🌙';
    toggleBtn.setAttribute('aria-label', 'Switch to dark mode');
  } else {
    // Currently dark → next action is switching to light → show sun icon.
    toggleBtn.textContent = '☀️';
    toggleBtn.setAttribute('aria-label', 'Switch to light mode');
  }
}

/**
 * Toggles `AppState.theme` between `'light'` and `'dark'`, persists the
 * new value, and re-renders the theme.
 *
 * Flow (mutate → persist → re-render):
 *   1. Flip `AppState.theme`: 'light' → 'dark', anything else → 'light'.
 *   2. Persist the new theme via `Storage.save('tld_theme', AppState.theme)`.
 *   3. Call `renderTheme()` to apply the change to the DOM.
 *
 * NOTE: `init()` wires the `#theme-toggle` click listener to this function.
 *   // TODO (init): document.getElementById('theme-toggle')
 *   //              .addEventListener('click', onThemeToggle);
 *
 * Requirements 8.1, 8.2, 8.3
 */
function onThemeToggle() {
  AppState.theme = AppState.theme === 'light' ? 'dark' : 'light';
  Storage.save('tld_theme', AppState.theme);
  renderTheme();
}

// ── 9. INIT ───────────────────────────────────────────

/**
 * Calls every widget render function in sequence.
 * Used on initial load and whenever a full redraw is needed.
 *
 * Order: greeting → timer → tasks → links → theme
 *
 * Requirements 1.3, 4.6, 5.11, 6.4, 7.8, 8.4
 */
function renderAll() {
  renderGreeting();
  renderTimer();
  renderTasks();
  renderLinks();
  renderTheme();
}

/**
 * Application entry point. Runs once the script is parsed (deferred).
 *
 * Steps:
 *   1. Check localStorage availability; set `storageUnavailable` flag and
 *      show the storage banner if unavailable (Req 9.4).
 *   2. Load and validate every persisted key:
 *        - tld_theme         → 'light' | 'dark'; default 'light'
 *        - tld_timerDuration → via loadTimerDuration() (handles its own validation)
 *        - tld_sortOrder     → one of Object.values(SORT_ORDERS); default 'default'
 *        - tld_tasks         → array; default []
 *        - tld_links         → array; default []
 *   3. Hydrate AppState from the loaded / validated values.
 *   4. Set timerRemaining = timerDuration * 60 (Req 4.6).
 *   5. Set the sort <select> value and the timer-duration input value to
 *      match the loaded state (Req 6.4, 6.5).
 *   6. Call renderAll() (Req 5.11, 7.8, 8.4, 9.1, 9.2).
 *   7. Register all event listeners (Req 8.5, 8.6).
 *   8. Start the 60-second greeting clock tick (Req 1.1, 2.5).
 *
 * Requirements 1.3, 4.6, 5.11, 6.4, 6.5, 7.8, 8.4, 8.5, 8.6, 9.1, 9.2, 10.3
 */
function init() {
  // ── 1. Check localStorage availability ──────────────────────────────────
  if (!Storage.isAvailable()) {
    storageUnavailable = true;
    _showStorageBanner();
  }

  // ── 2. Load and validate each persisted key independently ────────────────

  // Theme: must be 'light' or 'dark'; default 'light' (Req 8.4, 8.5, 8.6)
  const rawTheme = Storage.load('tld_theme', 'light');
  const theme = (rawTheme === 'light' || rawTheme === 'dark') ? rawTheme : 'light';

  // Timer duration: loadTimerDuration() handles full validation (Req 4.6)
  const timerDuration = loadTimerDuration();

  // Sort order: must be one of the defined SORT_ORDERS values; default 'default' (Req 6.4, 6.5)
  const rawSortOrder = Storage.load('tld_sortOrder', 'default');
  const validSortOrders = Object.values(SORT_ORDERS);
  const sortOrder = validSortOrders.includes(rawSortOrder) ? rawSortOrder : 'default';

  // Tasks: must be an array; default [] (Req 5.11, 5.12, 9.1, 9.2)
  const rawTasks = Storage.load('tld_tasks', []);
  const tasks = Array.isArray(rawTasks) ? rawTasks : [];

  // Links: must be an array; default [] (Req 7.8, 7.9, 9.1, 9.2)
  const rawLinks = Storage.load('tld_links', []);
  const links = Array.isArray(rawLinks) ? rawLinks : [];

  // ── 3 & 4. Hydrate AppState ───────────────────────────────────────────────
  AppState.theme          = theme;
  AppState.timerDuration  = timerDuration;
  AppState.timerRemaining = timerDuration * 60;
  AppState.sortOrder      = sortOrder;
  AppState.tasks          = tasks;
  AppState.links          = links;

  // ── 5. Sync UI controls to loaded state ──────────────────────────────────
  const sortSelectEl = document.getElementById('sort-select');
  if (sortSelectEl) {
    sortSelectEl.value = AppState.sortOrder;
  }

  const timerDurationEl = document.getElementById('timer-duration');
  if (timerDurationEl) {
    timerDurationEl.value = AppState.timerDuration;
  }

  // ── 6. Initial render ─────────────────────────────────────────────────────
  renderAll();

  // ── 7. Register event listeners ──────────────────────────────────────────

  // Task form submit
  const taskFormEl = document.getElementById('task-form');
  if (taskFormEl) {
    taskFormEl.addEventListener('submit', onTaskAdd);
  }

  // Links form submit
  const linksFormEl = document.getElementById('links-form');
  if (linksFormEl) {
    linksFormEl.addEventListener('submit', onLinkAdd);
  }

  // Sort select change
  if (sortSelectEl) {
    sortSelectEl.addEventListener('change', onSortChange);
  }

  // Theme toggle click
  const themeToggleEl = document.getElementById('theme-toggle');
  if (themeToggleEl) {
    themeToggleEl.addEventListener('click', onThemeToggle);
  }

  // Timer controls
  const timerStartEl = document.getElementById('timer-start');
  if (timerStartEl) {
    timerStartEl.addEventListener('click', onTimerStart);
  }

  const timerStopEl = document.getElementById('timer-stop');
  if (timerStopEl) {
    timerStopEl.addEventListener('click', onTimerStop);
  }

  const timerResetEl = document.getElementById('timer-reset');
  if (timerResetEl) {
    timerResetEl.addEventListener('click', onTimerReset);
  }

  // Timer duration input change
  if (timerDurationEl) {
    timerDurationEl.addEventListener('change', onTimerDurationChange);
  }

  // Event delegation for task list and links list
  setupTaskListDelegation();
  setupLinksListDelegation();

  // ── 8. Start the greeting clock tick (every 60 seconds) ──────────────────
  setInterval(renderGreeting, 60_000);
}

// ── Kick off the application ──────────────────────────────────────────────────
init();
