# Google API Integration Guide for Chronicon

This document provides a detailed guide for developers on how Chronicon integrates with Google APIs, specifically focusing on authentication, API key usage, and essential configurations within the Google Cloud Console (GCC). This is crucial for understanding the application's interaction with Google services and for setting up new development or deployment environments.

## 1. Overview of Google API Integration

Chronicon is a client-side Single-Page Application (SPA) that directly interacts with Google APIs from the user's browser. It leverages Google's official JavaScript client libraries for authentication and data operations, eliminating the need for a dedicated backend server for Google API interactions.

**Key Libraries Used:**

*   **Google API JavaScript Client Library (`gapi.client`):** Used for making direct API calls to Google services (e.g., Google Calendar API).
*   **Google Sign-In (GSI) Library (`google.accounts.oauth2`):** Used for handling OAuth 2.0 authentication flows, including user sign-in and token management.

## 2. Authentication and Authorization

Chronicon uses the OAuth 2.0 Implicit Grant Flow (via GSI) for user authentication and authorization.

### 2.1. Scopes Requested

The application requests the following OAuth 2.0 scopes to access necessary user data and Google Calendar functionalities:

*   `https://www.googleapis.com/auth/calendar`: Allows Chronicon to view, edit, share, and permanently delete all calendars that the user can access, and all events on those calendars. This is necessary for managing the "Chronicon" calendar and its events.
*   `https://www.googleapis.com/auth/userinfo.profile`: Allows Chronicon to view the user's basic profile information (e.g., name, profile picture).
*   `https://www.googleapis.com/auth/userinfo.email`: Allows Chronicon to view the user's email address.

### 2.2. Token Management

*   **Access Token Acquisition:** Upon successful user sign-in, an OAuth 2.0 access token is obtained. This token grants Chronicon temporary, limited access to the user's Google data as defined by the requested scopes.
*   **Token Storage:** The access token, along with its timestamp, is stored in the browser's `localStorage`. This allows the user's session to persist across browser sessions.
    *   **Security Note:** While convenient for client-side applications, `localStorage` is susceptible to Cross-Site Scripting (XSS) attacks. Developers must ensure robust XSS prevention measures throughout the application.
*   **Token Refresh:** Google access tokens typically expire after 1 hour. Chronicon implements an automatic token refresh mechanism using the GSI client's silent refresh capabilities. This ensures that the user's session remains active without requiring frequent re-authentication.
*   **Token Revocation:** When a user signs out, Chronicon attempts to explicitly revoke the access token, invalidating it immediately and enhancing security.

## 3. Google API Key Usage

An API Key is used by Chronicon primarily for initializing the Google API client and discovering available API services.

*   **Purpose:** The API Key identifies your project to Google and is used for quota management and basic access to public APIs.
*   **Exposure:** For client-side applications, the API Key is inherently exposed in the client-side code. Therefore, **strict restrictions in the Google Cloud Console are mandatory.**

## 4. Essential Google Cloud Console (GCC) Configurations

Proper configuration in the Google Cloud Console is **critical** for the security and functionality of Chronicon. Any developer setting up a new project or deployment environment must ensure these steps are followed meticulously.

### 4.1. Create a Google Cloud Project

If you don't have one, create a new project in the Google Cloud Console.

### 4.2. Enable Required APIs

Navigate to "APIs & Services" > "Enabled APIs & Services" and ensure the following APIs are enabled for your project:

*   **Google Calendar API**
*   **Google People API** (or Userinfo API, if specifically listed)

### 4.3. Configure OAuth Consent Screen

Navigate to "APIs & Services" > "OAuth consent screen".

*   **User Type:** Select "External" (unless your application is only for users within your Google Workspace organization).
*   **Application Information:** Provide a clear application name, user support email, and developer contact information.
*   **Scopes:** Add the exact scopes listed in Section 2.1.
*   **Test Users:** During development, add test users who can access the application before it's published.
*   **Publishing Status:** For production deployment, the application will need to be verified by Google.

### 4.4. Create OAuth 2.0 Client ID (Web application)

Navigate to "APIs & Services" > "Credentials".

*   Click "CREATE CREDENTIALS" > "OAuth client ID".
*   **Application type:** Select "Web application".
*   **Name:** Provide a descriptive name (e.g., "Chronicon Web Client").
*   **Authorized JavaScript origins:** This is **CRITICAL**. You *must* add the exact URLs where your application will be hosted.
    *   **Development:** `http://localhost:5173` (or whatever port Vite uses)
    *   **Production:** `https://your-domain.com` (and any subdomains if applicable, e.g., `https://app.your-domain.com`).
    *   **Do NOT use wildcard origins (`*`) in production.**
*   **Authorized redirect URIs:** For this client-side application, you typically do not need to configure redirect URIs unless you are using a flow that requires them (e.g., if you were to switch to an authorization code flow with a backend). For the GSI library's popup mode, this is often not required.
*   After creation, note down your **Client ID**. This will be used as `VITE_GOOGLE_CLIENT_ID` in your `.env` file.

### 4.5. Create API Key

Navigate to "APIs & Services" > "Credentials".

*   Click "CREATE CREDENTIALS" > "API Key".
*   **API Key Restrictions (CRITICAL):**
    *   **Application restrictions:** Select "HTTP referrers (web sites)".
        *   Add your exact domain(s) as referrers, using wildcards for paths if necessary (e.g., `https://your-domain.com/*`).
        *   Include your development URL (`http://localhost:5173/*`).
    *   **API restrictions:** Select "Restrict key" and choose only the APIs your application uses:
        *   **Google Calendar API**
        *   **Google People API** (or Userinfo API)
    *   **Do NOT leave the API Key unrestricted.**
*   After creation, note down your **API Key**. This will be used as `VITE_GOOGLE_API_KEY` in your `.env` file.

## 5. Environment Variables

Chronicon uses environment variables to store sensitive Google API credentials. These are loaded via Vite's `import.meta.env` mechanism.

*   Create a `.env` file in the project root (or copy from `.env.example`).
*   Populate it with your obtained credentials:

    ```dotenv
    VITE_GOOGLE_API_KEY=YOUR_GOOGLE_API_KEY_HERE
    VITE_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID_HERE
    ```

*   **Security Note:** Ensure your `.env` file is listed in `.gitignore` to prevent it from being committed to version control.

## 6. Deployment Considerations

When deploying Chronicon to a static web server (e.g., Nginx, Caddy on a VPS):

*   **HTTPS:** Always serve your application over HTTPS. This is a fundamental security practice and often a requirement for Google OAuth flows.
*   **Environment Variables:** Ensure that your hosting environment correctly sets the `VITE_GOOGLE_API_KEY` and `VITE_GOOGLE_CLIENT_ID` during the build process or provides them to the client-side application securely. For static sites, these are typically embedded at build time.
*   **GCC Configuration Updates:** After deployment, **immediately update the "Authorized JavaScript origins" for your OAuth 2.0 Client ID and the "HTTP referrers" for your API Key in the Google Cloud Console** to reflect your production domain(s). Failure to do so will result in authentication and API call failures.
