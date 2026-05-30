import { describe, expect, it } from "vitest";
import {
  calculateEventStats,
  convertLegacyEventsToSeriesModel,
  createDuplicateOccurrenceDayError,
  createEventSeriesRecord,
  EVENT_TYPES,
  getUniqueOccurrencesByDay,
  hasOccurrenceOnSameDay,
  matchesEventQuery,
  normalizeEventName,
  parseEventSeriesRecord,
  parseStoredEvent,
  REMINDER_KINDS,
  REMINDER_UNITS,
} from "./eventService";

describe("eventService", () => {
  it("normalizes empty or padded event names", () => {
    expect(normalizeEventName("  Birthdays  ")).toBe("Birthdays");
    expect(normalizeEventName("   ")).toBe("Untitled event");
  });

  it("detects duplicate occurrences on the same calendar day", () => {
    const occurrences = [
      { id: "a", startDate: new Date("2026-05-20T09:00:00.000Z") },
      { id: "b", startDate: new Date("2026-05-21T09:00:00.000Z") },
    ];

    expect(hasOccurrenceOnSameDay(occurrences, new Date("2026-05-20T23:59:00.000Z"))).toBe(true);
    expect(hasOccurrenceOnSameDay(occurrences, new Date("2026-05-22T12:00:00.000Z"))).toBe(false);
  });

  it("deduplicates same-day occurrences when calculating series stats", () => {
    const seriesId = "series-1";
    const allEvents = [
      parseStoredEvent({
        id: "occ-1",
        name: "Workout",
        startDate: "2026-01-01T08:00:00.000Z",
        endDate: "2026-01-01T09:00:00.000Z",
        recurringEventId: seriesId,
      }),
      parseStoredEvent({
        id: "occ-2",
        name: "Workout",
        startDate: "2026-01-01T18:00:00.000Z",
        endDate: "2026-01-01T19:00:00.000Z",
        recurringEventId: seriesId,
      }),
      parseStoredEvent({
        id: "occ-3",
        name: "Workout",
        startDate: "2026-01-04T08:00:00.000Z",
        endDate: "2026-01-04T09:00:00.000Z",
        recurringEventId: seriesId,
      }),
    ];

    const stats = calculateEventStats(allEvents[0], allEvents);

    expect(getUniqueOccurrencesByDay(allEvents)).toHaveLength(2);
    expect(stats.totalOccurrences).toBe(2);
    expect(stats.averageGapDays).toBe(3);
  });

  it("converts legacy occurrences into a normalized series model", () => {
    const legacy = [
      {
        id: "legacy-1",
        name: "  Meds  ",
        startDate: "2026-02-01T08:00:00.000Z",
        endDate: "2026-02-01T09:00:00.000Z",
        description: "Morning",
        tags: ["health"],
      },
      {
        id: "legacy-2",
        name: "Meds",
        startDate: "2026-02-03T08:00:00.000Z",
        endDate: "2026-02-03T09:00:00.000Z",
        description: "Morning",
        tags: ["health"],
      },
    ];

    const converted = convertLegacyEventsToSeriesModel(legacy);

    expect(converted.eventSeries).toHaveLength(1);
    expect(converted.eventSeries[0].name).toBe("Meds");
    expect(converted.eventSeries[0].eventType).toBe(EVENT_TYPES.SERIES);
    expect(converted.occurrences).toHaveLength(2);
  });

  it("matches event queries against name, description, and tags", () => {
    const event = {
      name: "Doctor appointment",
      description: "Annual checkup",
      tags: ["health", "personal"],
    };

    expect(matchesEventQuery(event, "doctor")).toBe(true);
    expect(matchesEventQuery(event, "checkup")).toBe(true);
    expect(matchesEventQuery(event, "health")).toBe(true);
    expect(matchesEventQuery(event, "finance")).toBe(false);
  });

  it("normalizes series records with event type and reminders", () => {
    const created = createEventSeriesRecord({
      name: "Birthday",
      eventType: EVENT_TYPES.ONE_TIME,
      reminders: [
        {
          kind: REMINDER_KINDS.INTERVAL,
          value: 30,
          unit: REMINDER_UNITS.DAYS,
        },
      ],
    });

    const parsed = parseEventSeriesRecord(created);

    expect(parsed.eventType).toBe(EVENT_TYPES.ONE_TIME);
    expect(parsed.reminders).toHaveLength(1);
    expect(parsed.reminders[0].timeOfDay).toBe("09:00");
  });

  it("creates a domain-specific duplicate-day error", () => {
    const error = createDuplicateOccurrenceDayError();
    expect(error.code).toBe("DUPLICATE_OCCURRENCE_DAY");
    expect(error.message).toBe("An occurrence already exists for that day.");
  });
});
