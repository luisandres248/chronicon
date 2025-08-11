import { differenceInDays, differenceInMonths, differenceInYears } from "date-fns";
import logger from "../utils/logger.js";

const DEFAULT_EVENT_DURATION = 60; // minutes

export const createEventObject = ({
  id,
  name,
  startDate,
  description = "",
  colorId = null,
  tags = [],
}) => {
  let start = startDate;
  if (!start || !(start instanceof Date) || isNaN(start.getTime())) {
    start = new Date();
  }

  const end = new Date(start.getTime() + DEFAULT_EVENT_DURATION * 60 * 1000);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const eventObject = {
    summary: name || "Untitled Event",
    start: { dateTime: start.toISOString(), timeZone },
    end: { dateTime: end.toISOString(), timeZone },
    description: description || "",
  };

  if (tags && tags.length > 0) {
    eventObject.extendedProperties = {
      private: {
        chroniconTags: JSON.stringify(tags)
      }
    };
  }

  if (colorId) {
    eventObject.colorId = colorId;
  }

  if (id) {
    eventObject.id = id;
  }

  return eventObject;
};

export const parseGoogleEvent = (event) => {
  if (!event) {
    return null;
  }

  let tags = [];
  if (event.extendedProperties?.private?.chroniconTags) {
    try {
      tags = JSON.parse(event.extendedProperties.private.chroniconTags);
    } catch (e) {
      logger.error("Error parsing tags from extendedProperties", e);
    }
  }

  let startDate = null;
  let endDate = null;

  try {
    if (event.start?.dateTime) startDate = new Date(event.start.dateTime);
    else if (event.start?.date) startDate = new Date(event.start.date);
    else if (event.startDate instanceof Date) startDate = event.startDate;

    if (event.end?.dateTime) endDate = new Date(event.end.dateTime);
    else if (event.end?.date) endDate = new Date(event.end.date);
    else if (event.endDate instanceof Date) endDate = event.endDate;

    if (!startDate || isNaN(startDate.getTime())) return null;
    if (!endDate || isNaN(endDate.getTime())) {
      endDate = new Date(startDate.getTime() + DEFAULT_EVENT_DURATION * 60 * 1000);
    }
  } catch (error) {
    logger.error("Error parsing dates:", error);
    return null;
  }

  return {
    id: event.id,
    name: event.summary || "Untitled Event",
    startDate,
    endDate,
    description: event.description || "",
    colorId: event.colorId || null,
    tags,
    recurringEventId: event.recurringEventId,
  };
};

export const groupEventsByName = (events) => {
  if (!events || !Array.isArray(events)) return {};

  const eventsByName = events.reduce((acc, event) => {
    const name = event.name;
    if (!acc[name]) {
      acc[name] = [];
    }
    acc[name].push(event);
    return acc;
  }, {});

  Object.keys(eventsByName).forEach(name => {
    eventsByName[name].sort((a, b) => a.startDate - b.startDate);
  });

  return eventsByName;
};

export const calculateEventStats = (event, allEvents) => {
  if (!event || !allEvents || !Array.isArray(allEvents)) {
    return null;
  }

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

  if (occurrences.length > 1) {
    let totalGapDays = 0;
    for (let i = 1; i < occurrences.length; i++) {
      totalGapDays += differenceInDays(
        occurrences[i].startDate,
        occurrences[i - 1].startDate
      );
    };
    stats.averageGapDays = Math.round(totalGapDays / (occurrences.length - 1));

    if (occurrenceIndex > 0) {
      const previousOccurrence = occurrences[occurrenceIndex - 1];
      stats.daysSincePrevious = differenceInDays(
        event.startDate,
        previousOccurrence.startDate
      );
    }

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