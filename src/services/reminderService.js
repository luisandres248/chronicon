import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { addDays, addMonths, addWeeks, addYears, format } from "date-fns";
import i18n from "../i18n";
import {
  DEFAULT_REMINDER_TIME,
  EVENT_TYPES,
  REMINDER_ANCHORS,
  REMINDER_KINDS,
  REMINDER_UNITS,
  hasEnabledReminders,
} from "./eventService";

const REMINDER_EXTRA_SOURCE = "chronicon-reminder";
const REMINDER_HORIZON_DAYS = 400;

export const REMINDER_PRESETS = [
  {
    id: "interval-7-days-last",
    kind: REMINDER_KINDS.INTERVAL,
    anchor: REMINDER_ANCHORS.LAST,
    unit: REMINDER_UNITS.DAYS,
    value: 7,
    timeOfDay: DEFAULT_REMINDER_TIME,
    labelKey: "reminderPresetEvery7Days",
    category: "interval",
  },
  {
    id: "interval-30-days-last",
    kind: REMINDER_KINDS.INTERVAL,
    anchor: REMINDER_ANCHORS.LAST,
    unit: REMINDER_UNITS.DAYS,
    value: 30,
    timeOfDay: DEFAULT_REMINDER_TIME,
    labelKey: "reminderPresetEvery30Days",
    category: "interval",
  },
  {
    id: "interval-6-months-last",
    kind: REMINDER_KINDS.INTERVAL,
    anchor: REMINDER_ANCHORS.LAST,
    unit: REMINDER_UNITS.MONTHS,
    value: 6,
    timeOfDay: DEFAULT_REMINDER_TIME,
    labelKey: "reminderPresetEvery6Months",
    category: "interval",
  },
  {
    id: "interval-monthly-last",
    kind: REMINDER_KINDS.INTERVAL,
    anchor: REMINDER_ANCHORS.LAST,
    unit: REMINDER_UNITS.MONTHS,
    value: 1,
    timeOfDay: DEFAULT_REMINDER_TIME,
    labelKey: "reminderPresetEveryMonth",
    category: "interval",
  },
  {
    id: "anniversary-7-days",
    kind: REMINDER_KINDS.ANNIVERSARY,
    anchor: REMINDER_ANCHORS.FIRST,
    unit: REMINDER_UNITS.DAYS,
    value: 7,
    timeOfDay: DEFAULT_REMINDER_TIME,
    labelKey: "reminderPresetAfter7Days",
    category: "anniversary",
  },
  {
    id: "anniversary-30-days",
    kind: REMINDER_KINDS.ANNIVERSARY,
    anchor: REMINDER_ANCHORS.FIRST,
    unit: REMINDER_UNITS.DAYS,
    value: 30,
    timeOfDay: DEFAULT_REMINDER_TIME,
    labelKey: "reminderPresetAfter30Days",
    category: "anniversary",
  },
  {
    id: "anniversary-6-months",
    kind: REMINDER_KINDS.ANNIVERSARY,
    anchor: REMINDER_ANCHORS.FIRST,
    unit: REMINDER_UNITS.MONTHS,
    value: 6,
    timeOfDay: DEFAULT_REMINDER_TIME,
    labelKey: "reminderPresetAfter6Months",
    category: "anniversary",
  },
  {
    id: "anniversary-1-year",
    kind: REMINDER_KINDS.ANNIVERSARY,
    anchor: REMINDER_ANCHORS.FIRST,
    unit: REMINDER_UNITS.YEARS,
    value: 1,
    timeOfDay: DEFAULT_REMINDER_TIME,
    labelKey: "reminderPresetAfter1Year",
    category: "anniversary",
  },
];

function parseTimeOfDay(timeOfDay = DEFAULT_REMINDER_TIME) {
  const [hours, minutes] = (timeOfDay || DEFAULT_REMINDER_TIME).split(":").map(Number);
  return {
    hours: Number.isFinite(hours) ? hours : 9,
    minutes: Number.isFinite(minutes) ? minutes : 0,
  };
}

function withTime(date, timeOfDay) {
  const { hours, minutes } = parseTimeOfDay(timeOfDay);
  const next = new Date(date);
  next.setHours(hours, minutes, 0, 0);
  return next;
}

function addInterval(date, value, unit) {
  switch (unit) {
    case REMINDER_UNITS.WEEKS:
      return addWeeks(date, value);
    case REMINDER_UNITS.MONTHS:
      return addMonths(date, value);
    case REMINDER_UNITS.YEARS:
      return addYears(date, value);
    case REMINDER_UNITS.DAYS:
    default:
      return addDays(date, value);
  }
}

function getAnchorDate(occurrences, anchor) {
  if (!occurrences.length) {
    return null;
  }

  if (anchor === REMINDER_ANCHORS.LAST) {
    return occurrences[occurrences.length - 1].occurrenceDate;
  }

  return occurrences[0].occurrenceDate;
}

function stableNotificationId(seed) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = ((hash << 5) - hash + seed.charCodeAt(index)) | 0;
  }

  if (hash === 0) {
    return 1;
  }

  return Math.abs(hash);
}

export function isReminderSupported() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

export async function ensureReminderPermissions({ request = false } = {}) {
  if (!isReminderSupported()) {
    return { supported: false, granted: false };
  }

  const current = await LocalNotifications.checkPermissions();
  if (current.display === "granted") {
    return { supported: true, granted: true };
  }

  if (!request) {
    return { supported: true, granted: false };
  }

  const next = await LocalNotifications.requestPermissions();
  return { supported: true, granted: next.display === "granted" };
}

export function describeReminderRule(rule, t = i18n.t.bind(i18n)) {
  if (!rule) {
    return "";
  }

  if (rule.kind === REMINDER_KINDS.ONE_TIME && rule.at) {
    const atDate = new Date(rule.at);
    return t("reminderSummaryOneTime", {
      date: format(atDate, "yyyy/MM/dd"),
      time: rule.timeOfDay || format(atDate, "HH:mm"),
    });
  }

  if (rule.kind === REMINDER_KINDS.ANNIVERSARY) {
    return t("reminderSummaryAnniversary", {
      value: rule.value,
      unit: t(`reminderUnit${rule.unit}`),
      anchor: t(rule.anchor === REMINDER_ANCHORS.FIRST ? "reminderAnchorFirst" : "reminderAnchorLast"),
      time: rule.timeOfDay,
    });
  }

  return t("reminderSummaryInterval", {
    value: rule.value,
    unit: t(`reminderUnit${rule.unit}`),
    anchor: t(rule.anchor === REMINDER_ANCHORS.FIRST ? "reminderAnchorFirst" : "reminderAnchorLast"),
    time: rule.timeOfDay,
  });
}

function buildReminderBody(series, rule, t = i18n.t.bind(i18n)) {
  if (rule.kind === REMINDER_KINDS.ONE_TIME) {
    return t("reminderBodyOneTime", { eventName: series.name });
  }

  if (rule.kind === REMINDER_KINDS.ANNIVERSARY) {
    return t("reminderBodyAnniversary", { eventName: series.name });
  }

  return t(
    series.eventType === EVENT_TYPES.ONE_TIME ? "reminderBodyOneTimeInterval" : "reminderBodySeriesInterval",
    { eventName: series.name }
  );
}

export function buildScheduledReminderNotifications(series, occurrenceRecords, now = new Date(), horizonDays = REMINDER_HORIZON_DAYS) {
  if (!series || !hasEnabledReminders(series.reminders || [])) {
    return [];
  }

  const orderedOccurrences = [...occurrenceRecords]
    .filter((item) => item.eventSeriesId === series.id)
    .sort((a, b) => a.occurrenceDate - b.occurrenceDate);

  if (!orderedOccurrences.length) {
    return [];
  }

  const horizon = addDays(now, horizonDays);
  const notifications = [];

  (series.reminders || []).forEach((rule) => {
    if (!rule?.enabled) {
      return;
    }

    if (rule.kind === REMINDER_KINDS.ONE_TIME && rule.at) {
      const exactDate = withTime(new Date(rule.at), rule.timeOfDay);
      if (exactDate > now && exactDate <= horizon) {
        notifications.push({
          id: stableNotificationId(`${series.id}:${rule.id}:${exactDate.toISOString()}`),
          title: series.name,
          body: buildReminderBody(series, rule),
          schedule: { at: exactDate, allowWhileIdle: true },
          extra: {
            source: REMINDER_EXTRA_SOURCE,
            seriesId: series.id,
            ruleId: rule.id,
          },
        });
      }
      return;
    }

    const anchorDate = getAnchorDate(orderedOccurrences, rule.anchor);
    if (!anchorDate) {
      return;
    }

    if (rule.kind === REMINDER_KINDS.ANNIVERSARY) {
      const milestoneDate = withTime(addInterval(anchorDate, rule.value, rule.unit), rule.timeOfDay);
      if (milestoneDate > now && milestoneDate <= horizon) {
        notifications.push({
          id: stableNotificationId(`${series.id}:${rule.id}:${milestoneDate.toISOString()}`),
          title: series.name,
          body: buildReminderBody(series, rule),
          schedule: { at: milestoneDate, allowWhileIdle: true },
          extra: {
            source: REMINDER_EXTRA_SOURCE,
            seriesId: series.id,
            ruleId: rule.id,
          },
        });
      }
      return;
    }

    let cursor = withTime(addInterval(anchorDate, rule.value, rule.unit), rule.timeOfDay);
    let guard = 0;

    while (cursor <= horizon && guard < 128) {
      if (cursor > now) {
        notifications.push({
          id: stableNotificationId(`${series.id}:${rule.id}:${cursor.toISOString()}`),
          title: series.name,
          body: buildReminderBody(series, rule),
          schedule: { at: cursor, allowWhileIdle: true },
          extra: {
            source: REMINDER_EXTRA_SOURCE,
            seriesId: series.id,
            ruleId: rule.id,
          },
        });
      }

      cursor = withTime(addInterval(cursor, rule.value, rule.unit), rule.timeOfDay);
      guard += 1;
    }
  });

  return notifications;
}

export async function syncScheduledReminders(seriesRecords, occurrenceRecords, { requestPermissions = false } = {}) {
  const permission = await ensureReminderPermissions({ request: requestPermissions });
  if (!permission.supported || !permission.granted) {
    return false;
  }

  const pending = await LocalNotifications.getPending();
  const notificationsToCancel = pending.notifications
    .filter((notification) => notification.extra?.source === REMINDER_EXTRA_SOURCE)
    .map((notification) => ({ id: notification.id }));

  if (notificationsToCancel.length > 0) {
    await LocalNotifications.cancel({ notifications: notificationsToCancel });
  }

  const delivered = await LocalNotifications.getDeliveredNotifications();
  const deliveredToRemove = delivered.notifications.filter((notification) => notification.extra?.source === REMINDER_EXTRA_SOURCE);
  if (deliveredToRemove.length > 0) {
    await LocalNotifications.removeDeliveredNotifications({ notifications: deliveredToRemove });
  }

  const nextNotifications = seriesRecords.flatMap((series) =>
    buildScheduledReminderNotifications(series, occurrenceRecords)
  );

  if (nextNotifications.length > 0) {
    await LocalNotifications.schedule({ notifications: nextNotifications });
  }

  return true;
}
