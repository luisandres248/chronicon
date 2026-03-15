import React, { useContext, useMemo, useState } from "react";
import { GlobalContext } from "../context/GlobalContext";
import { groupEventsByName } from "../services/eventService";
import {
  exportEventsToIcs,
  exportEventsToJson,
  importEventsFromIcs,
  importEventsFromJson,
} from "../services/importExportService";
import AppHeader from "../components/AppHeader";
import ImportEventCard from "../components/ImportEventCard";
import { useTranslation } from "react-i18next";

function downloadTextFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function ImportEventsPage() {
  const { events, appLoading, processing, error, mergeImportedEvents } = useContext(GlobalContext);
  const { t } = useTranslation();
  const [groupedEvents, setGroupedEvents] = useState({});
  const [selectedGroupNames, setSelectedGroupNames] = useState(new Set());
  const [importError, setImportError] = useState(null);
  const [importSuccess, setImportSuccess] = useState(null);
  const [importing, setImporting] = useState(false);
  const [icsUrl, setIcsUrl] = useState("");

  const eventGroupsForDisplay = useMemo(() => Object.values(groupedEvents), [groupedEvents]);

  const loadImportedEvents = async (importedEvents) => {
    const grouped = groupEventsByName(importedEvents);
    setGroupedEvents(grouped);
    setSelectedGroupNames(new Set(Object.keys(grouped)));
    setImportError(null);
    setImportSuccess(null);
  };

  const handleToggleSelectAll = (checked) => {
    if (checked) {
      setSelectedGroupNames(new Set(eventGroupsForDisplay.map((group) => group[0].name)));
    } else {
      setSelectedGroupNames(new Set());
    }
  };

  const handleToggleSelectGroup = (groupName) => {
    setSelectedGroupNames((prevSelected) => {
      const nextSelected = new Set(prevSelected);
      if (nextSelected.has(groupName)) nextSelected.delete(groupName);
      else nextSelected.add(groupName);
      return nextSelected;
    });
  };

  const handleFileImport = async (event, type) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const importedEvents = type === "json" ? importEventsFromJson(text) : importEventsFromIcs(text);
      await loadImportedEvents(importedEvents);
    } catch (err) {
      setImportError(err.message || t("importErrorOccurred", { eventName: file.name }));
    } finally {
      event.target.value = "";
    }
  };

  const handleUrlImport = async () => {
    if (!icsUrl.trim()) return;
    setImporting(true);
    setImportError(null);
    try {
      const response = await fetch(icsUrl.trim());
      if (!response.ok) {
        throw new Error(t("importUrlFailed"));
      }
      const text = await response.text();
      const importedEvents = importEventsFromIcs(text);
      await loadImportedEvents(importedEvents);
    } catch (err) {
      setImportError(err.message || t("importUrlFailed"));
    } finally {
      setImporting(false);
    }
  };

  const handleImportSelected = async () => {
    const selectedEvents = eventGroupsForDisplay
      .filter((group) => selectedGroupNames.has(group[0].name))
      .flat();

    setImporting(true);
    setImportError(null);
    setImportSuccess(null);
    try {
      const importedCount = await mergeImportedEvents(selectedEvents);
      setImportSuccess(t("successfullyImportedEvents", { count: importedCount }));
      setGroupedEvents({});
      setSelectedGroupNames(new Set());
    } catch (err) {
      setImportError(err.message || t("importFailed"));
    } finally {
      setImporting(false);
    }
  };

  const handleExportJson = () => {
    downloadTextFile("chronicon-export.json", exportEventsToJson(events), "application/json");
  };

  const handleExportIcs = () => {
    downloadTextFile("chronicon-export.ics", exportEventsToIcs(events), "text/calendar;charset=utf-8");
  };

  if (appLoading || processing) {
    return <div className="view-state">{t("loadingEvents")}</div>;
  }

  if (error) {
    return <div className="view-state">{error}</div>;
  }

  return (
    <section className="page-shell">
      {(importing || processing) && <div className="page-overlay">{t("loadingEvents")}</div>}

      <AppHeader />

      <div className="card-list">
        <article className="settings-card import-panel">
          <h3>{t("importLink")}</h3>
          <p>{t("offlineImportDescription")}</p>
          <div className="import-panel__actions">
            <label className="chronicon-button chronicon-button--ghost import-panel__file">
              {t("importJson")}
              <input hidden type="file" accept=".json,application/json" onChange={(event) => handleFileImport(event, "json")} />
            </label>
            <label className="chronicon-button chronicon-button--ghost import-panel__file">
              {t("importIcs")}
              <input hidden type="file" accept=".ics,text/calendar" onChange={(event) => handleFileImport(event, "ics")} />
            </label>
          </div>
          <div className="import-panel__url">
            <input
              className="import-panel__input"
              placeholder={t("publicIcsUrl")}
              value={icsUrl}
              onChange={(event) => setIcsUrl(event.target.value)}
            />
            <button type="button" className="chronicon-button" onClick={handleUrlImport} disabled={!icsUrl.trim()}>
              {t("importFromUrl")}
            </button>
          </div>
        </article>

        <article className="settings-card import-panel">
          <h3>{t("exportTitle")}</h3>
          <p>{t("offlineExportDescription")}</p>
          <div className="import-panel__actions">
            <button type="button" className="chronicon-button chronicon-button--ghost" onClick={handleExportJson} disabled={!events.length}>
              {t("exportJson")}
            </button>
            <button type="button" className="chronicon-button chronicon-button--ghost" onClick={handleExportIcs} disabled={!events.length}>
              {t("exportIcs")}
            </button>
          </div>
        </article>
      </div>

      {importError ? <div className="status-card status-card--error">{importError}</div> : null}
      {importSuccess ? <div className="status-card status-card--success">{importSuccess}</div> : null}

      {eventGroupsForDisplay.length > 0 ? (
        <section className="import-results">
          <div className="import-results__toolbar">
            <label className="import-results__select-all">
              <input
                type="checkbox"
                checked={selectedGroupNames.size === eventGroupsForDisplay.length}
                ref={(input) => {
                  if (input) {
                    input.indeterminate =
                      selectedGroupNames.size > 0 && selectedGroupNames.size < eventGroupsForDisplay.length;
                  }
                }}
                onChange={(event) => handleToggleSelectAll(event.target.checked)}
              />
              <span>{t("selectAll")}</span>
            </label>
            <button type="button" className="chronicon-button" onClick={handleImportSelected} disabled={selectedGroupNames.size === 0}>
              {t("importSelectedGroups", { count: selectedGroupNames.size })}
            </button>
          </div>

          <div className="import-results__list">
            {eventGroupsForDisplay.map((group) => (
              <label key={group[0].name} className="import-results__item">
                <input
                  type="checkbox"
                  checked={selectedGroupNames.has(group[0].name)}
                  onChange={() => handleToggleSelectGroup(group[0].name)}
                />
                <div className="import-results__card">
                  <ImportEventCard eventGroup={group} />
                </div>
              </label>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}

export default ImportEventsPage;
