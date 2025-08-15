import logger from "../utils/logger.js";
import { Capacitor } from "@capacitor/core";
import { GoogleAuth } from "@capacitor/google-auth";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

let gapiInitialized = false;
let tokenClient = null;
let tokenRefreshInProgress = false;
let tokenExpiryTime = null;

/**
 * Sets the token expiry time to 55 minutes from the current time.
 * Google access tokens typically expire in 1 hour.
 */
const setTokenExpiryTime = () => {
  tokenExpiryTime = Date.now() + 55 * 60 * 1000; // 55 minutes in milliseconds
};

/**
 * Checks if the current access token is expiring soon (within the next 5 minutes).
 * @returns {boolean} True if the token is expiring soon or not set, false otherwise.
 */
const isTokenExpiringSoon = () => {
  if (!tokenExpiryTime) return true; // If expiry time isn't set, assume it's expiring.
  return Date.now() > tokenExpiryTime - 5 * 60 * 1000; // 5 minutes buffer
};

/**
 * Loads stored Google API session data (token, profile, calendar) from localStorage.
 * If a token exists, it attempts to set it in the GAPI client and restore its expiry time.
 * @returns {object} An object containing the token, profile, and calendar, or null for each if not found/invalid.
 */
const loadStoredSession = () => {
  try {
    const token = localStorage.getItem("gapi-token");
    const tokenTimestamp = localStorage.getItem("gapi-token-timestamp");
    const profile = JSON.parse(localStorage.getItem("user-profile"));
    const calendar = JSON.parse(localStorage.getItem("chronicon-calendar"));

    if (token && window.gapi?.client) {
      window.gapi.client.setToken({ access_token: token });
      
      if (tokenTimestamp) {
        // Restore expiry time, calculated as 55 minutes from the original grant time.
        tokenExpiryTime = parseInt(tokenTimestamp, 10) + 55 * 60 * 1000;
      }
    }

    return { token, profile, calendar };
  } catch (error) {
    logger.error("Error loading stored session:", error);
    // Clear potentially corrupted session data from localStorage
    localStorage.removeItem("gapi-token");
    localStorage.removeItem("gapi-token-timestamp");
    localStorage.removeItem("user-profile");
    localStorage.removeItem("chronicon-calendar");
    if (window.gapi?.client) {
      window.gapi.client.setToken(null);
    }
    return { token: null, profile: null, calendar: null };
  }
};

/**
 * Refreshes the Google access token using the GSI client.
 * Ensures only one refresh operation is in progress at a time.
 * @returns {Promise<string>} A promise that resolves with the new access token or rejects with an error.
 */
export const refreshToken = () => {
  return new Promise((resolve, reject) => {
    if (tokenRefreshInProgress) {
      logger.warn("Token refresh already in progress, new request rejected.");
      // Avoids multiple concurrent refresh attempts.
      return reject(new Error("Token refresh already in progress")); 
    }
    
    if (!tokenClient) {
      logger.error("Token client not initialized, cannot refresh token.");
      return reject(new Error("Token client not initialized"));
    }
    
    tokenRefreshInProgress = true;
    logger.info("Refreshing token...");

    // Define the callback for the token client's response.
    tokenClient.callback = async (response) => { 
      tokenRefreshInProgress = false; 
      if (response.error) {
        logger.error("Token refresh error:", response);
        // Clear potentially invalid token data on error
        localStorage.removeItem("gapi-token");
        localStorage.removeItem("gapi-token-timestamp");
        if (window.gapi?.client) {
          window.gapi.client.setToken(null);
        }
        reject(response); // Reject the outer promise
        return;
      }
      
      try {
        const token = response.access_token;
        window.gapi.client.setToken({ access_token: token });
        
        localStorage.setItem("gapi-token", token);
        localStorage.setItem("gapi-token-timestamp", Date.now().toString());
        setTokenExpiryTime(); 
        
        logger.info("Token refreshed successfully");
        resolve(token); 
      } catch (error) {
        logger.error("Error processing token refresh response:", error);
        reject(error); 
      }
    };
    
    try {
      // Attempt a silent token refresh. The GSI library handles the UX mode (popup/redirect)
      // if user interaction is required and 'prompt' is not specified or is empty.
      tokenClient.requestAccessToken({ prompt: "" }); 
    } catch (error) {
      // Handles immediate errors from the requestAccessToken call itself.
      logger.error("Error invoking tokenClient.requestAccessToken for refresh:", error);
      tokenRefreshInProgress = false;
      tokenClient.callback = ""; // Clear the callback if the request failed immediately.
      reject(error);
    }
  });
};

/**
 * Executes a given API call, automatically handling token refresh if needed.
 * If the token is expiring soon, it refreshes it before making the API call.
 * If the API call fails with a 401 error, it attempts to refresh the token and retries the call.
 * @param {Function} apiCall - A function that returns a Promise representing the API call.
 * @returns {Promise<any>} The result of the API call.
 */
export const executeWithTokenRefresh = async (apiCall) => {
  try {
    if (isTokenExpiringSoon()) {
      logger.info("Token is expiring soon or not set, attempting refresh before API call...");
      await refreshToken();
    }
    
    return await apiCall();
  } catch (error) {
    // Check if the error is an authentication error (e.g., 401)
    if (error.status === 401 || (error.result && error.result.error && error.result.error.code === 401)) {
      logger.warn("Received 401 error from API call, attempting to refresh token and retry.");
      try {
        await refreshToken();
        // Retry the API call with the new token
        return await apiCall();
      } catch (refreshError) {
        logger.error("Failed to refresh token after API call failed:", refreshError);
        throw refreshError;
      }
    }
    throw error;
  }
};

export const initGoogleAPI = async () => {
  if (!CLIENT_ID || !API_KEY) {
    const errorMsg = "Google API Client ID or API Key is missing. Please check your .env file.";
    logger.error(errorMsg);
    throw new Error(errorMsg);
  }

  if (gapiInitialized) {
    return Promise.resolve(window.gapi);
  }

  return new Promise((resolve, reject) => {
    const gapiScript = document.createElement("script");
    gapiScript.src = "https://apis.google.com/js/api.js";

    gapiScript.onload = () => {
      // Load the Google Sign-In (GSI) client library after GAPI is loaded.
      const gsiScript = document.createElement("script");
      gsiScript.src = "https://accounts.google.com/gsi/client";

      gsiScript.onload = () => {
        // Initialize the GAPI client after GSI is loaded.
        window.gapi.load("client", async () => {
          try {
            await window.gapi.client.init({
              apiKey: API_KEY,
              discoveryDocs: [
                "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest", // Calendar API
              ],
            });

            // Initialize the GSI token client for handling OAuth2.
            tokenClient = google.accounts.oauth2.initTokenClient({
              client_id: CLIENT_ID,
              scope: SCOPES,
              callback: "", // Callback is defined dynamically at the time of token request.
              error_callback: (err) => { // Handles errors from the token client itself.
                logger.error("Token client error_callback triggered:", err);
                
                // Specifically handle popup blocked/closed errors by dispatching a custom event.
                if (err.type === 'popup_failed_to_open' || err.type === 'popup_closed') {
                  logger.warn("Popup was blocked or closed by the user. Dispatching 'auth-popup-blocked' event.");
                  
                  if (typeof window !== 'undefined') {
                    const errorEvent = new CustomEvent('auth-popup-blocked', { 
                      detail: { message: "El navegador bloqueó la ventana de autenticación. Por favor, permite ventanas emergentes para este sitio." } 
                    });
                    window.dispatchEvent(errorEvent);
                  }
                }
              },
              ux_mode: "popup", // Prefer popup UX for token requests.
              include_granted_scopes: true, // Include previously granted scopes.
            });

            // Attempt to load any existing session from localStorage.
            const { token } = loadStoredSession();
            if (token) {
              window.gapi.client.setToken({ access_token: token });
            }

            gapiInitialized = true;
            resolve(window.gapi);
          } catch (error) {
            logger.error("Error initializing GAPI client:", error);
            reject(error);
          }
        });
      };

      gsiScript.onerror = (error) => {
        logger.error("Error loading GSI script:", error);
        reject(error);
      };
      document.body.appendChild(gsiScript);
    };

    gapiScript.onerror = (error) => {
      logger.error("Error loading GAPI script:", error);
      reject(error);
    };
    document.body.appendChild(gapiScript);
  });
};

export const checkSignInStatus = () => {
  const { token, profile, calendar } = loadStoredSession();
  return { token, profile, calendar };
};

/**
 * Web implementation of the Google Sign-In process.
 * Uses the GSI token client to request an access token.
 */
const webSignIn = (onStatusUpdate) => {
  if (!tokenClient) {
    logger.error("SignIn: Token client not initialized.");
    throw new Error("Token client not initialized");
  }

  return new Promise((resolve, reject) => {
    try {
      // Define the callback for handling the authentication response.
      const handleAuthResponse = async (response) => {
        if (response.error) {
          logger.error("SignIn - Token client auth error:", response);
          reject(response);
          return;
        }

        try {
          const token = response.access_token;
          window.gapi.client.setToken({ access_token: token });

          // Store token and timestamp, then set expiry.
          localStorage.setItem("gapi-token", token);
          localStorage.setItem("gapi-token-timestamp", Date.now().toString());
          setTokenExpiryTime();
          logger.info("SignIn: Token acquired and expiry time set.");

          // Fetch user profile information.
          const userResponse = await fetch(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (!userResponse.ok) {
            throw new Error(
              `Failed to fetch user info: ${userResponse.statusText}`
            );
          }

          const userProfile = await userResponse.json();

          // Get or create Chronicon calendar
          const calendar = await getOrCreateChroniconCalendar(onStatusUpdate);

          // Store everything in localStorage
          localStorage.setItem("gapi-token", token);
          localStorage.setItem("gapi-token-timestamp", Date.now().toString());
          localStorage.setItem("user-profile", JSON.stringify(userProfile));
          localStorage.setItem(
            "chronicon-calendar",
            JSON.stringify(calendar)
          );

          resolve({ token, userProfile, calendar });
        } catch (error) {
          logger.error("Error during signIn post-auth processing:", error);
          // Clear any potentially partial or corrupted session data from localStorage.
          localStorage.removeItem("gapi-token");
          localStorage.removeItem("gapi-token-timestamp");
          localStorage.removeItem("user-profile");
          localStorage.removeItem("chronicon-calendar");
          if (window.gapi?.client) {
            window.gapi.client.setToken(null);
          }
          reject(error);
        }
      };

      // Asignar el callback
      tokenClient.callback = handleAuthResponse;

      // Request an access token. The GSI library handles the UX (e.g., popup).
      // The response will be directed to `handleAuthResponse` or `error_callback` (defined in initGoogleAPI).
      try {
        tokenClient.requestAccessToken({});
      } catch (error) {
        // This catch handles immediate, synchronous errors from calling requestAccessToken.
        // Async errors related to the token acquisition process itself are handled by the error_callback.
        logger.error("SignIn: Error invoking tokenClient.requestAccessToken:", error);
        reject(error);
      }
    } catch (error) {
      // This outer catch is for any synchronous errors during the Promise setup.
      logger.error("SignIn: Error in signIn promise setup:", error);
      reject(error);
    }
  });
};

const nativeSignIn = async (onStatusUpdate) => {
  try {
    const authResult = await GoogleAuth.signIn();
    const token = authResult?.accessToken || authResult?.access_token || authResult?.authentication?.accessToken;
    if (!token) {
      throw new Error("No access token returned from GoogleAuth");
    }

    window.gapi.client.setToken({ access_token: token });

    localStorage.setItem("gapi-token", token);
    localStorage.setItem("gapi-token-timestamp", Date.now().toString());
    setTokenExpiryTime();

    const userResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!userResponse.ok) {
      throw new Error(`Failed to fetch user info: ${userResponse.statusText}`);
    }
    const userProfile = await userResponse.json();

    const calendar = await getOrCreateChroniconCalendar(onStatusUpdate);

    localStorage.setItem("user-profile", JSON.stringify(userProfile));
    localStorage.setItem("chronicon-calendar", JSON.stringify(calendar));

    return { token, userProfile, calendar };
  } catch (error) {
    logger.error("Native signIn error:", error);
    localStorage.removeItem("gapi-token");
    localStorage.removeItem("gapi-token-timestamp");
    localStorage.removeItem("user-profile");
    localStorage.removeItem("chronicon-calendar");
    if (window.gapi?.client) {
      window.gapi.client.setToken(null);
    }
    throw error;
  }
};

/**
 * Initiates the Google Sign-In process.
 * In native platforms uses Capacitor GoogleAuth, otherwise falls back to web GSI flow.
 * Returns the access token along with user profile and Chronicon calendar data.
 * @param {Function} [onStatusUpdate] - Optional callback for status updates during calendar creation.
 * @returns {Promise<object>} An object containing token, userProfile and calendar.
 */
export const signIn = (onStatusUpdate) => {
  if (Capacitor.isNativePlatform()) {
    return nativeSignIn(onStatusUpdate);
  }
  return webSignIn(onStatusUpdate);
};

export const signOut = async () => {
  try {
    const token = localStorage.getItem("gapi-token");
    if (token) {
      try {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        });
      } catch (error) {
        logger.warn("Error revoking token:", error);
      }
    }

    // Clear all relevant session data from localStorage.
    localStorage.removeItem("gapi-token");
    localStorage.removeItem("gapi-token-timestamp");
    localStorage.removeItem("user-profile");
    localStorage.removeItem("chronicon-calendar");

    // Clear the token from the GAPI client.
    if (window.gapi?.client) {
      window.gapi.client.setToken(null);
    }
    logger.info("User signed out and session data cleared.");
  } catch (error) {
    logger.error("Error during sign out:", error);
  }
};

/**
 * Fetches the user's calendar list and finds or creates a calendar named "Chronicon".
 * If created, it's also added to the user's calendar list.
 * @param {Function} [onStatusUpdate] - Optional callback for status updates during calendar creation.
 * @returns {Promise<object>} The Chronicon calendar object.
 */
export const getOrCreateChroniconCalendar = async (onStatusUpdate) => {
  return executeWithTokenRefresh(async () => {
    try {
      onStatusUpdate?.("Searching for Chronicon calendar...");
      logger.info("Fetching user's calendar list.");
      const response = await window.gapi.client.calendar.calendarList.list();
      
      if (!response?.result?.items) {
        const errorMsg = "Failed to fetch calendar list or no items found.";
        onStatusUpdate?.(`Error: ${errorMsg}`, true);
        throw new Error(errorMsg);
      }

      let chroniconCalendar = response.result.items.find(
        (cal) => cal.summary === "Chronicon"
      );

      if (!chroniconCalendar) {
        onStatusUpdate?.("Chronicon calendar not found. Creating a new one...");
        logger.info("Chronicon calendar not found, creating new one.");
        const calendarResource = {
          summary: "Chronicon",
          description: "Calendar for Chronicon events",
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, // Use user's current timezone
        };
        const created = await window.gapi.client.calendar.calendars.insert({ resource: calendarResource });
        chroniconCalendar = created.result;

        // Add the newly created calendar to the user's calendar list to make it visible.
        await window.gapi.client.calendar.calendarList.insert({ resource: { id: chroniconCalendar.id } });
        
        onStatusUpdate?.("Successfully created and added Chronicon calendar.");
        logger.info("Chronicon calendar created and added to list successfully:", chroniconCalendar);
      } else {
        onStatusUpdate?.("Successfully found Chronicon calendar.");
        logger.info("Found existing Chronicon calendar:", chroniconCalendar);
      }

      return chroniconCalendar;
    } catch (error) {
      logger.error("Error in getOrCreateChroniconCalendar:", error);
      onStatusUpdate?.(`Error finding or creating Chronicon calendar: ${error.message || String(error)}`, true);
      throw error;
    }
  });
};

/**
 * Fetches the available color palette for Google Calendar.
 * @returns {Promise<object|null>} The calendar color palette object or null on error/invalid response.
 */
export const getCalendarColors = async () => {
  return executeWithTokenRefresh(async () => {
    try {
      logger.info("Fetching available colors from Google Calendar");
      const response = await window.gapi.client.calendar.colors.get();
      
      if (!response || !response.result) {
        logger.warn("Invalid response from Google Calendar colors API:", response);
        return null;
      }
      
      logger.info("Available colors:", response.result);
      return response.result;
    } catch (error) {
      logger.error("Error fetching calendar colors:", error);
      throw error;
    }
  });
};

export const fetchCalendarEvents = async (calendarId, singleEvents = false) => {
  return executeWithTokenRefresh(async () => {
    try {
      logger.info(`Fetching events for calendar: ${calendarId}`);
      const response = await window.gapi.client.calendar.events.list({
        calendarId: calendarId,
        showDeleted: false,
        singleEvents: singleEvents
      });

      if (!response || !response.result || !response.result.items) {
        logger.warn("Invalid response from Google Calendar API:", response);
        return [];
      }

      logger.info(`Successfully fetched ${response.result.items?.length || 0} events`);
      return response.result.items;
    } catch (error) {
      logger.error("Error fetching events:", error);
      throw error;
    }
  });
};

export const createEvent = async (calendarId, event) => {
  if (!calendarId || !event) {
    throw new Error("Calendar ID and event object are required");
  }

  return executeWithTokenRefresh(async () => {
    try {
      logger.info("Creating event in Google Calendar:", { calendarId, event });
      
      // Validar que el evento tenga los campos requeridos
      if (!event.summary) {
        throw new Error("Event must have a summary (name)");
      }
      
      if (!event.start || !event.end) {
        throw new Error("Event must have start and end times");
      }
      
      const response = await window.gapi.client.calendar.events.insert({
        calendarId: calendarId,
        resource: event,
      });

      if (!response.result) {
        throw new Error("No response from Google Calendar API");
      }

      logger.info("Google Calendar API response:", response.result);
      return response.result;
    } catch (error) {
      logger.error("Error creating event in Google Calendar:", error);
      throw error;
    }
  });
};

export const updateEvent = async (calendarId, eventId, event) => {
  if (!calendarId || !eventId || !event) {
    throw new Error("Calendar ID, event ID, and event object are required");
  }

  return executeWithTokenRefresh(async () => {
    try {
      logger.info(`Updating event ${eventId} in calendar ${calendarId}`, event);
      
      // Validar que el evento tenga los campos requeridos
      if (!event.summary) {
        throw new Error("Event must have a summary (name)");
      }
      
      if (!event.start || !event.end) {
        throw new Error("Event must have start and end times");
      }
      
      // Asegurar que el ID del evento esté incluido en el objeto
      const eventWithId = {
        ...event,
        id: eventId
      };
      
      const response = await window.gapi.client.calendar.events.update({
        calendarId: calendarId,
        eventId: eventId,
        resource: eventWithId,
      });
      
      if (!response || !response.result) {
        throw new Error("Invalid response from Google Calendar API");
      }
      
      logger.info("Event updated successfully:", response.result);
      return response.result;
    } catch (error) {
      logger.error("Error updating event:", error);
      throw error;
    }
  });
};

export const deleteEvent = async (calendarId, eventId) => {
  if (!calendarId || !eventId) {
    throw new Error("Calendar ID and event ID are required");
  }

  return executeWithTokenRefresh(async () => {
    try {
      logger.info(`Deleting event ${eventId} from calendar ${calendarId}`);
      
      const response = await window.gapi.client.calendar.events.delete({
        calendarId: calendarId,
        eventId: eventId,
      });
      
      logger.info("Event deleted successfully");
      return true;
    } catch (error) {
      logger.error("Error deleting event:", error);
      throw error;
    }
  });
};