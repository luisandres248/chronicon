import React, { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { GlobalContext } from "../context/GlobalContext";
import DateField from "./DateField";
import { formatDate, normalizeDateFormat, parseDate } from "../utils/dateFormatter";

function toConfiguredDateValue(date, formatStr, locale) {
  const target = date instanceof Date ? date : new Date(date || Date.now());
  return Number.isNaN(target.getTime()) ? "" : formatDate(target, formatStr, locale);
}

function EditOccurrenceDialog({ open, occurrence, eventName, onClose, onSubmit, onDelete }) {
  const { config } = useContext(GlobalContext);
  const { t, i18n } = useTranslation();
  const dateFormat = normalizeDateFormat(config?.dateFormat);
  const duplicateOccurrenceMessage = t("duplicateOccurrenceSameDay");
  const [occurrenceDate, setOccurrenceDate] = useState(toConfiguredDateValue(occurrence?.startDate || new Date(), dateFormat, i18n.language));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const initialOccurrenceDate = toConfiguredDateValue(occurrence?.startDate || new Date(), dateFormat, i18n.language);

  useEffect(() => {
    if (!open) {
      return;
    }

    setOccurrenceDate(toConfiguredDateValue(occurrence?.startDate || new Date(), dateFormat, i18n.language));
    setError("");
    setSaving(false);
    setDeleting(false);
  }, [open, occurrence, dateFormat, i18n.language]);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        attemptClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, occurrenceDate, saving, deleting]);

  useEffect(() => {
    if (!open) return undefined;

    const handleBackButton = (eventBack) => {
      eventBack.preventDefault();
      attemptClose();
    };

    window.addEventListener("chronicon:back-button", handleBackButton);
    return () => window.removeEventListener("chronicon:back-button", handleBackButton);
  }, [open, occurrenceDate, saving, deleting]);

  if (!open || !occurrence) {
    return null;
  }

  const busy = saving || deleting;
  const hasUnsavedChanges = occurrenceDate !== initialOccurrenceDate;

  const attemptClose = () => {
    if (busy) {
      return;
    }

    if (hasUnsavedChanges && !window.confirm(t("confirmDiscardChanges"))) {
      return;
    }

    onClose();
  };

  const handleSave = async () => {
    const parsedDate = parseDate(occurrenceDate, dateFormat, i18n.language);
    if (!parsedDate) {
      setError(t("invalidStartDate"));
      return;
    }

    setSaving(true);
    try {
      await onSubmit(occurrence.id, parsedDate);
      onClose();
    } catch (submitError) {
      if (submitError?.message !== duplicateOccurrenceMessage) {
        setError(submitError?.message || t("updateOccurrenceError"));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t("confirmDeleteOccurrence", { eventName }))) {
      return;
    }

    setDeleting(true);
    try {
      await onDelete(occurrence.id);
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="modal-overlay" role="presentation" onClick={attemptClose}>
      <div
        className="simple-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-occurrence-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="simple-dialog__header">
          <h2 id="edit-occurrence-dialog-title" className="simple-dialog__title">
            {t("editOccurrenceTitle", { eventName })}
          </h2>
        </div>
        <div className="simple-dialog__body">
          <DateField
            className="simple-dialog__field"
            inputClassName="simple-dialog__input"
            label={t("recurrenceDateLabel")}
            value={occurrenceDate}
            onChange={(nextValue) => {
              setOccurrenceDate(nextValue);
              if (error) {
                setError("");
              }
            }}
            error={error}
            disabled={busy}
          />
        </div>
        <div className="simple-dialog__actions simple-dialog__actions--spread">
          <button type="button" className="chronicon-button chronicon-button--danger" onClick={handleDelete} disabled={busy}>
            {t("deleteButton")}
          </button>
          <div className="simple-dialog__actions-group">
            <button type="button" className="chronicon-button chronicon-button--ghost" onClick={attemptClose} disabled={busy}>
              {t("cancelButton")}
            </button>
            <button type="button" className="chronicon-button" onClick={handleSave} disabled={!occurrenceDate || busy}>
              {t("updateButton")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditOccurrenceDialog;
