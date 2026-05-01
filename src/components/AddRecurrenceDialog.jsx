import React, { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { GlobalContext } from "../context/GlobalContext";
import DateField from "./DateField";
import { formatDate, normalizeDateFormat, parseDate } from "../utils/dateFormatter";

function toConfiguredDateValue(date, formatStr, locale) {
  const target = date instanceof Date ? date : new Date(date || Date.now());
  return Number.isNaN(target.getTime()) ? "" : formatDate(target, formatStr, locale);
}

const AddRecurrenceDialog = ({ open, onClose, onSubmit, eventToRecur, initialDate }) => {
  const { config } = useContext(GlobalContext);
  const { t, i18n } = useTranslation();
  const dateFormat = normalizeDateFormat(config?.dateFormat);
  const [recurrenceDate, setRecurrenceDate] = useState(toConfiguredDateValue(initialDate || new Date(), dateFormat, i18n.language));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const initialRecurrenceDate = toConfiguredDateValue(initialDate || new Date(), dateFormat, i18n.language);

  useEffect(() => {
    if (open) {
      setRecurrenceDate(toConfiguredDateValue(initialDate || new Date(), dateFormat, i18n.language));
      setError("");
      setSaving(false);
    }
  }, [open, initialDate, dateFormat, i18n.language]);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        attemptClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, recurrenceDate, saving]);

  useEffect(() => {
    if (!open) return undefined;

    const handleBackButton = (eventBack) => {
      eventBack.preventDefault();
      attemptClose();
    };

    window.addEventListener("chronicon:back-button", handleBackButton);
    return () => window.removeEventListener("chronicon:back-button", handleBackButton);
  }, [open, onClose, recurrenceDate, saving]);

  if (!open || !eventToRecur) {
    return null;
  }

  const hasUnsavedChanges = recurrenceDate !== initialRecurrenceDate;

  const attemptClose = () => {
    if (saving) {
      return;
    }

    if (hasUnsavedChanges && !window.confirm(t("confirmDiscardChanges"))) {
      return;
    }

    onClose();
  };

  const handleSave = async () => {
    const parsedDate = parseDate(recurrenceDate, dateFormat, i18n.language);
    if (!parsedDate) {
      setError(t("invalidStartDate"));
      return;
    }

    if (!onSubmit) {
      attemptClose();
      return;
    }

    setSaving(true);
    try {
      await onSubmit(eventToRecur, parsedDate);
      onClose();
    } catch (submitError) {
      setError(submitError?.message || t("createRecurrenceError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" role="presentation" onClick={attemptClose}>
      <div
        className="simple-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-recurrence-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="simple-dialog__header">
          <h2 id="add-recurrence-dialog-title" className="simple-dialog__title">
            {t("addOccurrenceFor", { eventName: eventToRecur.name })}
          </h2>
        </div>
        <div className="simple-dialog__body">
          <DateField
            className="simple-dialog__field"
            inputClassName="simple-dialog__input"
            label={t("recurrenceDateLabel")}
            value={recurrenceDate}
            onChange={(nextValue) => {
              setRecurrenceDate(nextValue);
              if (error) {
                setError("");
              }
            }}
            error={error}
          />
        </div>
        <div className="simple-dialog__actions">
          <button type="button" className="chronicon-button chronicon-button--ghost" onClick={attemptClose}>
            {t("cancelButton")}
          </button>
          <button type="button" className="chronicon-button" onClick={handleSave} disabled={!recurrenceDate || saving}>
            {t("saveButton")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddRecurrenceDialog;
