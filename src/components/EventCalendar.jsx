import React, { Suspense, lazy, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds } from "date-fns";
import { useTranslation } from "react-i18next";
import { GlobalContext } from "../context/GlobalContext";
import { calculateEventStats } from "../services/eventService";
import { formatDate } from "../utils/dateFormatter";
import TemporalGrid from "./TemporalGrid";
import { ChevronDownIcon, ChevronUpIcon, PencilIcon, TrashIcon } from "./icons";

const EventForm = lazy(() => import("./EventForm"));
const AddRecurrenceDialog = lazy(() => import("./AddRecurrenceDialog"));

function cycleValue(values, index) {
  return values[index % values.length];
}

function EventCalendar() {
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const {
    events,
    appLoading,
    eventsLoading,
    processing,
    error,
    handleUpdateEvent,
    handleDeleteEvent,
    handleSaveRecurrence,
    config,
    calendarColors,
  } = useContext(GlobalContext);

  const [selectedSeriesId, setSelectedSeriesId] = useState(null);
  const [timingMode, setTimingMode] = useState(0);
  const [intervalMode, setIntervalMode] = useState(0);
  const [sinceLastMode, setSinceLastMode] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [recurrenceOpen, setRecurrenceOpen] = useState(false);
  const [eventListOpen, setEventListOpen] = useState(false);

  const seriesList = useMemo(() => {
    const groups = new Map();
    for (const event of events) {
      const key = event.eventSeriesId || event.name;
      const current = groups.get(key) || [];
      current.push(event);
      groups.set(key, current);
    }

    return [...groups.entries()]
      .map(([seriesId, seriesEvents]) => {
        const ordered = [...seriesEvents].sort((a, b) => a.startDate - b.startDate);
        return {
          seriesId,
          first: ordered[0],
          latest: ordered[ordered.length - 1],
          occurrences: ordered,
        };
      })
      .sort((a, b) => b.latest.startDate - a.latest.startDate);
  }, [events]);

  useEffect(() => {
    if (!seriesList.length) {
      setSelectedSeriesId(null);
      return;
    }

    const incomingId = location.state?.selectedEventId;
    if (incomingId) {
      const matchingSeries = seriesList.find(
        (series) => series.occurrences.some((occurrence) => occurrence.id === incomingId)
      );
      if (matchingSeries) {
        setSelectedSeriesId(matchingSeries.seriesId);
        return;
      }
    }

    setSelectedSeriesId((current) => current || seriesList[0].seriesId);
  }, [location.state, seriesList]);

  const selectedSeries = useMemo(
    () => seriesList.find((series) => series.seriesId === selectedSeriesId) || seriesList[0] || null,
    [selectedSeriesId, seriesList]
  );

  const stats = useMemo(
    () => (selectedSeries ? calculateEventStats(selectedSeries.latest, selectedSeries.occurrences) : null),
    [selectedSeries]
  );

  const firstOccurrence = selectedSeries?.first || null;
  const latestOccurrence = selectedSeries?.latest || null;
  const firstDateLabel = firstOccurrence ? formatDate(firstOccurrence.startDate, config.dateFormat, i18n.language) : "";
  const latestDateLabel = latestOccurrence ? formatDate(latestOccurrence.startDate, config.dateFormat, i18n.language) : "";
  const eventAccent = firstOccurrence?.colorId && calendarColors?.[firstOccurrence.colorId]?.background
    ? calendarColors[firstOccurrence.colorId].background
    : null;

  const timeSinceValues = useMemo(() => {
    if (!firstOccurrence) return [t("notAvailable")];
    const today = new Date();
    return [
      t("eventMetricDays", { count: differenceInDays(today, firstOccurrence.startDate) }),
      t("eventMetricHours", { count: differenceInHours(today, firstOccurrence.startDate) }),
      t("eventMetricSeconds", { count: differenceInSeconds(today, firstOccurrence.startDate) }),
    ];
  }, [firstOccurrence, t]);

  const intervalValues = useMemo(() => {
    if (!selectedSeries || selectedSeries.occurrences.length < 2) return [t("singleEvent")];
    const intervals = [];
    for (let index = 1; index < selectedSeries.occurrences.length; index += 1) {
      intervals.push(
        differenceInDays(
          selectedSeries.occurrences[index].startDate,
          selectedSeries.occurrences[index - 1].startDate
        )
      );
    }
    const averageDays = Math.round(intervals.reduce((total, value) => total + value, 0) / intervals.length);
    return [
      t("eventAverageDays", { count: averageDays }),
      t("eventAverageWeeks", { count: Math.max(1, Math.round(averageDays / 7)) }),
      t("eventAverageMonths", { count: Math.max(1, Math.round(averageDays / 30)) }),
    ];
  }, [selectedSeries, t]);

  const sinceLastValues = useMemo(() => {
    if (!latestOccurrence) return [t("notAvailable")];
    const today = new Date();
    return [
      t("eventMetricDays", { count: differenceInDays(today, latestOccurrence.startDate) }),
      t("eventMetricHours", { count: differenceInHours(today, latestOccurrence.startDate) }),
      t("eventMetricMinutes", { count: differenceInMinutes(today, latestOccurrence.startDate) }),
    ];
  }, [latestOccurrence, t]);

  const metrics = [
    {
      title: t("timeSinceFirstOccurrence"),
      value: cycleValue(timeSinceValues, timingMode),
      hint: t("eventMetricHintPrimary"),
      onClick: () => setTimingMode((current) => current + 1),
    },
    ...(selectedSeries && selectedSeries.occurrences.length > 1
      ? [
          {
            title: t("averageBetweenOccurrences"),
            value: cycleValue(intervalValues, intervalMode),
            hint: t("eventMetricHintAverage"),
            onClick: () => setIntervalMode((current) => current + 1),
          },
        ]
      : []),
    {
      title: t("lastTime"),
      value: cycleValue(sinceLastValues, sinceLastMode),
      hint: t("eventMetricHintLast"),
      onClick: () => setSinceLastMode((current) => current + 1),
    },
  ];

  if (appLoading || eventsLoading || processing) {
    return <div className="view-state">{t("loadingEvents")}</div>;
  }

  if (error) {
    return <div className="view-state">{error}</div>;
  }

  if (!selectedSeries) {
    return <div className="view-state">{t("selectEventToSeeStats")}</div>;
  }

  return (
    <section
      className="page-shell page-shell--event"
      style={
        eventAccent
          ? {
              "--event-accent": eventAccent,
              "--event-accent-soft": eventAccent,
            }
          : undefined
      }
    >
      <header className="page-title-block">
        <div className="event-selector">
          <button
            type="button"
            className="page-title-block__trigger"
            onClick={() => setEventListOpen((current) => !current)}
          >
            <span>{selectedSeries.first.name}</span>
            {eventListOpen ? <ChevronUpIcon width="20" height="20" /> : <ChevronDownIcon width="20" height="20" />}
          </button>
          {eventListOpen ? (
            <div className="event-selector__menu">
              {seriesList.map((series) => (
                <button
                  key={series.seriesId}
                  type="button"
                  className={`event-selector__option ${series.seriesId === selectedSeries.seriesId ? "event-selector__option--active" : ""}`}
                  onClick={() => {
                    setSelectedSeriesId(series.seriesId);
                    setEventListOpen(false);
                  }}
                >
                  {series.first.name}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </header>

      <div className="card-list">
        <article className="event-list-card event-list-card--static event-overview-card">
          <div className="event-list-card__title-row">
            <div className="event-list-card__meta">
              {firstDateLabel} · {t("eventMetricDays", { count: stats?.daysSinceFirst ?? differenceInDays(new Date(), selectedSeries.first.startDate) })}
            </div>
            <div className="event-list-card__actions">
              <button
                type="button"
                className="icon-action"
                onClick={() => setFormOpen(true)}
                aria-label={t("editEventTitle")}
              >
                <PencilIcon width="16" height="16" />
              </button>
              <button
                type="button"
                className="icon-action"
                onClick={async () => {
                  await handleDeleteEvent(selectedSeries.first.id);
                }}
                aria-label={t("deleteButton")}
              >
                <TrashIcon width="16" height="16" />
              </button>
            </div>
          </div>
          {firstOccurrence.description ? (
            <p className="event-list-card__description">{firstOccurrence.description}</p>
          ) : null}
          <div className="event-overview-card__grid">
            <div className="event-overview-card__item">
              <span>{t("startDateLabel")}</span>
              <strong>{firstDateLabel}</strong>
            </div>
            <div className="event-overview-card__item">
              <span>{t("occurrences")}</span>
              <strong>{selectedSeries.occurrences.length}</strong>
            </div>
            <div className="event-overview-card__item">
              <span>{t("lastTime")}</span>
              <strong>{latestDateLabel}</strong>
            </div>
          </div>
          {firstOccurrence.tags?.length ? (
            <div className="event-tag-list">
              {firstOccurrence.tags.map((tag) => (
                <span key={tag} className="event-tag">
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </article>

        {metrics.map((metric) => (
          <button key={metric.title} type="button" className="metric-card" onClick={metric.onClick}>
            <span className="metric-card__title">{metric.title}</span>
            <strong className="metric-card__value">{metric.value}</strong>
            <span className="metric-card__hint">{metric.hint}</span>
          </button>
        ))}
      </div>

      <div className="event-detail-actions">
        <div className="event-detail-actions__buttons">
          <button type="button" className="chronicon-button" onClick={() => setRecurrenceOpen(true)}>
            {t("addOccurrence")}
          </button>
        </div>
      </div>

      <TemporalGrid occurrences={selectedSeries.occurrences} />

      {formOpen ? (
        <Suspense fallback={<div className="view-state">{t("loadingEvents")}</div>}>
          <EventForm
            open={formOpen}
            onClose={() => setFormOpen(false)}
            onSubmit={async (formData) => {
              await handleUpdateEvent(selectedSeries.first.id, formData);
              setFormOpen(false);
            }}
            event={selectedSeries.first}
            onDelete={async () => {
              await handleDeleteEvent(selectedSeries.first.id);
              setFormOpen(false);
            }}
          />
        </Suspense>
      ) : null}

      {recurrenceOpen ? (
        <Suspense fallback={<div className="view-state">{t("loadingEvents")}</div>}>
          <AddRecurrenceDialog
            open={recurrenceOpen}
            onClose={() => setRecurrenceOpen(false)}
            onSubmit={async (_, date) => {
              await handleSaveRecurrence(selectedSeries.latest, date);
              setRecurrenceOpen(false);
            }}
            eventToRecur={selectedSeries.latest}
          />
        </Suspense>
      ) : null}
    </section>
  );
}

export default EventCalendar;
