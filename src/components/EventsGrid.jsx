import React, { Suspense, lazy, useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { GlobalContext } from "../context/GlobalContext";
import { getUniqueOccurrencesByDay, groupOccurrenceEventsBySeries, hasEnabledReminders, matchesEventQuery } from "../services/eventService";
import AppHeader from "./AppHeader";
import CardColumnBackground from "./CardColumnBackground";
import ConfirmDialog from "./ConfirmDialog";
import { formatDate } from "../utils/dateFormatter";
import { PencilIcon, PinIcon, PlusIcon, TrashIcon } from "./icons";

const EventForm = lazy(() => import("./EventForm"));

function getSeriesMeta(series, locale, formatPattern, t) {
  const firstDate = formatDate(series.firstOccurrenceDate, formatPattern, locale);
  const recurrenceText = series.eventType === "one_time"
    ? t("eventTypeOneTime")
    : series.recurrenceCount > 1
      ? `${series.recurrenceCount} ${t("occurrences").toLowerCase()} · ${t("averageAbbrev")} ${series.averageGapDays} ${t("daysUnit")}`
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
    toggleEventPin,
    reloadEvents,
    config,
    calendarColors,
  } = useContext(GlobalContext);

  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [formOpen, setFormOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const seriesCards = useMemo(() => {
    return groupOccurrenceEventsBySeries(events)
      .map(({ seriesId, occurrences: seriesEvents }) => {
        const ordered = [...seriesEvents];
        const uniqueOccurrences = getUniqueOccurrencesByDay(ordered);
        const firstOccurrenceDate = (uniqueOccurrences[0] || ordered[0]).startDate;
        const lastOccurrenceDate = (uniqueOccurrences[uniqueOccurrences.length - 1] || ordered[ordered.length - 1]).startDate;
        const averageGap =
          uniqueOccurrences.length > 1
            ? Math.round(
                uniqueOccurrences.slice(1).reduce((total, occurrence, index) => {
                  const previous = uniqueOccurrences[index].startDate;
                  return total + Math.round((occurrence.startDate - previous) / (1000 * 60 * 60 * 24));
                }, 0) /
                  (uniqueOccurrences.length - 1)
              )
            : null;

        const daysSinceFirst = Math.round((Date.now() - firstOccurrenceDate.getTime()) / (1000 * 60 * 60 * 24));

        return {
          id: ordered[0].id,
          seriesId,
          event: ordered[0],
          name: ordered[0].name,
          description: ordered[0].description,
          tags: ordered[0].tags || [],
          firstOccurrenceDate,
          lastOccurrenceDate,
          recurrenceCount: uniqueOccurrences.length,
          averageGapDays: averageGap,
          daysSinceFirst,
          eventType: ordered[0].eventType || "one_time",
          remindersEnabled: hasEnabledReminders(ordered[0].reminders || []),
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
        return b.lastOccurrenceDate - a.lastOccurrenceDate;
      });
  }, [events]);

  const filteredSeriesCards = useMemo(
    () => seriesCards.filter((card) => matchesEventQuery(card, searchQuery)),
    [searchQuery, seriesCards]
  );

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

      <div className="home-column-cap">
        <div className="home-column-cap__abacus">
          <div className="search-field search-field--home">
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t("searchEventsPlaceholder")}
              aria-label={t("searchEventsPlaceholder")}
            />
          </div>
        </div>
        <div className="home-column-cap__echinus"></div>
        <div className="home-column-cap__annulets"></div>
      </div>

      <div className="card-list">
        {filteredSeriesCards.length > 0 ? (
          filteredSeriesCards.map((card, index) => {
            const { firstDate, recurrenceText } = getSeriesMeta(card, i18n.language, config.dateFormat, t);
            const accentColor = card.event.colorId && calendarColors?.[card.event.colorId]?.background
              ? calendarColors[card.event.colorId].background
              : "#6592c8";
            const variant = filteredSeriesCards.length === 1
              ? "single"
              : index === 0
                ? "first"
                : index === filteredSeriesCards.length - 1
                  ? "last"
                  : "middle";

            return (
              <article
                key={card.seriesId}
                className="event-list-card event-list-card--columnar"
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
                <CardColumnBackground accentColor={accentColor} variant={variant} />
                <div className="event-list-card__content">
                  <div className="event-list-card__title-row">
                    <div>
                      <h3>{card.name}</h3>
                      {card.description ? <p className="event-list-card__description">{card.description}</p> : null}
                    </div>
                    <div className="event-list-card__actions">
                      <button
                        type="button"
                        className={`icon-action ${card.pinnedAt ? "icon-action--active" : ""}`.trim()}
                        onClick={async (event) => {
                          event.stopPropagation();
                          await toggleEventPin(card.id);
                        }}
                        aria-label={card.pinnedAt ? t("unpinEvent") : t("pinEvent")}
                      >
                        <PinIcon width="16" height="16" />
                      </button>
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
                        onClick={(event) => {
                          event.stopPropagation();
                          setEventToDelete({ id: card.id, title: card.name });
                        }}
                        aria-label={t("deleteButton")}
                      >
                        <TrashIcon width="16" height="16" />
                      </button>
                    </div>
                  </div>
                  <div className="event-list-card__meta">{firstDate}</div>
                  <div className="event-list-card__submeta">
                    {card.pinnedAt ? `${t("pinnedEvents")} · ` : ""}
                    {recurrenceText}
                    {card.remindersEnabled ? ` · ${t("reminderEnabledBadge")}` : ""}
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <div className="empty-card">
            {searchQuery.trim() ? t("noSearchResultsMessage") : t("noEventsMessageComprehensive")}
          </div>
        )}
      </div>

      {filteredSeriesCards.length > 0 && (
        <div className="home-column-base" aria-hidden="true">
          <div className="home-column-base__annulets"></div>
          <div className="home-column-base__torus-top"></div>
          <div className="home-column-base__scotia"></div>
          <div className="home-column-base__torus-bottom"></div>
          <div className="home-column-base__plinth-1"></div>
          <div className="home-column-base__plinth-2"></div>
          <div className="home-column-base__plinth-3"></div>
        </div>
      )}

      <button
        type="button"
        className="chronicon-button floating-add-button"
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
            seriesMeta={selectedEvent ? seriesCards.find((card) => card.event.id === selectedEvent.id) : null}
            onDelete={selectedEvent ? () => handleDeleteFromForm(selectedEvent.id) : undefined}
          />
        </Suspense>
      ) : null}
      {eventToDelete && (
        <ConfirmDialog
          open={!!eventToDelete}
          title={t("deleteButton")}
          message={t("confirmDeleteEvent", { eventName: eventToDelete.title })}
          confirmText={t("deleteButton")}
          onConfirm={async () => {
            await handleDeleteEvent(eventToDelete.id);
            setEventToDelete(null);
          }}
          onClose={() => setEventToDelete(null)}
          isDanger={true}
        />
      )}
    </section>
  );
}

export default EventsGrid;
