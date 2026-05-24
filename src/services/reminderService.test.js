import { describe, expect, it } from "vitest";
import {
  createEventSeriesRecord,
  createOccurrenceRecord,
  EVENT_TYPES,
  REMINDER_ANCHORS,
  REMINDER_KINDS,
  REMINDER_UNITS,
} from "./eventService";
import { buildScheduledReminderNotifications, describeReminderRule } from "./reminderService";

describe("reminderService", () => {
  it("builds milestone and interval notifications inside the scheduling horizon", () => {
    const series = createEventSeriesRecord({
      id: "series-1",
      name: "Anniversary",
      eventType: EVENT_TYPES.ONE_TIME,
      reminders: [
        {
          id: "anniversary-1",
          kind: REMINDER_KINDS.ANNIVERSARY,
          anchor: REMINDER_ANCHORS.FIRST,
          value: 30,
          unit: REMINDER_UNITS.DAYS,
          timeOfDay: "09:30",
        },
        {
          id: "interval-1",
          kind: REMINDER_KINDS.INTERVAL,
          anchor: REMINDER_ANCHORS.FIRST,
          value: 1,
          unit: REMINDER_UNITS.MONTHS,
          timeOfDay: "08:00",
        },
      ],
    });
    const occurrences = [
      createOccurrenceRecord({
        id: "occ-1",
        eventSeriesId: "series-1",
        occurrenceDate: new Date("2026-05-01T12:00:00.000Z"),
      }),
    ];

    const notifications = buildScheduledReminderNotifications(
      series,
      occurrences.map((occurrence) => ({
        ...occurrence,
        occurrenceDate: new Date(occurrence.occurrenceDate),
      })),
      new Date("2026-05-10T00:00:00.000Z"),
      120
    );

    expect(notifications.length).toBeGreaterThanOrEqual(2);
    expect(notifications.some((notification) => {
      const scheduled = notification.schedule.at;
      return (
        scheduled.getFullYear() === 2026 &&
        scheduled.getMonth() === 4 &&
        scheduled.getDate() === 31 &&
        scheduled.getHours() === 9 &&
        scheduled.getMinutes() === 30
      );
    })).toBe(true);
    expect(notifications.some((notification) => {
      const scheduled = notification.schedule.at;
      return (
        scheduled.getFullYear() === 2026 &&
        scheduled.getMonth() === 5 &&
        scheduled.getDate() === 1 &&
        scheduled.getHours() === 8 &&
        scheduled.getMinutes() === 0
      );
    })).toBe(true);
  });

  it("describes reminder rules for display", () => {
    const summary = describeReminderRule({
      kind: REMINDER_KINDS.INTERVAL,
      anchor: REMINDER_ANCHORS.LAST,
      value: 1,
      unit: REMINDER_UNITS.MONTHS,
      timeOfDay: "10:00",
    });

    expect(summary).toContain("Every 1 months");
    expect(summary).toContain("10:00");
  });
});
