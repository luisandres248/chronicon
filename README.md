# Chronicon - Internal Developer Documentation

This document provides a comprehensive overview of the Chronicon web application, intended for internal development teams. It details the project's current state, architectural decisions, technical stack, and key functionalities.

## 1. Project Overview

Chronicon is a single-page application (SPA) designed to help users manage and visualize personal events by integrating with their Google Calendar. It focuses on tracking recurring activities and important dates, leveraging a dedicated "Chronicon" calendar within the user's Google account.

## 2. Current Features

*   **Google Calendar Integration:** Seamlessly connects with the user's Google account for event data storage and retrieval.
*   **User Authentication:** Secure sign-in/sign-out using Google OAuth 2.0, managed client-side.
*   **Dedicated Chronicon Calendar:** Automatically creates and manages a specific "Chronicon" calendar within the user's Google Calendar, ensuring data isolation.
*   **Event Management (CRUD):** Full Create, Read, Update, and Delete (CRUD) functionality for events.
*   **Recurrence Handling:** Supports adding new occurrences to existing event series.
*   **Event Visualization:**
    *   **Grid View:** Displays events grouped by name, providing detailed statistics such as first/last occurrence, recurrence count, time since last event, and average gap between occurrences.
    *   **Calendar View:** Offers a traditional calendar interface for visualizing events chronologically.
*   **Event Import:** Functionality to import events from any user-selected Google Calendar into the Chronicon calendar, including calendar selection, event listing with checkboxes, and duplicate prevention.
*   **Theming:** Multiple Material UI themes are available (Light, Dark, Chronicon, Ocean Breeze, Sunset Glow), allowing users to customize the application's appearance.
*   **Internationalization (i18n):** Supports multiple languages, with English and Spanish currently implemented.
*   **User Configuration:** Persists user preferences (theme, date format, language) in local storage.
*   **Optimistic UI Updates:** Implemented for event update and delete operations, providing immediate UI feedback and rolling back changes only if the API call fails.
*   **Robust Token Management:** Automatic token refresh and retry mechanisms for Google API calls to handle token expiration gracefully.

## 3. Technology Stack

*   **Frontend Framework:** React (v18)
*   **Build Tool:** Vite (v5)
*   **UI Library:** Material UI (MUI v5) with Emotion for styling.
*   **State Management:** React Context API
*   **Routing:** React Router DOM (v6)
*   **Date Management:** `date-fns`
*   **Internationalization:** `i18next` and `react-i18next`
*   **Google API Client:** Google API JavaScript Client Library (`gapi.client`) and Google Sign-In (GSI) library for client-side interaction with Google Calendar API.
*   **Recurrence Rules:** `rrule` for handling complex recurrence patterns (though currently used for simple recurrence creation).
*   **Color Picker:** `react-color`

## 4. Project Structure

The project follows a standard React application structure, organized for modularity and separation of concerns:

```
/home/lmarquez/Documents/personal/chronicon/
├───public/                 # Static assets (favicons)
├───src/
│   ├───App.jsx             # Main application component, handles routing and global layout
│   ├───i18n.js             # Internationalization configuration
│   ├───index.css           # Global CSS styles (minimal, mostly font imports)
│   ├───main.jsx            # Application entry point, React DOM rendering
│   ├───components/         # Reusable UI components
│   │   ├───AddRecurrenceDialog.jsx
│   │   ├───EventActionDialog.jsx
│   │   ├───EventCalendar.jsx
│   │   ├───EventCard.jsx
│   │   ├───EventForm.jsx
│   │   ├───EventsGrid.jsx
│   │   ├───ImportEventCard.jsx
│   │   ├───Logo.jsx
│   │   ├───Navbar.jsx
│   │   ├───Sidebar.jsx
│   │   ├───SmallLogo.jsx
│   │   └───SortingControls.jsx
│   ├───context/
│   │   └───GlobalContext.jsx # Centralized state management and business logic
│   ├───locales/            # Translation files (e.g., en.json, es.json)
│   ├───pages/              # Top-level components representing different views/routes
│   │   ├───Config.jsx
│   │   └───ImportEventsPage.jsx
│   ├───services/           # API interaction and data transformation logic
│   │   ├───eventService.js # Event data parsing, transformation, and statistics
│   │   └───googleService.js# Google API interactions (auth, calendar, events)
│   └───utils/              # Utility functions
│       ├───dateFormatter.js# Date formatting utilities
│       └───logger.js       # Custom logging utility
├───.dockerignore           # Files to ignore when building Docker images
├───.gitignore              # Files to ignore in Git
├───Dockerfile              # Docker build instructions
├───index.html              # Main HTML file
├───package-lock.json       # Exact dependency tree
├───package.json            # Project metadata and dependencies
├───README.md               # This document
└───vite.config.js          # Vite build configuration
```

## 5. Architecture and Design Decisions

### 5.1. Client-Side Application (SPA)

Chronicon is implemented as a Single-Page Application (SPA) using React. All rendering and logic occur client-side, with direct interaction with Google APIs from the browser.

### 5.2. Centralized State Management (React Context API)

The application leverages React's Context API (`src/context/GlobalContext.jsx`) for global state management. This design choice centralizes all core application state (user, calendar, events, configuration, loading states) and business logic, providing a single source of truth and minimizing prop drilling.

*   **`GlobalContext.jsx` Responsibilities:**
    *   Manages application-wide state.
    *   Handles user authentication flow (sign-in, sign-out).
    *   Orchestrates Google Calendar API interactions via `googleService.js`.
    *   Implements optimistic UI updates for event modifications.
    *   Persists user configuration to `localStorage`.
    *   Manages various loading and error states for a responsive UX.

### 5.3. Service Layer for API Interaction

A dedicated `services` layer (`src/services/`) abstracts interactions with external APIs and handles data transformation:

*   **`googleService.js`:**
    *   Encapsulates all direct communication with Google APIs (Google Calendar API, Google Sign-In).
    *   Manages OAuth 2.0 authentication, including token acquisition, storage, and automatic refreshing.
    *   Handles the creation and retrieval of the dedicated "Chronicon" calendar.
    *   Provides CRUD operations for Google Calendar events.
    *   Includes robust error handling and retry mechanisms for API calls.
*   **`eventService.js`:**
    *   Acts as a data mapper, transforming event objects between the application's internal model and the Google Calendar API's format.
    *   Parses custom metadata (e.g., `tags`) stored in Google Calendar's `extendedProperties`.
    *   Provides utility functions for grouping events and calculating various event-related statistics (e.g., recurrence count, time since last occurrence).

### 5.4. Theming System (Material UI)

The application utilizes Material UI's theming capabilities to provide a consistent and customizable visual experience. Multiple predefined themes are available, and the user's selected theme is persisted.

### 5.5. Internationalization

The application supports internationalization using `i18next`, allowing for easy translation of UI elements into different languages. Translation files are located in `src/locales/`.

### 5.6. Data Persistence

*   **User Configuration:** Stored in `localStorage` for client-side persistence across sessions.
*   **Google Session Data:** Google API tokens, user profile, and Chronicon calendar ID are stored in `localStorage` to maintain user sessions.

### 5.7. Event Metadata Handling

Custom event metadata, such as `tags`, is stored securely and robustly using Google Calendar's `extendedProperties.private` field. This ensures that application-specific data is associated directly with the Google Calendar event without interfering with standard event fields.

### 5.8. Logging

A custom logging utility (`src/utils/logger.js`) is implemented to provide configurable logging levels (DEBUG, INFO, WARN, ERROR). This aids in development and debugging, with log levels dynamically adjustable via `sessionStorage` or `window` overrides.

## 6. Conventions

*   **Component Naming:** PascalCase for React components (e.g., `EventCard.jsx`).
*   **File Naming:** PascalCase for components, camelCase for services and utilities.
*   **Styling:** Primarily relies on Material UI components and their styling props. Minimal global CSS.
*   **State Management:** Prefers `useState` and `useContext` for local and global state respectively.
*   **Asynchronous Operations:** Uses `async/await` for handling promises.
*   **Error Handling:** Centralized error states in `GlobalContext` and `try...catch` blocks for API calls.
*   **Environment Variables:** Uses Vite's `import.meta.env` for environment-specific configurations (e.g., Google API keys).