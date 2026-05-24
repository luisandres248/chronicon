import { describe, expect, it } from "vitest";
import { formatDate, parseDate } from "./dateFormatter";

describe("dateFormatter", () => {
  it("parses supported date formats strictly", () => {
    expect(parseDate("2026/05/24", "yyyy/MM/dd", "en")?.toISOString()).toContain("2026-05-24");
    expect(parseDate("24/05/2026", "dd/MM/yyyy", "en")?.toISOString()).toContain("2026-05-24");
    expect(parseDate("05/24/2026", "MM/dd/yyyy", "en")?.toISOString()).toContain("2026-05-24");
    expect(parseDate("2026/24/05", "yyyy/MM/dd", "en")).toBeNull();
  });

  it("formats valid dates and rejects invalid ones", () => {
    expect(formatDate(new Date("2026-05-24T12:00:00.000Z"), "yyyy/MM/dd", "en")).toBe("2026/05/24");
    expect(formatDate(new Date("invalid"), "yyyy/MM/dd", "en")).toBe("Invalid date");
  });
});
