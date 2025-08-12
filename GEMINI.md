# Chronicon Project Overview

Chronicon is a web application designed to help users manage their events and activities, leveraging Google Calendar as its backend. It provides a user-friendly interface to create, view, and organize events, with a focus on tracking recurring activities and their statistics.

## Current Features

-   **Google Calendar Integration:** Seamlessly connects with the user's Google account to store and retrieve event data.
-   **User Authentication:** Secure sign-in/sign-out using Google OAuth.
-   **Chronicon Calendar Management:** Automatically creates and manages a dedicated "Chronicon" calendar within the user's Google Calendar.
-   **Event Creation & Management:** Users can create, edit, and delete events.
-   **Event Grid View:** Displays events grouped by name, showing occurrences and statistics (first/last occurrence, recurrence count, time since last, etc.).
-   **Calendar View:** Provides a traditional calendar interface to visualize events.
-   **Recurrence Handling:** Supports adding new occurrences to existing event series.
-   **Theming:** Adapts to light/dark themes.

## New Feature: Import Events

### Description
This feature will allow users to import events from any of their existing Google Calendars into their dedicated "Chronicon" calendar. The user will be able to select a source calendar, view a list of its events, choose which events to import, and then initiate the import process.

### Goals
-   **User Control:** Provide a clear and intuitive interface for selecting events to import.
-   **Data Integrity:** Ensure that only the "Chronicon" calendar is modified during the import process. No other source calendars will be altered.
-   **Duplicate Prevention:** Automatically detect and prevent the import of duplicate events (events with the same name and start date/time) that already exist in the "Chronicon" calendar. If an event with the same name exists but with different dates, new occurrences will be added.
-   **Leverage Existing Components:** Reuse the existing event card display mechanism for consistency and efficiency.

### Technical Design

#### UI
-   **New Route:** A new route `/import` will be added to the application.
-   **New Component:** A dedicated `ImportEventsPage.jsx` component will be created to house the import functionality.
-   **Sidebar Navigation:** A new navigation link labeled "Import" will be added to the sidebar, positioned below "Calendar".
-   **Calendar Selector:** A Material-UI `Select` component will be used to display a dropdown list of all Google Calendars associated with the user's account.
-   **Event Display:** Events fetched from the selected source calendar will be displayed using the existing `EventCard` component. To accommodate the selection checkboxes and provide a clear list view, each `EventCard` will occupy the full width of its container (`Grid item xs={12}`).
-   **Selection Checkboxes:** Each event card will include a checkbox, allowing the user to select or deselect individual events for import.
-   **Import Button:** A prominent "Import" button will be available, which, when clicked, will initiate the process of creating the selected events in the "Chronicon" calendar.

#### Backend/Logic (within `ImportEventsPage.jsx` and `googleService.js`)
-   **Fetch User Calendars:** Upon loading the `ImportEventsPage`, the application will fetch a list of all Google Calendars accessible to the user using `window.gapi.client.calendar.calendarList.list()`.
-   **Fetch Events from Source Calendar:** When a user selects a calendar from the dropdown, the application will use an enhanced `fetchCalendarEvents(calendarId, singleEvents)` function (from `googleService.js`) to retrieve events from that specific calendar. The `singleEvents` parameter will be set to `true` to ensure all occurrences of recurring events are fetched as individual events.
-   **Event Processing:** Fetched events will be processed using `parseGoogleEvent` (from `eventService.js`) to convert them into the application's internal event format. `groupEventsByName` will be used to maintain the concept of event series.
-   **Import Logic:**
    1.  Iterate through the events marked for import by the user.
    2.  For each selected event, perform a duplicate check against existing events in the "Chronicon" calendar.
        -   This involves fetching events from the "Chronicon" calendar.
        -   Comparison will be based on event `summary` (name) and `start.dateTime` (exact date and time).
        -   If an event with the exact same name and start date/time already exists in "Chronicon", it will be skipped to prevent duplication.
        -   If an event with the same name exists but with different start dates/times, it will be treated as a new occurrence and imported.
    3.  Use the `createEvent(chroniconCalendarId, event)` function (from `googleService.js`) to add the non-duplicate selected events to the "Chronicon" calendar.
-   **Error Handling & Feedback:** Appropriate error messages and loading indicators will be provided to the user throughout the process.

### Assumptions
-   The Google API scope `https://www.googleapis.com/auth/calendar` (already in use) is sufficient for all required operations: listing user calendars, reading events from any calendar, and creating events in the "Chronicon" calendar.
-   The "Chronicon" calendar ID is readily accessible via the `GlobalContext`.
-   Event identification by `summary` (name) is the primary and sufficient key for grouping occurrences and performing duplicate checks, as per existing application logic.

### Open Questions/Considerations
-   **Recurring Events from Other Calendars:** While `singleEvents: true` will fetch all occurrences, the import process will initially treat each imported occurrence as a new, independent event in the "Chronicon" calendar. Preserving the recurring nature of events during import (i.e., creating a new recurring event definition in Chronicon) is a more complex feature and is out of scope for this initial implementation.
-   **Event Colors:** Imported events will default to the "Chronicon" calendar's default event color or a system-defined default, rather than attempting to preserve the original source calendar's event color. This simplifies the initial implementation.
-   **Event Updates:** This feature focuses solely on importing new events. Updates to events in the source calendar after they have been imported into Chronicon are not part of this functionality.
