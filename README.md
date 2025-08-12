# Chronicon

Chronicon is a web application designed for personal use to help manage and visualize events by integrating with your Google Calendar. It simplifies tracking recurring activities or important dates by working with a dedicated "Chronicon" calendar within your Google account.

## Current Features

-   **Google Calendar Integration:** Seamlessly connects with the user's Google account to store and retrieve event data.
-   **User Authentication:** Secure sign-in/sign-out using Google OAuth.
-   **Chronicon Calendar Management:** Automatically creates and manages a dedicated "Chronicon" calendar within the user's Google Calendar.
-   **Event Creation & Management:** Users can create, edit, and delete events.
-   **Event Grid View:** Displays events grouped by name, showing occurrences and statistics (first/last occurrence, recurrence count, time since last, etc.).
-   **Calendar View:** Provides a traditional calendar interface to visualize events.
-   **Recurrence Handling:** Supports adding new occurrences to existing event series.
-   **Theming:** Adapts to light/dark themes.
-   **SmallLogo Theme Adaptability:** The small logo now dynamically adjusts its colors based on the active theme.

## Technology Stack

*   Frontend: React, Vite
*   UI: Material UI (MUI)
*   State Management: React Context
*   Date Management: date-fns

## Getting Started (Local Development)

1.  **Prerequisites**:
    *   Node.js and npm installed.
    *   A Google Account.
    *   You'll need to set up a Google Cloud Project to obtain an API Key and OAuth 2.0 Client ID.
        *   Enable the "Google Calendar API" and "Google People API" (or Userinfo API).
        *   Configure the OAuth consent screen.
        *   Create an OAuth 2.0 Client ID (for Web application) and ensure your development URL (e.g., `http://localhost:5173`) is an authorized JavaScript origin.
        *   Create an API Key and restrict it appropriately (see Security Notes).

2.  **Clone the repository (if applicable) or ensure you are in the project root.**

3.  **Install dependencies**:
    ```bash
    npm install
    ```

4.  **Set up environment variables**:
    *   Create a `.env` file in the project root by copying `.env.example`.
    *   Replace the placeholder values with your actual Google API Key and Client ID:
        ```
        VITE_GOOGLE_API_KEY=YOUR_GOOGLE_API_KEY_HERE
        VITE_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID_HERE
        ```

5.  **Run the development server**:
    ```bash
    npm run dev
    ```
    The application should be available at `http://localhost:5173` (or another port if specified).

## Security Notes

*   The Google API Key (`VITE_GOOGLE_API_KEY`) and Client ID (`VITE_GOOGLE_CLIENT_ID`) are sensitive. Keep them confidential.
*   The `.env` file, which contains these keys, is excluded from Git by `.gitignore`.
*   **Crucial for deployed applications**: When you deploy this application (e.g., to Vercel), you must configure these environment variables in your hosting provider's settings.
*   **Google Cloud API Key Restrictions**:
    *   **Application restrictions**: For client-side usage, set this to "HTTP referrers". Add your Vercel domain(s) (e.g., `your-app-name.vercel.app`) and your local development URLs (e.g., `http://localhost:5173`) to the list of allowed referrers.
    *   **API restrictions**: Restrict the key to only allow usage of the "Google Calendar API" and any other specific APIs you enabled (like "Google People API" for user profile information).
    *   Regularly monitor API usage in the Google Cloud Console.
    It's important to understand that while HTTP referrer and API restrictions are crucial for client-side API key security, they are not entirely foolproof (e.g., referrers can sometimes be spoofed). For applications requiring higher security or handling more sensitive operations, especially if a backend is introduced, moving the API key to a backend proxy that makes Google API calls on behalf of the client is a more robust security architecture. However, for a purely client-side application, diligent API key restrictions in GCP are the primary line of defense.

## Architectural Notes & Future Improvements

This section outlines the project's architecture and potential future enhancements.

### 1. Centralized Logic via React Context (Completed)

*   **Implementation**: The application's architecture was refactored to centralize all business logic and state management within `GlobalContext.jsx`. Components like `EventsGrid.jsx` and `Sidebar.jsx` are now primarily presentational, consuming data and calling functions (e.g., `handleSignIn`, `handleCreateEvent`) from the context.
*   **Benefits**: This approach simplifies components, prevents logic duplication, and makes the codebase significantly easier to maintain and debug.

### 2. Robust Metadata Storage (Completed)

*   **Implementation**: Custom event data (like `tags`) is now stored using Google Calendar's **`extendedProperties`**. This is a dedicated, invisible key-value store on each event.
*   **Benefits**: This method is robust, secure, and prevents accidental data corruption by separating application metadata from the user-visible event description.

### 3. API/UX Optimizations (Partially Completed)

*   **Completed**: Unnecessary API calls were eliminated (e.g., after closing a form without changes) to improve performance.
*   **Completed**: **Optimistic Updates** were implemented for `update` and `delete` operations. The UI now updates instantly, providing a faster user experience, with changes reverted only if the background API call fails.
*   **Future Improvement**: Implement optimistic updates for event *creation*. This is more complex as it requires creating a temporary local event and replacing it once the final event object is received from Google's API.

### 4. Code Simplification & Validation (Completed)

*   **Completed**: The codebase was standardized to JavaScript, removing the TypeScript configuration.
*   **Completed**: A validation check was added to `googleService.js` to ensure Google API credentials are provided in the environment, preventing configuration-related errors.
*   **Completed**: The sorting controls were extracted from `EventsGrid.jsx` into a dedicated `SortingControls.jsx` component, making the main grid component cleaner.

### 5. Bug Fixes and Code Stability (Completed)

*   **Completed**: Resolved a syntax error (`Missing semicolon`) in the `StatChip` component within `EventCalendar.jsx`.
*   **Completed**: Fixed `ReferenceError: theme is not defined` in `EventCalendar.jsx` by correctly initializing the `theme` object using the `useTheme` hook.
*   **Completed**: Addressed a "Rules of Hooks" violation in `EventCalendar.jsx` by ensuring all hooks are called unconditionally at the top level of the component.
*   **Completed**: Corrected `ReferenceError: Cannot access 'defaultEventColor' before initialization` in `EventCalendar.jsx` by reordering variable declarations to ensure proper initialization before use.

### 6. Visual and Style Enhancements (Completed)

*   **SmallLogo Theme Adaptability**: The small logo now dynamically adjusts its colors based on the active theme.
*   **Internationalization (i18n)**: Implement an i18n layer with English as the default language and a language selector in the configuration for English and Spanish. Ensure no mixed languages.

### 7. New Feature Implementation (Completed)

*   **Import Events Feature**: Implemented functionality to import events from any Google Calendar into the Chronicon calendar, including calendar selection, event listing with checkboxes, and duplicate prevention.
