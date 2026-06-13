import React, { Suspense, lazy, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds } from "date-fns";
import { useTranslation } from "react-i18next";
import { GlobalContext } from "../context/GlobalContext";
import { calculateEventStats, getUniqueOccurrencesByDay, groupOccurrenceEventsBySeries, hasEnabledReminders, matchesEventQuery } from "../services/eventService";
import { describeReminderRule } from "../services/reminderService";
import { formatDate } from "../utils/dateFormatter";
import TemporalGrid from "./TemporalGrid";
import { ChevronDownIcon, ChevronUpIcon, PencilIcon, PinIcon, TrashIcon } from "./icons";

const EventForm = lazy(() => import("./EventForm"));
const AddRecurrenceDialog = lazy(() => import("./AddRecurrenceDialog"));
const EditOccurrenceDialog = lazy(() => import("./EditOccurrenceDialog"));

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
    handleDeleteSingleOccurrence,
    handleUpdateOccurrenceDate,
    handleSaveRecurrence,
    toggleEventPin,
    config,
    calendarColors,
  } = useContext(GlobalContext);

  const [selectedSeriesId, setSelectedSeriesId] = useState(null);
  const [timingMode, setTimingMode] = useState(0);
  const [intervalMode, setIntervalMode] = useState(0);
  const [sinceLastMode, setSinceLastMode] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [recurrenceOpen, setRecurrenceOpen] = useState(false);
  const [editOccurrenceOpen, setEditOccurrenceOpen] = useState(false);
  const [selectedOccurrenceId, setSelectedOccurrenceId] = useState(null);
  const [eventListOpen, setEventListOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const selectorRef = useRef(null);

  const seriesList = useMemo(() => {
    return groupOccurrenceEventsBySeries(events)
      .map(({ seriesId, occurrences: seriesEvents }) => {
        const ordered = [...seriesEvents];
        const uniqueOccurrences = getUniqueOccurrencesByDay(ordered);
        return {
          seriesId,
          first: uniqueOccurrences[0] || ordered[0],
          latest: uniqueOccurrences[uniqueOccurrences.length - 1] || ordered[ordered.length - 1],
          occurrences: ordered,
          uniqueOccurrences,
          pinnedAt: ordered[0].pinnedAt || null,
        };
      })
      .sort((a, b) => {
        const aPinned = a.pinnedAt ? new Date(a.pinnedAt).getTime() : 0;
        const bPinned = b.pinnedAt ? new Date(b.pinnedAt).getTime() : 0;
        if (aPinned || bPinned) {
          if (aPinned && !bPinned) return -1;
          if (!aPinned && bPinned) return 1;
          if (aPinned !== bPinned) return bPinned - aPinned;
        }
        return b.latest.startDate - a.latest.startDate;
      });
  }, [events]);

  const filteredSeriesList = useMemo(
    () => seriesList.filter((series) => matchesEventQuery(series.first, searchQuery)),
    [searchQuery, seriesList]
  );

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

    setSelectedSeriesId((current) => (
      current && seriesList.some((series) => series.seriesId === current)
        ? current
        : seriesList[0].seriesId
    ));
  }, [location.state, seriesList]);

  const selectedSeries = useMemo(
    () => seriesList.find((series) => series.seriesId === selectedSeriesId) || seriesList[0] || null,
    [selectedSeriesId, seriesList]
  );

  const noMatchingResults = searchQuery.trim() && filteredSeriesList.length === 0;
  const editableOccurrences = selectedSeries?.uniqueOccurrences.slice(1) || [];
  const selectedOccurrence = editableOccurrences.find((occurrence) => occurrence.id === selectedOccurrenceId) || null;

  useEffect(() => {
    if (!eventListOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!selectorRef.current?.contains(event.target)) {
        setEventListOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setEventListOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [eventListOpen]);

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
    if (!selectedSeries || selectedSeries.uniqueOccurrences.length < 2) return [t("singleEvent")];
    const intervals = [];
    for (let index = 1; index < selectedSeries.uniqueOccurrences.length; index += 1) {
      intervals.push(
        differenceInDays(
          selectedSeries.uniqueOccurrences[index].startDate,
          selectedSeries.uniqueOccurrences[index - 1].startDate
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
    ...(selectedSeries && selectedSeries.uniqueOccurrences.length > 1
      ? [
          {
            title: t("averageBetweenOccurrences"),
            value: cycleValue(intervalValues, intervalMode),
            hint: t("eventMetricHintAverage"),
            onClick: () => setIntervalMode((current) => current + 1),
          },
          {
            title: t("lastTime"),
            value: cycleValue(sinceLastValues, sinceLastMode),
            hint: t("eventMetricHintLast"),
            onClick: () => setSinceLastMode((current) => current + 1),
          },
        ]
      : []),
  ];

  if (appLoading || eventsLoading || processing) {
    return <div className="view-state">{t("loadingEvents")}</div>;
  }

  if (error) {
    return <div className="view-state">{error}</div>;
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
        <div className="event-selector" ref={selectorRef}>
          <button
            type="button"
            className="page-title-block__trigger"
            onClick={() => {
              setEventListOpen((current) => !current);
              if (eventListOpen) {
                setSearchQuery("");
              }
            }}
          >
            <span>{selectedSeries?.first?.name || t("selectEventToSeeStats")}</span>
            {eventListOpen ? <ChevronUpIcon width="20" height="20" /> : <ChevronDownIcon width="20" height="20" />}
          </button>
          {eventListOpen ? (
            <div className="event-selector__menu">
              <div className="event-selector__search">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={t("searchEventsPlaceholder")}
                  aria-label={t("searchEventsPlaceholder")}
                  autoFocus
                />
              </div>
              <div className="event-selector__list">
                {filteredSeriesList.map((series) => (
                  <button
                    key={series.seriesId}
                    type="button"
                    className={`event-selector__option ${series.seriesId === selectedSeries?.seriesId ? "event-selector__option--active" : ""}`}
                    onClick={() => {
                      setSelectedSeriesId(series.seriesId);
                      setEventListOpen(false);
                      setSearchQuery("");
                    }}
                  >
                    {series.pinnedAt ? `${t("pinnedEvents")} · ` : ""}
                    {series.first.name}
                  </button>
                ))}
                {noMatchingResults ? (
                  <div className="event-selector__empty">{t("noSearchResultsMessage")}</div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </header>

      {!selectedSeries ? (
        <div className="view-state">{t("selectEventToSeeStats")}</div>
      ) : null}

      {selectedSeries ? (
        <div className="card-list">
        <article className="event-list-card event-list-card--static event-overview-card">
          <div className="event-list-card__title-row">
            <div className="event-list-card__meta">
              {selectedSeries.pinnedAt ? `${t("pinnedEvents")} · ` : ""}
              {firstDateLabel} · {t("eventMetricDays", { count: stats?.daysSinceFirst ?? differenceInDays(new Date(), selectedSeries.first.startDate) })}
            </div>
            <div className="event-list-card__actions">
              <button
                type="button"
                className={`icon-action ${selectedSeries.pinnedAt ? "icon-action--active" : ""}`.trim()}
                onClick={async () => {
                  await toggleEventPin(selectedSeries.first.id);
                }}
                aria-label={selectedSeries.pinnedAt ? t("unpinEvent") : t("pinEvent")}
              >
                <PinIcon width="16" height="16" />
              </button>
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
              <strong>{selectedSeries.uniqueOccurrences.length}</strong>
            </div>
            {selectedSeries.uniqueOccurrences.length > 1 ? (
              <div className="event-overview-card__item">
                <span>{t("lastTime")}</span>
                <strong>{latestDateLabel}</strong>
              </div>
            ) : null}
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
          {hasEnabledReminders(firstOccurrence.reminders || []) ? (
            <div className="event-overview-card__reminders">
              {(firstOccurrence.reminders || []).filter((rule) => rule.enabled).map((rule) => (
                <div key={rule.id} className="event-form-field__helper">
                  {describeReminderRule(rule, t)}
                </div>
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
      ) : null}

      {selectedSeries && selectedSeries.first.eventType !== "one_time" ? (
        <div className="event-detail-actions">
          <div className="event-detail-actions__buttons">
            <button type="button" className="chronicon-button" onClick={() => setRecurrenceOpen(true)}>
              {t("addOccurrence")}
            </button>
          </div>
        </div>
      ) : null}

      {selectedSeries ? (
        <TemporalGrid
          occurrences={selectedSeries.uniqueOccurrences}
          selectedOccurrenceId={selectedOccurrenceId}
          onOccurrenceClick={(occurrence) => {
            if (occurrence.id === selectedSeries.first.id) {
              return;
            }

            setSelectedOccurrenceId(occurrence.id);
            setEditOccurrenceOpen(true);
          }}
        />
      ) : null}

      {formOpen && selectedSeries ? (
        <Suspense fallback={<div className="view-state">{t("loadingEvents")}</div>}>
          <EventForm
            open={formOpen}
            onClose={() => setFormOpen(false)}
            onSubmit={async (formData) => {
              await handleUpdateEvent(selectedSeries.first.id, formData);
              setFormOpen(false);
            }}
            event={selectedSeries.first}
            seriesMeta={{
              occurrenceCount: selectedSeries.uniqueOccurrences.length,
            }}
            onDelete={async () => {
              await handleDeleteEvent(selectedSeries.first.id);
              setFormOpen(false);
            }}
          />
        </Suspense>
      ) : null}

      {recurrenceOpen && selectedSeries ? (
        <Suspense fallback={<div className="view-state">{t("loadingEvents")}</div>}>
          <AddRecurrenceDialog
            open={recurrenceOpen}
            onClose={() => setRecurrenceOpen(false)}
            onSubmit={async (_, date) => {
              await handleSaveRecurrence(selectedSeries.latest, date);
            }}
            eventToRecur={selectedSeries.latest}
          />
        </Suspense>
      ) : null}

      {editOccurrenceOpen && selectedOccurrence && selectedSeries ? (
        <Suspense fallback={<div className="view-state">{t("loadingEvents")}</div>}>
          <EditOccurrenceDialog
            open={editOccurrenceOpen}
            occurrence={selectedOccurrence}
            eventName={selectedSeries.first.name}
            onClose={() => {
              setEditOccurrenceOpen(false);
              setSelectedOccurrenceId(null);
            }}
            onSubmit={handleUpdateOccurrenceDate}
            onDelete={async (occurrenceId) => {
              await handleDeleteSingleOccurrence(occurrenceId);
              setSelectedOccurrenceId(null);
            }}
          />
        </Suspense>
      ) : null}
    </section>
  );
}

export default EventCalendar;
