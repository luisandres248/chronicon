import { differenceInDays, differenceInMonths, differenceInYears } from "date-fns";
import i18n from "../i18n";

const DEFAULT_EVENT_DURATION = 60; // minutes

export const LOCAL_EVENT_COLORS = {
  1: { background: "#A33E3E", foreground: "#FFFFFF" },
  2: { background: "#C55454", foreground: "#FFFFFF" },
  3: { background: "#E27A7A", foreground: "#1C1A17" },
  4: { background: "#A85A2A", foreground: "#FFFFFF" },
  5: { background: "#C87436", foreground: "#FFFFFF" },
  6: { background: "#E39A5C", foreground: "#1C1A17" },
  7: { background: "#9A7A1F", foreground: "#FFFFFF" },
  8: { background: "#C29A2E", foreground: "#1C1A17" },
  9: { background: "#E0BE58", foreground: "#1C1A17" },
  10: { background: "#4E7648", foreground: "#FFFFFF" },
  11: { background: "#5F9158", foreground: "#FFFFFF" },
  12: { background: "#79B06F", foreground: "#1C1A17" },
  13: { background: "#29628B", foreground: "#FFFFFF" },
  14: { background: "#5D8AAD", foreground: "#FFFFFF" },
  15: { background: "#7F97AB", foreground: "#1C1A17" },
  16: { background: "#5C4E8A", foreground: "#FFFFFF" },
  17: { background: "#7562A8", foreground: "#FFFFFF" },
  18: { background: "#9788C6", foreground: "#1C1A17" },
};

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
    summary: name || i18n.t("untitledEvent"),
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

export const createEventSeriesRecord = ({
  id,
  name,
  description = "",
  colorId = null,
  tags = [],
  createdAt = new Date(),
  updatedAt = new Date(),
}) => ({
  id: id || crypto.randomUUID(),
  name: name || i18n.t("untitledEvent"),
  description,
  colorId,
  tags,
  createdAt: createdAt instanceof Date ? createdAt.toISOString() : new Date(createdAt).toISOString(),
  updatedAt: updatedAt instanceof Date ? updatedAt.toISOString() : new Date(updatedAt).toISOString(),
});

export const parseEventSeriesRecord = (record) => {
  if (!record) return null;

  return {
    id: record.id || crypto.randomUUID(),
    name: record.name || i18n.t("untitledEvent"),
    description: record.description || "",
    colorId: record.colorId || null,
    tags: Array.isArray(record.tags) ? record.tags : [],
    createdAt: record.createdAt ? new Date(record.createdAt) : new Date(),
    updatedAt: record.updatedAt ? new Date(record.updatedAt) : new Date(),
  };
};

export const createOccurrenceRecord = ({
  id,
  eventSeriesId,
  occurrenceDate,
  createdAt = new Date(),
}) => {
  const date = occurrenceDate instanceof Date ? occurrenceDate : new Date(occurrenceDate || Date.now());
  const endDate = new Date(date.getTime() + DEFAULT_EVENT_DURATION * 60 * 1000);

  return {
    id: id || crypto.randomUUID(),
    eventSeriesId,
    occurrenceDate: date.toISOString(),
    endDate: endDate.toISOString(),
    createdAt: createdAt instanceof Date ? createdAt.toISOString() : new Date(createdAt).toISOString(),
  };
};

export const parseOccurrenceRecord = (record) => {
  if (!record) return null;

  const occurrenceDate = record.occurrenceDate instanceof Date ? record.occurrenceDate : new Date(record.occurrenceDate);
  const endDate = record.endDate instanceof Date ? record.endDate : new Date(record.endDate || record.occurrenceDate);

  if (Number.isNaN(occurrenceDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null;
  }

  return {
    id: record.id || crypto.randomUUID(),
    eventSeriesId: record.eventSeriesId,
    occurrenceDate,
    endDate,
    createdAt: record.createdAt ? new Date(record.createdAt) : new Date(),
  };
};

export const createStoredEventRecord = ({
  id,
  name,
  startDate,
  endDate,
  description = "",
  colorId = null,
  tags = [],
  recurringEventId = null,
  recurrence = null,
}) => ({
  id: id || crypto.randomUUID(),
  name: name || i18n.t("untitledEvent"),
  startDate: startDate instanceof Date ? startDate.toISOString() : new Date(startDate).toISOString(),
  endDate: endDate instanceof Date
    ? endDate.toISOString()
    : new Date(endDate || startDate || Date.now()).toISOString(),
  description,
  colorId,
  tags,
  recurringEventId,
  recurrence,
});

export const parseStoredEvent = (event) => {
  if (!event) return null;

  const startDate = event.startDate instanceof Date ? event.startDate : new Date(event.startDate);
  const endDate = event.endDate instanceof Date ? event.endDate : new Date(event.endDate || event.startDate);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null;
  }

  return {
    id: event.id || crypto.randomUUID(),
    name: event.name || i18n.t("untitledEvent"),
    startDate,
    endDate,
    description: event.description || "",
    colorId: event.colorId || null,
    tags: Array.isArray(event.tags) ? event.tags : [],
    recurringEventId: event.recurringEventId || null,
    recurrence: event.recurrence || null,
  };
};

export const buildOccurrenceEvents = (eventSeriesRecords, occurrenceRecords) => {
  const seriesById = new Map(eventSeriesRecords.map((series) => [series.id, series]));

  return occurrenceRecords
    .map((occurrence) => {
      const series = seriesById.get(occurrence.eventSeriesId);
      if (!series) return null;

      return {
        id: occurrence.id,
        eventSeriesId: series.id,
        name: series.name,
        startDate: occurrence.occurrenceDate,
        endDate: occurrence.endDate,
        description: series.description || "",
        colorId: series.colorId || null,
        tags: series.tags || [],
        recurringEventId: series.id,
        recurrence: null,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.startDate - b.startDate);
};

export const convertLegacyEventsToSeriesModel = (legacyEvents) => {
  const grouped = {};

  legacyEvents.forEach((event) => {
    const parsed = parseStoredEvent(event);
    if (!parsed) return;
    const key = parsed.name.trim() || i18n.t("untitledEvent");
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(parsed);
  });

  const eventSeries = [];
  const occurrences = [];

  Object.entries(grouped).forEach(([name, groupedEvents]) => {
    groupedEvents.sort((a, b) => a.startDate - b.startDate);
    const first = groupedEvents[0];
    const series = createEventSeriesRecord({
      name,
      description: first.description || "",
      colorId: first.colorId || null,
      tags: first.tags || [],
    });

    eventSeries.push(series);
    groupedEvents.forEach((event) => {
      occurrences.push(
        createOccurrenceRecord({
          id: event.id,
          eventSeriesId: series.id,
          occurrenceDate: event.startDate,
        })
      );
    });
  });

  return { eventSeries, occurrences };
};

export const convertOccurrenceEventsToSeriesModel = (occurrenceEvents) => {
  return convertLegacyEventsToSeriesModel(occurrenceEvents);
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
    .filter(e => (event.eventSeriesId ? e.eventSeriesId === event.eventSeriesId : e.name === event.name))
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
