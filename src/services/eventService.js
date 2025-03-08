import { differenceInDays, differenceInMonths, differenceInYears } from "date-fns";

const METADATA_SEPARATOR = "---CHRONICON_METADATA---";
const COLOR_PREFIX = "color:";
const TAGS_PREFIX = "tags:";
const DEFAULT_EVENT_DURATION = 60; // minutes

export const formatEventDescription = (description, color, tags) => {
  const metadata = [];
  
  // Asegurar que el color sea un valor válido
  if (color && typeof color === 'string' && color.trim() !== '') {
    // Normalizar el formato del color (asegurar que tenga # si es un color hex)
    let normalizedColor = color.trim();
    if (normalizedColor.match(/^[0-9A-Fa-f]{6}$/)) {
      normalizedColor = `#${normalizedColor}`;
    } else if (normalizedColor.match(/^[0-9A-Fa-f]{3}$/)) {
      normalizedColor = `#${normalizedColor}`;
    }
    
    metadata.push(`${COLOR_PREFIX}${normalizedColor}`);
    console.log(`Color metadata added: ${COLOR_PREFIX}${normalizedColor}`);
  }
  
  if (tags && Array.isArray(tags) && tags.length > 0) {
    const cleanedTags = tags
      .map((tag) => tag.trim())
      .filter((tag) => tag && tag.length > 0);

    if (cleanedTags.length > 0) {
      metadata.push(`${TAGS_PREFIX}${cleanedTags.join(",")}`);
    }
  }

  const formattedDescription = description || "";
  const result =
    metadata.length > 0
      ? `${formattedDescription}\n${METADATA_SEPARATOR}\n${metadata.join("\n")}`
      : formattedDescription;

  console.log("Formatted description with metadata:", {
    input: { description, color, tags },
    output: result,
    parsedBack: parseEventDescription(result),
  });

  return result;
};

export const parseEventDescription = (fullDescription) => {
  if (!fullDescription) {
    return { description: "", color: null, tags: [] };
  }

  const parts = fullDescription.split(METADATA_SEPARATOR);
  const description = parts[0].trim();

  let color = null;
  let tags = [];

  if (parts.length > 1) {
    const metadata = parts[1].trim().split("\n");
    metadata.forEach((line) => {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith(COLOR_PREFIX)) {
        color = trimmedLine.substring(COLOR_PREFIX.length).trim();
        console.log(`Color extracted from metadata: ${color}`);
        
        // Validar y normalizar el color
        if (color) {
          // Asegurar que los colores hex tengan el formato correcto
          if (color.match(/^#?[0-9A-Fa-f]{3}$/) || color.match(/^#?[0-9A-Fa-f]{6}$/)) {
            // Asegurar que tenga el prefijo #
            if (!color.startsWith('#')) {
              color = `#${color}`;
            }
          } else if (!color.match(/^(rgb|rgba|hsl|hsla)/)) {
            // Si no es un formato de color reconocido, usar el valor por defecto
            console.warn(`Color no reconocido: ${color}, usando valor por defecto`);
            color = "#ffffff";
          }
        }
      } else if (trimmedLine.startsWith(TAGS_PREFIX)) {
        const tagsString = trimmedLine.substring(TAGS_PREFIX.length).trim();
        tags = tagsString
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag && tag.length > 0);
      }
    });
  }

  return { description, color, tags };
};

export const createEventObject = ({
  id,
  name,
  startDate,
  description = "",
  color = null,
  tags = [],
}) => {
  // Ensure we have a valid date
  let start = startDate;

  // If date is invalid or not provided, use current date
  if (!start || !(start instanceof Date) || isNaN(start.getTime())) {
    start = new Date();
  }

  // Calculate end time (start time + default duration)
  const end = new Date(start.getTime() + DEFAULT_EVENT_DURATION * 60 * 1000);

  // Get timezone from browser
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Format the event object for Google Calendar
  const eventObject = {
    summary: name || "Untitled Event",
    start: {
      dateTime: start.toISOString(),
      timeZone,
    },
    end: {
      dateTime: end.toISOString(),
      timeZone,
    },
    description: formatEventDescription(description, color, tags),
  };

  // If ID is provided, include it (important for updates)
  if (id) {
    eventObject.id = id;
  }

  console.log("Creating Google Calendar event object:", eventObject);
  return eventObject;
};

export const parseGoogleEvent = (event) => {
  if (!event) {
    console.warn("Received null or undefined event");
    return null;
  }

  console.log("Parsing Google Calendar event:", event);

  // Extract metadata from description
  const { description, color, tags } = parseEventDescription(event.description || "");

  // Parse dates ensuring they are valid
  let startDate = null;
  let endDate = null;

  try {
    // For dateTime format
    if (event.start?.dateTime) {
      startDate = new Date(event.start.dateTime);
    }
    // For date-only format
    else if (event.start?.date) {
      startDate = new Date(event.start.date);
    }
    // For already parsed dates (when event is from our app)
    else if (event.startDate instanceof Date) {
      startDate = event.startDate;
    }

    // Same for end date
    if (event.end?.dateTime) {
      endDate = new Date(event.end.dateTime);
    } else if (event.end?.date) {
      endDate = new Date(event.end.date);
    } else if (event.endDate instanceof Date) {
      endDate = event.endDate;
    }

    // Validate dates
    if (!startDate || isNaN(startDate.getTime())) {
      console.warn(
        "Invalid or missing start date:",
        event.start || event.startDate
      );
      return null;
    }

    // If no valid end date, create one based on start date
    if (!endDate || isNaN(endDate.getTime())) {
      endDate = new Date(
        startDate.getTime() + DEFAULT_EVENT_DURATION * 60 * 1000
      );
    }
  } catch (error) {
    console.error("Error parsing dates:", error);
    return null;
  }

  // Use the correct fields from the Google Calendar event
  const parsedEvent = {
    id: event.id,
    name: event.summary || "Untitled Event",
    startDate,
    endDate,
    description,
    color,
    tags,
    recurringEventId: event.recurringEventId,
  };

  console.log("Parsed event result:", parsedEvent);
  return parsedEvent;
};

// Nuevas funciones para manejar reiteraciones y estadísticas

/**
 * Agrupa eventos por nombre para identificar eventos principales y sus reiteraciones
 * @param {Array} events - Lista de eventos
 * @returns {Object} - Mapa de eventos agrupados por nombre
 */
export const groupEventsByName = (events) => {
  if (!events || !Array.isArray(events)) return {};

  // Agrupar eventos por nombre
  const eventsByName = events.reduce((acc, event) => {
    const name = event.name;
    if (!acc[name]) {
      acc[name] = [];
    }
    acc[name].push(event);
    return acc;
  }, {});

  // Ordenar cada grupo por fecha
  Object.keys(eventsByName).forEach(name => {
    eventsByName[name].sort((a, b) => a.startDate - b.startDate);
  });

  return eventsByName;
};

/**
 * Calcula estadísticas para un evento específico
 * @param {Object} event - El evento para el que calcular estadísticas
 * @param {Array} allEvents - Todos los eventos disponibles
 * @returns {Object} - Estadísticas del evento
 */
export const calculateEventStats = (event, allEvents) => {
  if (!event || !allEvents || !Array.isArray(allEvents)) {
    return null;
  }

  // Encontrar todas las ocurrencias de este evento (mismo nombre)
  const occurrences = allEvents
    .filter(e => e.name === event.name)
    .sort((a, b) => a.startDate - b.startDate);

  if (!occurrences.length) return null;

  const firstOccurrence = occurrences[0];
  const lastOccurrence = occurrences[occurrences.length - 1];
  const today = new Date();
  const occurrenceIndex = occurrences.findIndex(e => e.id === event.id);

  const stats = {
    isFirstOccurrence: occurrenceIndex === 0,
    occurrenceNumber: occurrenceIndex + 1,
    totalOccurrences: occurrences.length,
    daysSinceFirst: differenceInDays(today, firstOccurrence.startDate),
    monthsSinceFirst: differenceInMonths(today, firstOccurrence.startDate),
    yearsSinceFirst: differenceInYears(today, firstOccurrence.startDate),
    daysSinceLast: differenceInDays(today, lastOccurrence.startDate),
  };

  // Si hay más de una ocurrencia
  if (occurrences.length > 1) {
    // Calcular tiempo promedio entre ocurrencias
    let totalGapDays = 0;
    for (let i = 1; i < occurrences.length; i++) {
      totalGapDays += differenceInDays(
        occurrences[i].startDate,
        occurrences[i - 1].startDate
      );
    }
    stats.averageGapDays = Math.round(totalGapDays / (occurrences.length - 1));

    // Si esta no es la primera ocurrencia, calcular tiempo desde la anterior
    if (occurrenceIndex > 0) {
      const previousOccurrence = occurrences[occurrenceIndex - 1];
      stats.daysSincePrevious = differenceInDays(
        event.startDate,
        previousOccurrence.startDate
      );
    }

    // Si esta no es la última ocurrencia, calcular tiempo hasta la siguiente
    if (occurrenceIndex < occurrences.length - 1) {
      const nextOccurrence = occurrences[occurrenceIndex + 1];
      stats.daysUntilNext = differenceInDays(
        nextOccurrence.startDate,
        event.startDate
      );
    }
  }

  return stats;
};

/**
 * Formatea el tiempo transcurrido en un formato legible
 * @param {Object} stats - Estadísticas del evento
 * @returns {String} - Tiempo formateado
 */
export const formatTimeSince = (stats) => {
  if (!stats) return "";
  
  const { yearsSinceFirst, monthsSinceFirst, daysSinceFirst } = stats;
  
  if (yearsSinceFirst > 0) {
    return `${yearsSinceFirst} ${yearsSinceFirst === 1 ? 'año' : 'años'}, ${monthsSinceFirst % 12} ${(monthsSinceFirst % 12) === 1 ? 'mes' : 'meses'}`;
  } else if (monthsSinceFirst > 0) {
    return `${monthsSinceFirst} ${monthsSinceFirst === 1 ? 'mes' : 'meses'}, ${daysSinceFirst % 30} ${(daysSinceFirst % 30) === 1 ? 'día' : 'días'}`;
  } else {
    return `${daysSinceFirst} ${daysSinceFirst === 1 ? 'día' : 'días'}`;
  }
};

