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
  const {
    events,
    appLoading,
    processing,
    error,
    mergeImportedEvents,
    autoBackupConfig,
    autoBackupRunning,
    isAutoBackupSupported,
    chooseAutoBackupDestination,
    setAutoBackupEnabled,
    clearAutoBackupDestination,
    runAutoBackup,
  } = useContext(GlobalContext);
  const { t } = useTranslation();
  const [groupedEvents, setGroupedEvents] = useState({});
  const [selectedGroupNames, setSelectedGroupNames] = useState(new Set());
  const [importError, setImportError] = useState(null);
  const [importSuccess, setImportSuccess] = useState(null);
  const [importing, setImporting] = useState(false);
  const [icsUrl, setIcsUrl] = useState("");
  const [autoBackupActionError, setAutoBackupActionError] = useState(null);
  const [autoBackupActionSuccess, setAutoBackupActionSuccess] = useState(null);

  const eventGroupsForDisplay = useMemo(() => Object.values(groupedEvents), [groupedEvents]);
  const totalImportedPreviewEvents = useMemo(
    () => eventGroupsForDisplay.reduce((sum, group) => sum + group.length, 0),
    [eventGroupsForDisplay]
  );

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

  const closeImportPreview = () => {
    if (importing) return;
    setGroupedEvents({});
    setSelectedGroupNames(new Set());
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
      closeImportPreview();
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

  const handleAutoBackupToggle = async (enabled) => {
    setAutoBackupActionError(null);
    setAutoBackupActionSuccess(null);

    try {
      const nextEnabled = await setAutoBackupEnabled(enabled);
      if (nextEnabled) {
        setAutoBackupActionSuccess(t("autoBackupEnabledSuccess"));
      }
    } catch (autoBackupError) {
      setAutoBackupActionError(autoBackupError?.message || t("autoBackupWriteFailed"));
    }
  };

  const handleChooseDestination = async () => {
    setAutoBackupActionError(null);
    setAutoBackupActionSuccess(null);

    try {
      const result = await chooseAutoBackupDestination();
      setAutoBackupActionSuccess(t("autoBackupDestinationSaved", { fileName: result.displayName || "chronicon-autobackup.json" }));
    } catch (autoBackupError) {
      setAutoBackupActionError(autoBackupError?.message || t("autoBackupDestinationMissing"));
    }
  };

  const handleRunBackupNow = async () => {
    setAutoBackupActionError(null);
    setAutoBackupActionSuccess(null);

    try {
      await runAutoBackup();
      setAutoBackupActionSuccess(t("autoBackupCompleted"));
    } catch (autoBackupError) {
      setAutoBackupActionError(autoBackupError?.message || t("autoBackupWriteFailed"));
    }
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

        {isAutoBackupSupported ? (
          <article className="settings-card import-panel">
            <h3>{t("autoBackupTitle")}</h3>
            <p>{t("autoBackupDescription")}</p>

            <label className="import-panel__toggle">
              <input
                type="checkbox"
                checked={autoBackupConfig.enabled}
                onChange={(event) => handleAutoBackupToggle(event.target.checked)}
                disabled={autoBackupRunning}
              />
              <span>{t("autoBackupEnableLabel")}</span>
            </label>

            <div className="import-panel__meta">
              <strong>{t("autoBackupDestinationLabel")}</strong>
              <span>{autoBackupConfig.destinationLabel || t("autoBackupNoDestination")}</span>
            </div>

            <div className="import-panel__meta">
              <strong>{t("autoBackupFormatLabel")}</strong>
              <span>{t("autoBackupJsonFormat")}</span>
            </div>

            <div className="import-panel__meta">
              <strong>{t("autoBackupLastRunLabel")}</strong>
              <span>{autoBackupConfig.lastBackupAt ? new Date(autoBackupConfig.lastBackupAt).toLocaleString() : t("notAvailable")}</span>
            </div>

            <div className="import-panel__actions">
              <button type="button" className="chronicon-button chronicon-button--ghost" onClick={handleChooseDestination} disabled={autoBackupRunning}>
                {autoBackupConfig.destinationUri ? t("autoBackupChangeDestination") : t("autoBackupChooseDestination")}
              </button>
              <button
                type="button"
                className="chronicon-button"
                onClick={handleRunBackupNow}
                disabled={autoBackupRunning || !autoBackupConfig.destinationUri}
              >
                {autoBackupRunning ? t("autoBackupRunning") : t("autoBackupRunNow")}
              </button>
              {autoBackupConfig.destinationUri ? (
                <button type="button" className="chronicon-button chronicon-button--ghost" onClick={clearAutoBackupDestination} disabled={autoBackupRunning}>
                  {t("autoBackupClearDestination")}
                </button>
              ) : null}
            </div>
          </article>
        ) : null}
      </div>

      {importError ? <div className="status-card status-card--error">{importError}</div> : null}
      {importSuccess ? <div className="status-card status-card--success">{importSuccess}</div> : null}
      {autoBackupActionError ? <div className="status-card status-card--error">{autoBackupActionError}</div> : null}
      {autoBackupActionSuccess ? <div className="status-card status-card--success">{autoBackupActionSuccess}</div> : null}
      {autoBackupConfig.lastBackupError ? <div className="status-card status-card--error">{autoBackupConfig.lastBackupError}</div> : null}

      {eventGroupsForDisplay.length > 0 ? (
        <div className="modal-overlay" role="presentation" onClick={closeImportPreview}>
          <div
            className="import-preview-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-preview-title"
            onClick={(eventClick) => eventClick.stopPropagation()}
          >
            <div className="simple-dialog__header">
              <h2 id="import-preview-title" className="simple-dialog__title">
                {t("importPreviewTitle")}
              </h2>
              <p className="import-preview-dialog__lead">
                {t("importPreviewDescription", {
                  groupCount: eventGroupsForDisplay.length,
                  eventCount: totalImportedPreviewEvents,
                })}
              </p>
            </div>

            <div className="simple-dialog__body">
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
                <span className="import-preview-dialog__summary">
                  {t("importPreviewSelectedCount", { count: selectedGroupNames.size })}
                </span>
              </div>

              <div className="import-results__list import-preview-dialog__list">
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
            </div>

            <div className="simple-dialog__actions import-preview-dialog__actions">
              <button type="button" className="chronicon-button chronicon-button--ghost" onClick={closeImportPreview} disabled={importing}>
                {t("cancelButton")}
              </button>
              <button type="button" className="chronicon-button" onClick={handleImportSelected} disabled={selectedGroupNames.size === 0 || importing}>
                {t("importSelectedGroups", { count: selectedGroupNames.size })}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default ImportEventsPage;
