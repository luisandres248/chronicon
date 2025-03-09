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
  // Los tokens de Google típicamente expiran en 1 hora
  tokenExpiryTime = Date.now() + 50 * 60 * 1000; // 50 minutos para tener margen
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
    const token = sessionStorage.getItem("gapi-token");
    const tokenTimestamp = sessionStorage.getItem("gapi-token-timestamp");
    const profile = JSON.parse(sessionStorage.getItem("user-profile"));
    const calendar = JSON.parse(sessionStorage.getItem("chronicon-calendar"));

    if (token && window.gapi?.client) {
      window.gapi.client.setToken({ access_token: token });
      
      // Restaurar el tiempo de expiración si existe
      if (tokenTimestamp) {
        const elapsedTime = Date.now() - parseInt(tokenTimestamp, 10);
        // Si han pasado más de 50 minutos, considerar el token como expirado
        if (elapsedTime < 50 * 60 * 1000) {
          tokenExpiryTime = parseInt(tokenTimestamp, 10) + 60 * 60 * 1000;
        }
      }
    }

    return { token, profile, calendar };
  } catch (error) {
    console.error("Error loading stored session:", error);
    sessionStorage.clear();
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
      return reject(new Error("Token refresh already in progress"));
    }
    
    if (!tokenClient) {
      console.error("Token client not initialized");
      return reject(new Error("Token client not initialized"));
    }
    
    try {
      tokenRefreshInProgress = true;
      console.log("Refreshing token...");
      
      // Función para manejar la respuesta de renovación
      const handleRefreshResponse = async (response) => {
        if (response.error) {
          console.error("Token refresh error:", response);
          tokenRefreshInProgress = false;
          sessionStorage.removeItem("gapi-token");
          sessionStorage.removeItem("gapi-token-timestamp");
          if (window.gapi?.client) {
            window.gapi.client.setToken(null);
          }
          reject(response);
          return;
        }
        
        try {
          const token = response.access_token;
          window.gapi.client.setToken({ access_token: token });
          
          // Guardar el nuevo token y su timestamp
          sessionStorage.setItem("gapi-token", token);
          sessionStorage.setItem("gapi-token-timestamp", Date.now().toString());
          setTokenExpiryTime();
          
          console.log("Token refreshed successfully");
          tokenRefreshInProgress = false;
          resolve(token);
        } catch (error) {
          console.error("Error during token refresh:", error);
          tokenRefreshInProgress = false;
          reject(error);
        }
      };
      
      // Asignar el callback
      tokenClient.callback = handleRefreshResponse;
      
      // Intentar renovación con popup primero
      try {
        // Solicitar token sin prompt para renovación silenciosa
        tokenClient.requestAccessToken({ 
          prompt: "",
          // Usar un callback vacío para evitar problemas con el popup
          callback: "",
        });
      } catch (popupError) {
        console.warn("Popup refresh failed, trying redirect:", popupError);
        
        // Si falla el popup, intentar con redirección
        tokenClient.requestAccessToken({ 
          prompt: "",
          // Usar un callback vacío para evitar problemas con el popup
          callback: "",
          // Forzar redirección en lugar de popup
          use_fedcm_for_prompt: false,
        });
      }
    } catch (error) {
      console.error("Error requesting access token:", error);
      tokenRefreshInProgress = false;
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

export const signIn = () => {
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
          const calendar = await getOrCreateChroniconCalendar();

          // Store everything in session storage
          sessionStorage.setItem("gapi-token", token);
          sessionStorage.setItem("gapi-token-timestamp", Date.now().toString());
          sessionStorage.setItem("user-profile", JSON.stringify(userProfile));
          sessionStorage.setItem(
            "chronicon-calendar",
            JSON.stringify(calendar)
          );
          
          // Establecer tiempo de expiración del token
          setTokenExpiryTime();

          resolve({ userProfile, calendar });
        } catch (error) {
          console.error("Error during sign in:", error);
          // Clear any partial session data
          sessionStorage.clear();
          if (window.gapi?.client) {
            window.gapi.client.setToken(null);
          }
          reject(error);
        }
      };

      // Asignar el callback
      tokenClient.callback = handleAuthResponse;

      // Intentar autenticación con popup primero
      try {
        tokenClient.requestAccessToken({
          prompt: "consent",
          // Usar un callback vacío para evitar problemas con el popup
          callback: "",
        });
      } catch (popupError) {
        console.warn("Popup authentication failed, trying redirect:", popupError);
        
        // Si falla el popup, intentar con redirección
        tokenClient.requestAccessToken({
          prompt: "consent",
          // Usar un callback vacío para evitar problemas con el popup
          callback: "",
          // Forzar redirección en lugar de popup
          use_fedcm_for_prompt: false,
        });
      }
    } catch (error) {
      console.error("Error requesting access token:", error);
      reject(error);
    }
  });
};

export const signOut = async () => {
  try {
    const token = sessionStorage.getItem("gapi-token");
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

    // Clear session storage
    sessionStorage.clear();

    // Clear gapi token
    if (window.gapi?.client) {
      window.gapi.client.setToken(null);
    }
  } catch (error) {
    console.error("Error signing out:", error);
  }
};

export const getOrCreateChroniconCalendar = async () => {
  return executeWithTokenRefresh(async () => {
    try {
      console.log("Fetching calendar list");
      const response = await window.gapi.client.calendar.calendarList.list();
      if (!response?.result?.items) {
        throw new Error("Failed to fetch calendar list");
      }

      let chroniconCalendar = response.result.items.find(
        (cal) => cal.summary === "Chronicon"
      );

      if (!chroniconCalendar) {
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
        
        console.log("Chronicon calendar created successfully:", chroniconCalendar);
      } else {
        console.log("Found existing Chronicon calendar:", chroniconCalendar);
      }

      return chroniconCalendar;
    } catch (error) {
      console.error("Calendar creation error:", error);
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
