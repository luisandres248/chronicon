import React, { Suspense, lazy, useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { GlobalContext } from "../context/GlobalContext";
import AppHeader from "./AppHeader";
import { formatDate } from "../utils/dateFormatter";
import { PencilIcon, PlusIcon, TrashIcon } from "./icons";

const EventForm = lazy(() => import("./EventForm"));

function getSeriesMeta(series, locale, formatPattern, t) {
  const firstDate = formatDate(series.firstOccurrenceDate, formatPattern, locale);
  const recurrenceText =
    series.recurrenceCount > 1
      ? `${series.recurrenceCount} ${t("occurrences").toLowerCase()} · prom. ${series.averageGapDays} ${t("daysUnit")}`
      : `${series.daysSinceFirst} ${t("daysUnit")} ${t("sinceStart")}`;

  return { firstDate, recurrenceText };
}

function EventsGrid() {
  const {
    events,
    appLoading,
    eventsLoading,
    processing,
    error,
    handleCreateEvent,
    handleUpdateEvent,
    handleDeleteEvent,
    reloadEvents,
    config,
    calendarColors,
  } = useContext(GlobalContext);

  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [formOpen, setFormOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const seriesCards = useMemo(() => {
    const groups = new Map();

    for (const event of events) {
      const key = event.eventSeriesId || event.name;
      const current = groups.get(key) || [];
      current.push(event);
      groups.set(key, current);
    }

    return [...groups.values()]
      .map((seriesEvents) => {
        const ordered = [...seriesEvents].sort((a, b) => a.startDate - b.startDate);
        const firstOccurrenceDate = ordered[0].startDate;
        const lastOccurrenceDate = ordered[ordered.length - 1].startDate;
        const averageGap =
          ordered.length > 1
            ? Math.round(
                ordered.slice(1).reduce((total, occurrence, index) => {
                  const previous = ordered[index].startDate;
                  return total + Math.round((occurrence.startDate - previous) / (1000 * 60 * 60 * 24));
                }, 0) /
                  (ordered.length - 1)
              )
            : null;

        const daysSinceFirst = Math.round((Date.now() - firstOccurrenceDate.getTime()) / (1000 * 60 * 60 * 24));

        return {
          id: ordered[0].id,
          seriesId: ordered[0].eventSeriesId || ordered[0].id,
          event: ordered[0],
          name: ordered[0].name,
          description: ordered[0].description,
          firstOccurrenceDate,
          lastOccurrenceDate,
          recurrenceCount: ordered.length,
          averageGapDays: averageGap,
          daysSinceFirst,
        };
      })
      .sort((a, b) => b.lastOccurrenceDate - a.lastOccurrenceDate);
  }, [events]);

  const handleFormClose = () => {
    setFormOpen(false);
    setSelectedEvent(null);
  };

  const handleFormSubmit = async (formData) => {
    if (selectedEvent) {
      await handleUpdateEvent(selectedEvent.id, formData);
    } else {
      await handleCreateEvent(formData);
    }

    handleFormClose();
  };

  const handleDeleteFromForm = async (eventId) => {
    await handleDeleteEvent(eventId);
    handleFormClose();
  };

  if (appLoading || eventsLoading || processing) {
    return <div className="view-state">{t("loadingEvents")}</div>;
  }

  if (error) {
    return (
      <div className="view-state">
        <p>{error}</p>
        <button type="button" className="chronicon-button" onClick={reloadEvents}>
          {t("reloadData")}
        </button>
      </div>
    );
  }

  return (
    <section className="page-shell">
      <AppHeader />

      <div className="card-list">
        {seriesCards.length > 0 ? (
          seriesCards.map((card) => {
            const { firstDate, recurrenceText } = getSeriesMeta(card, i18n.language, config.dateFormat, t);

            return (
              <article
                key={card.seriesId}
                className="event-list-card"
                style={
                  card.event.colorId && calendarColors?.[card.event.colorId]?.background
                    ? {
                        "--event-accent": calendarColors[card.event.colorId].background,
                        "--event-accent-soft": calendarColors[card.event.colorId].background,
                      }
                    : undefined
                }
                onClick={() => navigate("/calendar", { state: { selectedEventId: card.id } })}
              >
                <div className="event-list-card__title-row">
                  <div>
                    <h3>{card.name}</h3>
                    {card.description ? <p className="event-list-card__description">{card.description}</p> : null}
                  </div>
                  <div className="event-list-card__actions">
                    <button
                      type="button"
                      className="icon-action"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedEvent(card.event);
                        setFormOpen(true);
                      }}
                      aria-label={t("editEventTitle")}
                    >
                      <PencilIcon width="16" height="16" />
                    </button>
                    <button
                      type="button"
                      className="icon-action"
                      onClick={async (event) => {
                        event.stopPropagation();
                        await handleDeleteEvent(card.id);
                      }}
                      aria-label={t("deleteButton")}
                    >
                      <TrashIcon width="16" height="16" />
                    </button>
                  </div>
                </div>
                <div className="event-list-card__meta">{firstDate}</div>
                <div className="event-list-card__submeta">{recurrenceText}</div>
              </article>
            );
          })
        ) : (
          <div className="empty-card">{t("noEventsMessageComprehensive")}</div>
        )}
      </div>

      <button
        type="button"
        className="floating-add-button"
        onClick={() => {
          setSelectedEvent(null);
          setFormOpen(true);
        }}
        aria-label={t("newEventTitle")}
      >
        <PlusIcon width="18" height="18" />
        <span>{t("createButton")}</span>
      </button>

      {formOpen ? (
        <Suspense fallback={<div className="view-state">{t("loadingEvents")}</div>}>
          <EventForm
            open={formOpen}
            onClose={handleFormClose}
            onSubmit={handleFormSubmit}
            event={selectedEvent}
            onDelete={selectedEvent ? () => handleDeleteFromForm(selectedEvent.id) : undefined}
          />
        </Suspense>
      ) : null}
    </section>
  );
}

export default EventsGrid;
