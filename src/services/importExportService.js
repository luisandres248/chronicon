import { addDays, format } from "date-fns";
import { createStoredEventRecord, normalizeEventName, parseStoredEvent } from "./eventService";
import i18n from "../i18n";

function escapeIcsText(value = "") {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function unescapeIcsText(value = "") {
  return value
    .replace(/\\\\/g, "\\")
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";");
}

function splitEscapedIcsList(value = "") {
  const values = [];
  let current = "";
  let escaping = false;

  for (const char of value) {
    if (escaping) {
      current += `\\${char}`;
      escaping = false;
      continue;
    }

    if (char === "\\") {
      escaping = true;
      continue;
    }

    if (char === ",") {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  if (escaping) {
    current += "\\";
  }

  values.push(current);
  return values;
}

function parseIcsDate(value) {
  if (!value) return null;
  const cleaned = value.trim();
  if (/^\d{8}$/.test(cleaned)) {
    const year = Number(cleaned.slice(0, 4));
    const month = Number(cleaned.slice(4, 6)) - 1;
    const day = Number(cleaned.slice(6, 8));
    return new Date(year, month, day);
  }

  const compactDateTime = cleaned.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/);
  if (compactDateTime) {
    const [, year, month, day, hour, minute, second, utcMarker] = compactDateTime;
    if (utcMarker) {
      return new Date(Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second)
      ));
    }

    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    );
  }

  const parsed = new Date(cleaned);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatUtcTimestamp(date) {
  const parts = [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
    "T",
    String(date.getUTCHours()).padStart(2, "0"),
    String(date.getUTCMinutes()).padStart(2, "0"),
    String(date.getUTCSeconds()).padStart(2, "0"),
    "Z",
  ];

  return parts.join("");
}

export function exportEventsToJson(events) {
  const payload = {
    version: 2,
    exportedAt: new Date().toISOString(),
    events: events.map((event) => createStoredEventRecord(event)),
  };

  return JSON.stringify(payload, null, 2);
}

export function importEventsFromJson(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(i18n.t("invalidJsonImportFormat"));
  }
  const events = Array.isArray(parsed) ? parsed : parsed.events;
  if (!Array.isArray(events)) {
    throw new Error(i18n.t("invalidJsonImportFormat"));
  }

  return events.map(parseStoredEvent).filter(Boolean);
}

export function exportEventsToIcs(events) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Chronicon//Offline//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  events
    .slice()
    .sort((a, b) => a.startDate - b.startDate)
    .forEach((event) => {
      const dateValue = format(event.startDate, "yyyyMMdd");
      const nextDateValue = format(addDays(event.startDate, 1), "yyyyMMdd");
      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${event.id}@chronicon.local`);
      lines.push(`DTSTAMP:${formatUtcTimestamp(new Date())}`);
      lines.push(`DTSTART;VALUE=DATE:${dateValue}`);
      lines.push(`DTEND;VALUE=DATE:${nextDateValue}`);
      lines.push(`SUMMARY:${escapeIcsText(normalizeEventName(event.name))}`);
      if (event.description) {
        lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
      }
      if (event.tags?.length) {
        lines.push(`CATEGORIES:${event.tags.map(escapeIcsText).join(",")}`);
      }
      lines.push("END:VEVENT");
    });

  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}

export function importEventsFromIcs(text) {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const unfolded = normalized.replace(/\n[ \t]/g, "");
  const blocks = unfolded.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || [];

  return blocks
    .map((block) => {
      const lines = block.split("\n");
      const data = {};

      for (const line of lines) {
        const separatorIndex = line.indexOf(":");
        if (separatorIndex === -1) continue;
        const rawKey = line.slice(0, separatorIndex);
        const rawValue = line.slice(separatorIndex + 1);
        const key = rawKey.split(";")[0];
        data[key] = rawValue;
      }

      const startDate = parseIcsDate(data.DTSTART);
      if (!startDate || !data.SUMMARY) return null;

      const tags = data.CATEGORIES
        ? splitEscapedIcsList(data.CATEGORIES).map((tag) => unescapeIcsText(tag.trim())).filter(Boolean)
        : [];

      return parseStoredEvent(
        createStoredEventRecord({
          id: crypto.randomUUID(),
          name: normalizeEventName(unescapeIcsText(data.SUMMARY)),
          startDate,
          endDate: addDays(startDate, 1),
          description: unescapeIcsText(data.DESCRIPTION || ""),
          colorId: null,
          tags,
        })
      );
    })
    .filter(Boolean);
}
