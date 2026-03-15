import React from "react";
import { addDays, differenceInCalendarDays, isSameDay, startOfDay } from "date-fns";
import { useTranslation } from "react-i18next";
import { useContext } from "react";
import { GlobalContext } from "../context/GlobalContext";
import { formatDate, normalizeDateFormat } from "../utils/dateFormatter";

const COLUMNS = 24;

function TemporalGrid({ occurrences = [] }) {
  const { t, i18n } = useTranslation();
  const { config } = useContext(GlobalContext);
  const dateFormat = normalizeDateFormat(config?.dateFormat);
  const occurrenceDates = [...occurrences].sort((a, b) => a.startDate - b.startDate);
  const firstOccurrence = occurrenceDates[0] || null;
  const today = startOfDay(new Date());
  const firstDay = firstOccurrence ? startOfDay(firstOccurrence.startDate) : today;
  const totalDays = Math.max(1, differenceInCalendarDays(today, firstDay) + 1);
  const days = Array.from({ length: totalDays }, (_, index) => addDays(firstDay, index));
  const rowCount = Math.ceil(totalDays / COLUMNS);
  const rows = Array.from({ length: rowCount }, () => Array.from({ length: COLUMNS }, () => null));

  days.forEach((day, index) => {
    const rowFromBottom = Math.floor(index / COLUMNS);
    const columnFromRight = index % COLUMNS;
    const rowIndex = rowCount - 1 - rowFromBottom;
    const columnIndex = COLUMNS - 1 - columnFromRight;
    rows[rowIndex][columnIndex] = day;
  });

  return (
    <div className="temporal-card">
      <div className="temporal-card__title">{t("eventMetricDays", { count: totalDays })}</div>
      <div className="temporal-grid" role="img" aria-label={t("temporalGridAriaLabel")}>
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="temporal-grid__row">
            {row.map((day, columnIndex) => {
              if (!day) {
                return <span key={`empty-${rowIndex}-${columnIndex}`} className="temporal-grid__cell temporal-grid__cell--empty" />;
              }

              const hasOccurrence = occurrenceDates.some((occurrence) => isSameDay(occurrence.startDate, day));
              const isFirst = firstOccurrence ? isSameDay(firstOccurrence.startDate, day) : false;
              const className = [
                "temporal-grid__cell",
                hasOccurrence ? "temporal-grid__cell--hit" : "",
                isFirst ? "temporal-grid__cell--first" : "",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <span
                  key={day.toISOString()}
                  className={className}
                  title={formatDate(day, dateFormat, i18n.language)}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export default TemporalGrid;
