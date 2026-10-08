# Requirements Document

## Introduction

The To-Do List Life Dashboard is a client-side web application built with HTML, CSS, and Vanilla JavaScript. It provides users with a personal productivity hub featuring a time-aware greeting, a configurable focus timer, a task manager, and a quick-access link collection. All data is persisted using the browser's Local Storage API with no backend server required. The application must run in modern browsers (Chrome, Firefox, Edge, Safari) as a standalone web app.

Selected challenges included in scope: **Light / Dark Mode**, **Change Pomodoro Time**, and **Sort Tasks**.

---

## Glossary

- **Dashboard**: The single-page web application described in this document.
- **App**: Synonym for Dashboard; refers to the running instance of the application in the browser.
- **Local_Storage**: The browser's `localStorage` API used for client-side data persistence.
- **Greeting_Widget**: The UI section that displays the current time, date, and a personalized greeting message.
- **Focus_Timer**: The countdown timer widget based on the Pomodoro technique.
- **Timer_Duration**: The user-configurable number of minutes the Focus_Timer counts down from.
- **Task_Manager**: The UI section for managing to-do items.
- **Task**: A single to-do item consisting of a text description and a completion status.
- **Task_List**: The ordered collection of Tasks displayed in the Task_Manager.
- **Quick_Links**: The UI section containing user-defined shortcut buttons that open external URLs.
- **Link**: A single Quick_Links entry composed of a label and a URL.
- **Theme**: The active color scheme of the Dashboard, either `light` or `dark`.
- **Sort_Order**: The currently active ordering applied to the Task_List (e.g., alphabetical ascending, completion status).

---

## Requirements

### Requirement 1: Display Current Time and Date

**User Story:** As a user, I want to see the current time and date when I open the Dashboard, so that I can stay oriented without switching to another application.

#### Acceptance Criteria

1. THE Greeting_Widget SHALL display the current time in HH:MM 24-hour format, updated every 60 seconds.
2. THE Greeting_Widget SHALL display the current date in "DayName, MonthName D, YYYY" format using the user's local timezone (e.g., "Wednesday, October 5, 2026").
3. WHEN the Dashboard page loads, THE Greeting_Widget SHALL render the time and date within 1 second without requiring any user interaction.
4. IF the local timezone cannot be determined, THEN THE Greeting_Widget SHALL display the time and date in UTC and show a visible label indicating "UTC".

---

### Requirement 2: Time-Based Greeting

**User Story:** As a user, I want to receive a greeting that matches the time of day, so that the Dashboard feels personal and contextually relevant.

#### Acceptance Criteria

1. WHEN the local hour is between 05:00 and 11:59, THE Greeting_Widget SHALL display the message "Good morning".
2. WHEN the local hour is between 12:00 and 17:59, THE Greeting_Widget SHALL display the message "Good afternoon".
3. WHEN the local hour is between 18:00 and 21:59, THE Greeting_Widget SHALL display the message "Good evening".
4. WHEN the local hour is between 22:00 and 04:59, THE Greeting_Widget SHALL display the message "Good night".
5. WHEN the local clock crosses a time-of-day boundary (e.g., from 11:59 to 12:00), THE Greeting_Widget SHALL automatically update the greeting without requiring a page reload.
6. IF the local time cannot be determined, THEN THE Greeting_Widget SHALL display "Hello" as the greeting and update to the correct time-based greeting once local time becomes available.

---

### Requirement 3: Focus Timer

**User Story:** As a user, I want a countdown focus timer, so that I can work in structured time blocks to improve concentration.

#### Acceptance Criteria

1. THE Focus_Timer SHALL display the remaining time in MM:SS format, where MM is a zero-padded integer between 00 and 99 and SS is a zero-padded integer between 00 and 59.
2. WHEN the user activates the start control, THE Focus_Timer SHALL begin counting down from the Timer_Duration.
3. WHEN the user activates the stop control, THE Focus_Timer SHALL pause the countdown and retain the remaining time such that the displayed MM:SS value is unchanged after the pause.
4. WHEN the user activates the reset control, THE Focus_Timer SHALL stop the countdown and restore the display to the full Timer_Duration.
5. WHEN the countdown reaches 00:00, THE Focus_Timer SHALL stop automatically and emit an audible or visible completion signal lasting between 1 and 5 seconds.
6. IF the Focus_Timer has already reached 00:00, THEN THE Focus_Timer SHALL ignore subsequent start control activations until a reset is performed.
7. IF the user activates the start control while the Focus_Timer is already counting down, THEN THE Focus_Timer SHALL ignore the activation and continue counting down without interruption.
8. WHEN the user activates the start control after a stop, THE Focus_Timer SHALL resume counting down from the retained remaining time.

---

### Requirement 4: Configurable Timer Duration

**User Story:** As a user, I want to change the focus timer duration, so that I can adapt the session length to my personal work style.

#### Acceptance Criteria

1. THE Focus_Timer SHALL provide an input control that accepts integer values between 1 and 120 (minutes, inclusive).
2. WHEN the user submits a new Timer_Duration value, THE Focus_Timer SHALL update the display to reflect the new duration in MM:SS format.
3. WHEN the user submits a new Timer_Duration value while the countdown is running, THE Focus_Timer SHALL stop the countdown and reset to the new Timer_Duration.
4. THE App SHALL persist the most recently set Timer_Duration to Local_Storage so that it is restored on the next page load.
5. IF the user submits a Timer_Duration value that is non-integer, empty, or outside the range of 1 to 120, THEN THE Focus_Timer SHALL display an inline validation message indicating the accepted range (1–120 minutes) and retain the previous Timer_Duration.
6. WHEN the Dashboard loads and Local_Storage contains a missing, corrupt, or out-of-range Timer_Duration value, THE Focus_Timer SHALL default to 25 minutes.

---

### Requirement 5: Task Management

**User Story:** As a user, I want to add, edit, complete, and delete tasks, so that I can track my work items within the Dashboard.

#### Acceptance Criteria

1. WHEN the user submits a non-empty task description of 1 to 200 characters, THE Task_Manager SHALL add a new Task to the Task_List with a default completion status of incomplete and display the new Task immediately without requiring a page reload.
2. IF the user submits an empty task description, THEN THE Task_Manager SHALL reject the submission, retain focus on the input field, and display an inline validation message indicating that the description is required.
3. IF the user submits a task description exceeding 200 characters, THEN THE Task_Manager SHALL reject the submission and display an inline validation message indicating the 200-character limit.
4. WHEN the user activates the edit control for a Task, THE Task_Manager SHALL render the Task's description as an editable field pre-populated with the Task's current description.
5. WHEN the user confirms an edit with a non-empty description of 1 to 200 characters, THE Task_Manager SHALL update the Task's description in the Task_List and exit edit mode within 500 milliseconds.
6. IF the user confirms an edit with an empty description, THEN THE Task_Manager SHALL reject the update, retain the editable field in its current state, and display an inline validation message indicating that the description is required.
7. IF the user confirms an edit with a description exceeding 200 characters, THEN THE Task_Manager SHALL reject the update and display an inline validation message indicating the 200-character limit.
8. WHEN the user toggles the completion control for a Task, THE Task_Manager SHALL update the Task's completion status to the opposite of its current value and reflect the updated status visually within 500 milliseconds.
9. WHEN the user activates the delete control for a Task, THE Task_Manager SHALL remove the Task from the Task_List and update the displayed Task_List within 500 milliseconds.
10. THE App SHALL persist all Task_List data to Local_Storage after every add, edit, completion toggle, or delete operation, completing the write within 500 milliseconds of the operation.
11. WHEN the Dashboard loads, THE Task_Manager SHALL restore the Task_List from Local_Storage and display all previously persisted Tasks within 1000 milliseconds.
12. IF Local_Storage is unavailable or returns a read error on Dashboard load, THEN THE Task_Manager SHALL initialize with an empty Task_List and display an inline message indicating that previously saved tasks could not be retrieved.

---

### Requirement 6: Sort Tasks

**User Story:** As a user, I want to sort my task list, so that I can view tasks in the order most useful to me.

#### Acceptance Criteria

1. THE Task_Manager SHALL provide a sort control with the following options: "Default" (insertion order), "A → Z" (alphabetical ascending by description), "Z → A" (alphabetical descending by description), "Incomplete first", and "Completed first".
2. WHEN the user selects a Sort_Order, THE Task_Manager SHALL re-render the Task_List in the selected order without modifying the underlying stored data.
3. WHEN the user selects a Sort_Order, THE App SHALL persist the selected Sort_Order to Local_Storage.
4. WHEN the Dashboard loads, THE App SHALL restore the Sort_Order from Local_Storage and apply it to the Task_List.
5. WHEN the Dashboard loads and no Sort_Order value exists in Local_Storage, THE Task_Manager SHALL default to the "Default" (insertion order) sort option.

---

### Requirement 7: Quick Links

**User Story:** As a user, I want to save and open favorite website shortcuts, so that I can navigate to frequently used URLs directly from the Dashboard.

#### Acceptance Criteria

1. WHEN the user submits a label of 1–50 characters and a valid URL of 1–2048 characters, THE Quick_Links section SHALL add a new Link button to the collection and display the provided label as the button text.
2. WHEN the user activates a Link button, THE App SHALL open the associated URL in a new browser tab without navigating away from the Dashboard.
3. IF the user submits an empty label or an empty URL, THEN THE Quick_Links section SHALL reject the submission, keep the form open with the entered values preserved, and display an inline validation message identifying which field is empty.
4. IF the user submits a URL that does not begin with `http://` or `https://`, THEN THE Quick_Links section SHALL reject the submission, keep the form open with the entered values preserved, and display an inline validation message indicating the URL must begin with `http://` or `https://`.
5. IF the user submits a label exceeding 50 characters or a URL exceeding 2048 characters, THEN THE Quick_Links section SHALL reject the submission, keep the form open with the entered values preserved, and display an inline validation message indicating the exceeded limit.
6. WHEN the user activates the delete control for a Link, THE Quick_Links section SHALL remove that Link from the collection immediately without requiring additional confirmation.
7. THE App SHALL persist all Link data to Local_Storage after every add or delete operation, storing each Link as a label–URL pair.
8. WHEN the Dashboard loads, THE Quick_Links section SHALL restore all Links from Local_Storage and render each as a Link button displaying its stored label.
9. IF Local_Storage is unavailable or returns malformed data on Dashboard load, THEN THE Quick_Links section SHALL render an empty collection and display an inline error message indicating that saved links could not be loaded.

---

### Requirement 8: Light / Dark Mode

**User Story:** As a user, I want to switch between a light and dark color theme, so that I can use the Dashboard comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE App SHALL provide a theme toggle control that switches the Theme between `light` and `dark` and visually indicates the currently active theme state.
2. WHEN the user activates the theme toggle control, THE App SHALL apply the selected Theme to all Dashboard UI components without reloading the page.
3. THE App SHALL persist the active Theme value to Local_Storage so that it is restored on the next page load.
4. WHEN the Dashboard loads and no Theme value exists in Local_Storage, THE App SHALL default to the `light` Theme.
5. WHEN the Dashboard loads and Local_Storage contains an unrecognized Theme value, THE App SHALL default to the `light` Theme.
6. IF Local_Storage is unavailable on Dashboard load, THEN THE App SHALL default to the `light` Theme without displaying an error.

---

### Requirement 9: Data Persistence and Restore

**User Story:** As a user, I want my data to be automatically saved and restored, so that I never lose my tasks, links, or settings between sessions.

#### Acceptance Criteria

1. THE App SHALL save Task_List data, Link data, Timer_Duration, Sort_Order, and Theme to Local_Storage independently, so that a failure to read one value does not prevent others from loading.
2. WHEN the Dashboard loads and a Local_Storage key is missing or contains malformed data, THE App SHALL fall back to the default value for that key without throwing a runtime error.
3. WHEN any Task_List data, Link data, Timer_Duration, Sort_Order, or Theme value changes, THE App SHALL persist the updated value to its corresponding Local_Storage key within 1 second of the change occurring.
4. IF Local_Storage is unavailable or write operations fail, THEN THE App SHALL continue to function using in-memory state for the current session and display an error message indicating that data will not be persisted.

---

### Requirement 10: File and Code Structure

**User Story:** As a developer, I want the codebase to follow a defined folder structure, so that the project remains clean, readable, and maintainable.

#### Acceptance Criteria

1. THE App SHALL contain exactly one CSS file located at `css/style.css`.
2. THE App SHALL contain exactly one JavaScript file located at `js/app.js`.
3. WHEN the user opens `index.html` directly in a browser without a backend server, THE App SHALL render all visible content, execute all interactive functionality, produce no JavaScript errors in the browser console, and display no broken layout.

---

### Requirement 11: Performance and Responsiveness

**User Story:** As a user, I want the Dashboard to load and respond quickly, so that it does not interrupt my workflow.

#### Acceptance Criteria

1. THE App SHALL render the initial view within 2 seconds on a standard desktop connection, measured from the time the user navigates to the Dashboard until all visible UI elements are displayed and interactive, assuming a network connection of at least 10 Mbps with latency not exceeding 50ms.
2. WHEN the user performs a UI interaction (add, edit, delete, toggle, sort, or theme switch), THE App SHALL reflect the resulting state change in the UI within 100 milliseconds, measured from the moment the interaction is confirmed (click released or key pressed) to the moment the updated UI element is visible.
3. IF the initial view has not finished rendering within 5 seconds of navigation, THEN THE App SHALL display a loading indicator and remain responsive to user input during the loading period.
