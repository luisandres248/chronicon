import { describe, expect, it } from "vitest";
import {
  exportEventsToIcs,
  exportEventsToJson,
  importEventsFromIcs,
  importEventsFromJson,
} from "./importExportService";

const sourceEvents = [
  {
    id: "evt-1",
    name: "  Release review  ",
    startDate: new Date("2026-05-20T10:30:00.000Z"),
    endDate: new Date("2026-05-20T11:30:00.000Z"),
    description: "Line one\nLine two, semicolon; slash \\",
    tags: ["ops,team", "release;prod"],
  },
];

describe("importExportService", () => {
  it("rejects malformed JSON payloads with a stable error", () => {
    expect(() => importEventsFromJson("{ nope")).toThrow("Invalid JSON import format.");
    expect(() => importEventsFromJson("{\"events\":{}}")).toThrow("Invalid JSON import format.");
  });

  it("round-trips Chronicon JSON payloads", () => {
    const exported = exportEventsToJson(sourceEvents);
    const imported = importEventsFromJson(exported);

    expect(imported).toHaveLength(1);
    expect(imported[0].name).toBe("Release review");
    expect(imported[0].description).toContain("Line two");
    expect(imported[0].tags).toEqual(["ops,team", "release;prod"]);
  });

  it("exports ICS with escaped values and imports them back", () => {
    const exported = exportEventsToIcs(sourceEvents);
    const imported = importEventsFromIcs(exported);

    expect(exported).toContain("SUMMARY:Release review");
    expect(exported).toContain("DESCRIPTION:Line one\\nLine two\\, semicolon\\; slash \\\\");
    expect(imported).toHaveLength(1);
    expect(imported[0].name).toBe("Release review");
    expect(imported[0].description).toBe("Line one\nLine two, semicolon; slash \\");
    expect(imported[0].tags).toEqual(["ops,team", "release;prod"]);
  });

  it("parses compact ICS date-time values", () => {
    const imported = importEventsFromIcs([
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "SUMMARY:Timed event",
      "DTSTART:20260520T103000Z",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n"));

    expect(imported).toHaveLength(1);
    expect(imported[0].startDate.toISOString()).toBe("2026-05-20T10:30:00.000Z");
  });
});
