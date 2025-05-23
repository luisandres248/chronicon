# Chronicon

Chronicon is a web application designed for personal use to help manage and visualize events by integrating with your Google Calendar. It simplifies tracking recurring activities or important dates by working with a dedicated "Chronicon" calendar within your Google account.

## Key Features

*   **Secure Google Account Sign-In**: Authenticates using Google OAuth 2.0 to access your calendar data securely.
*   **Dedicated "Chronicon" Calendar**: Automatically detects if a Google Calendar named "Chronicon" exists or creates one if it doesn't. All events managed by the app are stored here.
*   **Event Management**:
    *   **Grid View**: View all your Chronicon events in an organized grid.
    *   **Create Events**: Add new events with details like name (summary), start date, description, color-coding, and tags.
    *   **Update Events**: Modify existing event details.
    *   **Delete Events**: Remove events from your calendar.
*   **Calendar Visualization**:
    *   **Traditional View**: Displays events on a familiar month-by-month calendar layout, highlighting days with occurrences.
    *   **Stream View**: Presents a chronological stream of all days from the first event up to the current day, marking event occurrences.
*   **Event Statistics & Insights**:
    *   Track the total number of occurrences for each event.
    *   See the date of the first and most recent occurrence.
    *   View time elapsed since the first/last occurrence (in days, months, years, and detailed time).
    *   Calculate and display the average time gap between occurrences for recurring events.
    *   Organize and filter by event tags.
*   **User Interface**:
    *   **Dark Mode**: Switch between light and dark themes for comfortable viewing.
    *   **Responsive Design**: Adapts to different screen sizes for use on desktop or mobile devices.
    *   **Notifications**: Provides feedback for actions like event creation, updates, and authentication status.

## Technology Stack

*   Frontend: React, Vite
*   UI: Material UI (MUI)
*   Date Management: date-fns
*   Styling: Tailwind CSS (as per vite.config.ts, though MUI is primary)

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
