import { describe, expect, it } from "vitest";
import {
  createEventSeriesRecord,
  createOccurrenceRecord,
  EVENT_TYPES,
  REMINDER_ANCHORS,
  REMINDER_KINDS,
  REMINDER_UNITS,
} from "./eventService";
import { buildScheduledReminderNotifications, describeReminderRule, REMINDER_PRESETS } from "./reminderService";

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
    const intervalSummary = describeReminderRule({
      kind: REMINDER_KINDS.INTERVAL,
      anchor: REMINDER_ANCHORS.LAST,
      value: 1,
      unit: REMINDER_UNITS.MONTHS,
      timeOfDay: "10:00",
    });
    const anniversarySummary = describeReminderRule({
      kind: REMINDER_KINDS.ANNIVERSARY,
      anchor: REMINDER_ANCHORS.FIRST,
      value: 30,
      unit: REMINDER_UNITS.DAYS,
      timeOfDay: "09:00",
    });
    const oneTimeSummary = describeReminderRule({
      kind: REMINDER_KINDS.ONE_TIME,
      at: "2026-06-02T15:45:00.000Z",
      timeOfDay: "15:45",
    });

    expect(intervalSummary).toContain("Every 1 months");
    expect(intervalSummary).toContain("10:00");
    expect(anniversarySummary).toContain("30 days");
    expect(anniversarySummary).toContain("09:00");
    expect(oneTimeSummary).toContain("2026/06/02");
    expect(oneTimeSummary).toContain("15:45");
  });

  it("ships separate periodic and milestone quick presets", () => {
    const intervalPresetIds = REMINDER_PRESETS.filter((preset) => preset.kind === REMINDER_KINDS.INTERVAL).map((preset) => preset.id);
    const anniversaryPresetIds = REMINDER_PRESETS.filter((preset) => preset.kind === REMINDER_KINDS.ANNIVERSARY).map((preset) => preset.id);

    expect(intervalPresetIds).toEqual([
      "interval-7-days-last",
      "interval-30-days-last",
      "interval-6-months-last",
      "interval-monthly-last",
    ]);
    expect(anniversaryPresetIds).toEqual([
      "anniversary-7-days",
      "anniversary-30-days",
      "anniversary-6-months",
      "anniversary-1-year",
    ]);
  });

  it("recalculates milestone reminders from the last occurrence", () => {
    const series = createEventSeriesRecord({
      id: "series-2",
      name: "Follow up",
      eventType: EVENT_TYPES.SERIES,
      reminders: [
        {
          id: "anniversary-last-1",
          kind: REMINDER_KINDS.ANNIVERSARY,
          anchor: REMINDER_ANCHORS.LAST,
          value: 7,
          unit: REMINDER_UNITS.DAYS,
          timeOfDay: "09:00",
        },
      ],
    });
    const occurrences = [
      createOccurrenceRecord({
        id: "occ-1",
        eventSeriesId: "series-2",
        occurrenceDate: new Date("2026-05-01T12:00:00.000Z"),
      }),
      createOccurrenceRecord({
        id: "occ-2",
        eventSeriesId: "series-2",
        occurrenceDate: new Date("2026-05-20T12:00:00.000Z"),
      }),
    ];

    const notifications = buildScheduledReminderNotifications(
      series,
      occurrences.map((occurrence) => ({
        ...occurrence,
        occurrenceDate: new Date(occurrence.occurrenceDate),
      })),
      new Date("2026-05-21T00:00:00.000Z"),
      30
    );

    expect(notifications).toHaveLength(1);
    const scheduled = notifications[0].schedule.at;
    expect(scheduled.getFullYear()).toBe(2026);
    expect(scheduled.getMonth()).toBe(4);
    expect(scheduled.getDate()).toBe(27);
    expect(scheduled.getHours()).toBe(9);
    expect(scheduled.getMinutes()).toBe(0);
  });
});
