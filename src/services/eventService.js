import { differenceInDays, differenceInMonths, differenceInYears } from "date-fns";

// Constantes para el manejo de metadatos en formato JSON
const METADATA_JSON_PREFIX = "<!-- CHRONICON_METADATA:";
const METADATA_JSON_SUFFIX = "-->";
const DEFAULT_EVENT_DURATION = 60; // minutes

export const formatEventDescription = (description, tags) => {
  // Crear objeto de metadatos
  const metadata = {
    version: "1.0",
    tags: []
  };
  
  if (tags && Array.isArray(tags) && tags.length > 0) {
    const cleanedTags = tags
      .map((tag) => tag.trim())
      .filter((tag) => tag && tag.length > 0);

    if (cleanedTags.length > 0) {
      metadata.tags = cleanedTags;
    }
  }

  const formattedDescription = description || "";
  
  try {
    // Convertir metadatos a JSON y añadirlos a la descripción
    const metadataJson = JSON.stringify(metadata);
    const result = `${formattedDescription}\n${METADATA_JSON_PREFIX}${metadataJson}${METADATA_JSON_SUFFIX}`;

    console.log("Formatted description with metadata:", {
      input: { description, tags },
      output: result,
      parsedBack: parseEventDescription(result),
    });

    return result;
  } catch (error) {
    console.error("Error formatting event description:", error);
    // En caso de error, devolver solo la descripción sin metadatos
    return formattedDescription;
  }
};

export const parseEventDescription = (fullDescription) => {
  if (!fullDescription) {
    return { description: "", tags: [] };
  }

  // Valores por defecto
  let description = fullDescription;
  let tags = [];

  try {
    // Buscar metadatos en formato JSON
    const metadataStartIndex = fullDescription.indexOf(METADATA_JSON_PREFIX);
    
    if (metadataStartIndex !== -1) {
      const metadataEndIndex = fullDescription.indexOf(METADATA_JSON_SUFFIX, metadataStartIndex);
      
      if (metadataEndIndex !== -1) {
        // Extraer la descripción (todo antes de los metadatos)
        description = fullDescription.substring(0, metadataStartIndex).trim();
        
        // Extraer y parsear el JSON de metadatos
        const metadataJsonStart = metadataStartIndex + METADATA_JSON_PREFIX.length;
        const metadataJsonEnd = metadataEndIndex;
        const metadataJson = fullDescription.substring(metadataJsonStart, metadataJsonEnd);
        
        try {
          const metadata = JSON.parse(metadataJson);
          
          // Extraer tags del objeto de metadatos
          if (metadata.tags && Array.isArray(metadata.tags)) {
            tags = metadata.tags;
          }
          
          // Compatibilidad con versiones anteriores: si hay un color en los metadatos, ignorarlo
          // ya que ahora usamos colorId de Google Calendar
        } catch (jsonError) {
          console.error("Error parsing metadata JSON:", jsonError);
        }
      }
    } else {
      // Intentar buscar metadatos en el formato antiguo para compatibilidad
      const METADATA_SEPARATOR = "---CHRONICON_METADATA---";
      const COLOR_PREFIX = "color:";
      const TAGS_PREFIX = "tags:";
      
      const parts = fullDescription.split(METADATA_SEPARATOR);
      description = parts[0].trim();

      if (parts.length > 1) {
        const metadata = parts[1].trim().split("\n");
        metadata.forEach((line) => {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith(TAGS_PREFIX)) {
            const tagsString = trimmedLine.substring(TAGS_PREFIX.length).trim();
            tags = tagsString
              .split(",")
              .map((tag) => tag.trim())
              .filter((tag) => tag && tag.length > 0);
          }
          // Ignorar el color en el formato antiguo, ya que ahora usamos colorId
        });
      }
    }
  } catch (error) {
    console.error("Error parsing event description:", error);
    // En caso de error, devolver la descripción completa sin metadatos
    description = fullDescription;
  }

  return { description, tags };
};

export const createEventObject = ({
  id,
  name,
  startDate,
  description = "",
  colorId = null,
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
    description: formatEventDescription(description, tags),
  };

  // Si se proporciona un colorId, incluirlo
  if (colorId) {
    eventObject.colorId = colorId;
  }

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
  const { description, tags } = parseEventDescription(event.description || "");

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
    colorId: event.colorId || null,
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

