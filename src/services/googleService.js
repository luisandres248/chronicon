const CLIENT_ID =
  "831631852570-s46uu7nqdegb1njh655pnn5rh8lglkuo.apps.googleusercontent.com";
const API_KEY = "AIzaSyAy9-u3lgJA7QoeDLIvyOVyb2V3RkaPLEk";
const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

let gapiInitialized = false;
let tokenClient = null;
let tokenRefreshInProgress = false;
let tokenExpiryTime = null;

// Almacenar el tiempo de expiración del token (1 hora desde la obtención)
const setTokenExpiryTime = () => {
  // Google tokens typically expire in 1 hour. Set our check for 55 minutes.
  tokenExpiryTime = Date.now() + 55 * 60 * 1000; 
  console.log("Token expiry time set to:", new Date(tokenExpiryTime).toLocaleTimeString());
};

// Verificar si el token está próximo a expirar
const isTokenExpiringSoon = () => {
  if (!tokenExpiryTime) return true;
  // Considerar que está por expirar si quedan menos de 5 minutos
  return Date.now() > tokenExpiryTime - 5 * 60 * 1000;
};

const loadStoredSession = () => {
  try {
    const token = localStorage.getItem("gapi-token");
    const tokenTimestamp = localStorage.getItem("gapi-token-timestamp");
    const profile = JSON.parse(localStorage.getItem("user-profile"));
    const calendar = JSON.parse(localStorage.getItem("chronicon-calendar"));

    if (token && window.gapi?.client) {
      window.gapi.client.setToken({ access_token: token });
      
      // Restaurar el tiempo de expiración si existe
      if (tokenTimestamp) {
        // Calculate expiry as 55 minutes from the original grant time
        tokenExpiryTime = parseInt(tokenTimestamp, 10) + 55 * 60 * 1000;
        console.log("Restored token expiry time to:", new Date(tokenExpiryTime).toLocaleTimeString());
      }
    }

    return { token, profile, calendar };
  } catch (error) {
    console.error("Error loading stored session:", error);
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

// Función para renovar el token
export const refreshToken = () => {
  return new Promise((resolve, reject) => {
    if (tokenRefreshInProgress) {
      console.log("Token refresh already in progress");
      // It's better to return a promise that resolves/rejects based on the ongoing refresh,
      // but for now, rejecting is simpler than implementing a queue or listener.
      return reject(new Error("Token refresh already in progress")); 
    }
    
    if (!tokenClient) {
      console.error("Token client not initialized");
      return reject(new Error("Token client not initialized"));
    }
    
    tokenRefreshInProgress = true;
    console.log("Refreshing token...");

    // Set the callback for this specific refresh operation
    tokenClient.callback = async (response) => { // Renamed to handleRefreshResponse internally
      tokenRefreshInProgress = false; // Ensure this is set regardless of outcome
      if (response.error) {
        console.error("Token refresh error:", response);
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
        setTokenExpiryTime(); // Uses the new 55-min logic
        
        console.log("Token refreshed successfully");
        resolve(token); // Resolve the outer promise
      } catch (error) {
        console.error("Error processing token refresh response:", error);
        reject(error); // Reject the outer promise
      }
    };
    
    try {
      // Attempt silent refresh. The GSI library handles the UX mode (popup/redirect)
      // based on its initialization and internal logic when prompt is empty.
      tokenClient.requestAccessToken({ prompt: "" }); 
    } catch (error) {
      // This catch is for immediate errors from calling requestAccessToken itself.
      console.error("Error invoking tokenClient.requestAccessToken for refresh:", error);
      tokenRefreshInProgress = false;
      tokenClient.callback = ""; // Clear callback if request failed immediately
      reject(error);
    }
  });
};

// Función para ejecutar una operación de API con renovación automática de token
export const executeWithTokenRefresh = async (apiCall) => {
  try {
    // Verificar si el token está por expirar antes de hacer la llamada
    if (isTokenExpiringSoon()) {
      console.log("Token is expiring soon, refreshing...");
      await refreshToken();
    }
    
    return await apiCall();
  } catch (error) {
    // Si el error es de autenticación (401), intentar renovar el token y reintentar
    if (error.status === 401 || (error.result && error.result.error && error.result.error.code === 401)) {
      console.log("Received 401 error, attempting to refresh token");
      try {
        await refreshToken();
        // Reintentar la llamada con el nuevo token
        return await apiCall();
      } catch (refreshError) {
        console.error("Failed to refresh token:", refreshError);
        throw refreshError;
      }
    }
    throw error;
  }
};

export const initGoogleAPI = async () => {
  if (gapiInitialized) {
    return Promise.resolve(window.gapi);
  }

  return new Promise((resolve, reject) => {
    const gapiScript = document.createElement("script");
    gapiScript.src = "https://apis.google.com/js/api.js";

    gapiScript.onload = () => {
      const gsiScript = document.createElement("script");
      gsiScript.src = "https://accounts.google.com/gsi/client";

      gsiScript.onload = () => {
        window.gapi.load("client", async () => {
          try {
            await window.gapi.client.init({
              apiKey: API_KEY,
              discoveryDocs: [
                "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest",
              ],
            });

            // Configurar el cliente de token con opciones más robustas
            tokenClient = google.accounts.oauth2.initTokenClient({
              client_id: CLIENT_ID,
              scope: SCOPES,
              callback: "", // defined at request time
              error_callback: (err) => {
                console.error("Token client error:", err);
                
                // Si el error es de popup bloqueado, intentar mostrar un mensaje al usuario
                if (err.type === 'popup_failed_to_open' || err.type === 'popup_closed') {
                  console.warn("Popup was blocked or closed. Please allow popups for this site or try again.");
                  
                  // Intentar mostrar una alerta en la UI si es posible
                  if (typeof window !== 'undefined') {
                    const errorEvent = new CustomEvent('auth-popup-blocked', { 
                      detail: { message: "El navegador bloqueó la ventana de autenticación. Por favor, permite ventanas emergentes para este sitio." } 
                    });
                    window.dispatchEvent(errorEvent);
                  }
                }
              },
              // Opciones adicionales para mejorar la compatibilidad
              ux_mode: "popup", // Intentar usar popup primero
              include_granted_scopes: true,
            });

            const { token } = loadStoredSession();
            if (token) {
              window.gapi.client.setToken({ access_token: token });
            }

            gapiInitialized = true;
            resolve(window.gapi);
          } catch (error) {
            console.error("Error initializing GAPI client:", error);
            reject(error);
          }
        });
      };

      gsiScript.onerror = (error) => {
        console.error("Error loading GSI script:", error);
        reject(error);
      };
      document.body.appendChild(gsiScript);
    };

    gapiScript.onerror = (error) => {
      console.error("Error loading GAPI script:", error);
      reject(error);
    };
    document.body.appendChild(gapiScript);
  });
};

export const checkSignInStatus = () => {
  const { profile, calendar } = loadStoredSession();
  return { profile, calendar };
};

export const signIn = (onStatusUpdate) => {
  if (!tokenClient) {
    throw new Error("Token client not initialized");
  }

  return new Promise((resolve, reject) => {
    try {
      // Función para manejar la respuesta de autenticación
      const handleAuthResponse = async (response) => {
        if (response.error) {
          console.error("Token client error:", response);
          reject(response);
          return;
        }

        try {
          const token = response.access_token;
          window.gapi.client.setToken({ access_token: token });

          // Get user info
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
          
          // Establecer tiempo de expiración del token
          setTokenExpiryTime();

          resolve({ userProfile, calendar });
        } catch (error) {
          console.error("Error during sign in:", error);
          // Clear any partial session data
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

      // Directly request the token. GSI's TokenClient will use the configured ux_mode (popup)
      // and its internal fallbacks. The result will come to handleAuthResponse or the error_callback.
      try {
        tokenClient.requestAccessToken({}); // Pass empty options object
      } catch (error) {
        // This catch is for immediate errors from calling requestAccessToken itself,
        // not for errors from the async token acquisition process (which go to error_callback).
        console.error("Error invoking tokenClient.requestAccessToken:", error);
        reject(error); // Reject the signIn promise
      }
    } catch (error) {
      // This outer catch is for errors in the Promise setup or other synchronous code,
      // though most errors related to token request should be caught by the inner try/catch
      // or handled by the GSI library's error_callback.
      console.error("Error in signIn promise setup:", error);
      reject(error);
    }
  });
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
        console.warn("Error revoking token:", error);
      }
    }

    // Clear specific items from localStorage
    localStorage.removeItem("gapi-token");
    localStorage.removeItem("gapi-token-timestamp");
    localStorage.removeItem("user-profile");
    localStorage.removeItem("chronicon-calendar");

    // Clear gapi token
    if (window.gapi?.client) {
      window.gapi.client.setToken(null);
    }
  } catch (error) {
    console.error("Error signing out:", error);
  }
};

export const getOrCreateChroniconCalendar = async (onStatusUpdate) => {
  return executeWithTokenRefresh(async () => {
    try {
      onStatusUpdate?.("Searching for Chronicon calendar...");
      console.log("Fetching calendar list");
      const response = await window.gapi.client.calendar.calendarList.list();
      if (!response?.result?.items) {
        const errorMsg = "Failed to fetch calendar list";
        onStatusUpdate?.(`Error finding or creating Chronicon calendar: ${errorMsg}`, true);
        throw new Error(errorMsg);
      }

      let chroniconCalendar = response.result.items.find(
        (cal) => cal.summary === "Chronicon"
      );

      if (!chroniconCalendar) {
        onStatusUpdate?.("Chronicon calendar not found. Creating a new one...");
        console.log("Chronicon calendar not found, creating new one");
        const created = await window.gapi.client.calendar.calendars.insert({
          resource: {
            summary: "Chronicon",
            description: "Calendar for Chronicon events",
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        });
        chroniconCalendar = created.result;

        // Add the calendar to the user's calendar list
        await window.gapi.client.calendar.calendarList.insert({
          resource: { id: chroniconCalendar.id },
        });
        
        onStatusUpdate?.("Successfully created and added Chronicon calendar.");
        console.log("Chronicon calendar created successfully:", chroniconCalendar);
      } else {
        onStatusUpdate?.("Successfully found Chronicon calendar.");
        console.log("Found existing Chronicon calendar:", chroniconCalendar);
      }

      return chroniconCalendar;
    } catch (error) {
      console.error("Calendar creation error:", error);
      onStatusUpdate?.(`Error finding or creating Chronicon calendar: ${error.message || error}`, true);
      throw error;
    }
  });
};

export const getCalendarColors = async () => {
  return executeWithTokenRefresh(async () => {
    try {
      console.log("Fetching available colors from Google Calendar");
      const response = await window.gapi.client.calendar.colors.get();
      
      if (!response || !response.result) {
        console.warn("Invalid response from Google Calendar colors API:", response);
        return null;
      }
      
      console.log("Available colors:", response.result);
      return response.result;
    } catch (error) {
      console.error("Error fetching calendar colors:", error);
      throw error;
    }
  });
};

export const fetchCalendarEvents = async (calendarId) => {
  return executeWithTokenRefresh(async () => {
    try {
      console.log(`Fetching events for calendar: ${calendarId}`);
      const response = await window.gapi.client.calendar.events.list({
        calendarId: calendarId,
        showDeleted: false,
        singleEvents: false
      });

      if (!response || !response.result || !response.result.items) {
        console.warn("Invalid response from Google Calendar API:", response);
        return [];
      }

      console.log(`Successfully fetched ${response.result.items?.length || 0} events`);
      return response.result.items;
    } catch (error) {
      console.error("Error fetching events:", error);
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
      console.log("Creating event in Google Calendar:", { calendarId, event });
      
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

      console.log("Google Calendar API response:", response.result);
      return response.result;
    } catch (error) {
      console.error("Error creating event in Google Calendar:", error);
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
      console.log(`Updating event ${eventId} in calendar ${calendarId}`, event);
      
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
      
      console.log("Event updated successfully:", response.result);
      return response.result;
    } catch (error) {
      console.error("Error updating event:", error);
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
      console.log(`Deleting event ${eventId} from calendar ${calendarId}`);
      
      const response = await window.gapi.client.calendar.events.delete({
        calendarId: calendarId,
        eventId: eventId,
      });
      
      console.log("Event deleted successfully");
      return true;
    } catch (error) {
      console.error("Error deleting event:", error);
      throw error;
    }
  });
};
