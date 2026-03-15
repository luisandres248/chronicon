import React, { useContext } from "react";
import { RRule } from "rrule";
import { useTranslation } from "react-i18next";
import { GlobalContext } from "../context/GlobalContext";
import { formatDate } from "../utils/dateFormatter";
import { LOCAL_EVENT_COLORS } from "../services/eventService";
import logger from "../utils/logger.js";

function getRecurrenceDescription(rruleString, t) {
  if (!rruleString) return t("singleEvent");
  try {
    const text = RRule.fromString(rruleString).toText();
    return text.charAt(0).toUpperCase() + text.slice(1);
  } catch (error) {
    logger.warn("Error parsing RRULE string:", error);
    return t("complexRecurrence");
  }
}

function ImportEventCard({ eventGroup }) {
  const { t, i18n } = useTranslation();
  const { calendarColors, config } = useContext(GlobalContext);

  const event = eventGroup[0];
  const { name, startDate, recurrence, colorId, description, tags } = event;
  const rruleString = recurrence && recurrence.length > 0 ? recurrence[0] : null;
  const recurrenceText = rruleString
    ? getRecurrenceDescription(rruleString, t)
    : eventGroup.length > 1
      ? t("repeatsXTimes", { count: eventGroup.length })
      : t("singleEvent");

  const palette = calendarColors || LOCAL_EVENT_COLORS;
  const accent = colorId && palette?.[colorId]?.background ? palette[colorId].background : undefined;

  return (
    <article
      className="event-list-card event-list-card--static import-event-card"
      style={accent ? { "--event-accent": accent } : undefined}
    >
      <h3>{name}</h3>
      <div className="event-list-card__meta">
        {t("firstOccurrence")}: {startDate ? formatDate(startDate, config.dateFormat, i18n.language) : t("notAvailable")}
      </div>
      {description ? <p className="event-list-card__description">{description}</p> : null}
      <div className="event-tag-list">
        <span className="event-tag">{recurrenceText}</span>
        {tags?.map((tag) => (
          <span key={tag} className="event-tag">
            {tag}
          </span>
        ))}
      </div>
    </article>
  );
}

export default ImportEventCard;
