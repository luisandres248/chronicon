import React, { useState, useEffect, useContext } from "react";
import { GlobalContext } from "../context/GlobalContext";
import { useTranslation } from "react-i18next";
import logger from "../utils/logger.js";
import ColorSelect from "./ColorSelect";
import DateField from "./DateField";
import { CloseIcon } from "./icons";
import { formatDate, normalizeDateFormat, parseDate } from "../utils/dateFormatter";

function toConfiguredDateValue(date, formatStr, locale) {
  const target = date instanceof Date ? date : new Date(date || Date.now());
  return Number.isNaN(target.getTime()) ? "" : formatDate(target, formatStr, locale);
}

const EventForm = ({ open, onClose, onSubmit, event = null, onDelete }) => {
  const { calendarColors, loadingColors, config } = useContext(GlobalContext);
  const { t, i18n } = useTranslation();
  const dateFormat = normalizeDateFormat(config?.dateFormat);
  const [formData, setFormData] = useState({
    name: "",
    startDate: toConfiguredDateValue(new Date(), dateFormat, i18n.language),
    description: "",
    colorId: null,
    tags: [],
  });
  const [tagInput, setTagInput] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (event) {
      logger.debug("Initializing form with event:", event);
      setFormData({
        name: event.name || "",
        startDate: toConfiguredDateValue(event.startDate || new Date(), dateFormat, i18n.language),
        description: event.description || "",
        colorId: event.colorId || null,
        tags: event.tags || [],
      });
    } else {
      setFormData({
        name: "",
        startDate: toConfiguredDateValue(new Date(), dateFormat, i18n.language),
        description: "",
        colorId: null,
        tags: [],
      });
    }
    setTagInput("");
    setErrors({});
    setSubmitting(false);
  }, [event, open, dateFormat, i18n.language]);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (eventKey) => {
      if (eventKey.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name || formData.name.trim() === "") {
      newErrors.name = t("eventNameRequired");
    }

    const parsedStartDate = parseDate(formData.startDate, dateFormat, i18n.language);
    if (!parsedStartDate) {
      newErrors.startDate = t("invalidStartDate");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !formData.tags.includes(trimmedTag)) {
      setFormData((current) => ({
        ...current,
        tags: [...current.tags, trimmedTag],
      }));
    }
    setTagInput("");
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData((current) => ({
      ...current,
      tags: current.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const handleSubmit = (eventSubmit) => {
    eventSubmit.preventDefault();

    let currentTags = [...formData.tags];
    const trimmedTagInput = tagInput.trim();

    if (trimmedTagInput !== "" && !currentTags.includes(trimmedTagInput)) {
      currentTags.push(trimmedTagInput);
      setFormData((current) => ({ ...current, tags: [...currentTags] }));
      setTagInput("");
    }

    setSubmitting(true);
    if (!validateForm()) {
      setSubmitting(false);
      return;
    }

    const parsedStartDate = parseDate(formData.startDate, dateFormat, i18n.language);
    const cleanedFormData = {
      name: formData.name.trim(),
      startDate: parsedStartDate,
      description: formData.description?.trim() || "",
      colorId: formData.colorId,
      tags: currentTags.map((tag) => tag.trim()).filter((tag) => tag.length > 0),
    };

    logger.info("Submitting form data:", cleanedFormData);
    onSubmit(cleanedFormData);
  };

  const handleDelete = () => {
    if (event && window.confirm(t("confirmDeleteEvent", { eventName: event.name }))) {
      if (onDelete) {
        onDelete(event.id);
      }
      onClose();
    }
  };

  const colorOptions = [
    { value: "", label: t("defaultColorOption"), background: "transparent", borderColor: "var(--border-soft)" },
    ...(calendarColors
      ? Object.entries(calendarColors).map(([id, colorData]) => ({
          value: id,
          label: colorData.background.toUpperCase(),
          background: colorData.background,
          borderColor: colorData.foreground,
        }))
      : []),
  ];

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="event-form-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-form-title"
        onClick={(eventClick) => eventClick.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="event-form-dialog__header">
            <h2 id="event-form-title" className="event-form-dialog__title">
              {event ? t("editEventTitle") : t("newEventTitle")}
            </h2>
            <button
              type="button"
              className="event-form-panel__close"
              onClick={onClose}
              disabled={submitting}
              aria-label={t("closeButton")}
            >
              <CloseIcon width="14" height="14" />
            </button>
          </div>

          <div className="event-form-dialog__body">
            <label className="event-form-field">
              <span className="setting-field__label">{t("eventNameLabel")}</span>
              <input
                className={`event-form-field__input ${errors.name ? "event-form-field__input--error" : ""}`}
                value={formData.name}
                onChange={(eventInput) => setFormData({ ...formData, name: eventInput.target.value })}
                disabled={submitting}
              />
              {errors.name ? <span className="event-form-field__error">{errors.name}</span> : null}
            </label>

            <DateField
              label={t("startDateLabel")}
              value={formData.startDate}
              onChange={(startDate) => setFormData({ ...formData, startDate })}
              error={errors.startDate}
              disabled={submitting}
            />

            <label className="event-form-field">
              <span className="setting-field__label">{t("descriptionLabel")}</span>
              <textarea
                className="event-form-field__input event-form-field__textarea"
                rows={4}
                value={formData.description}
                onChange={(eventInput) => setFormData({ ...formData, description: eventInput.target.value })}
                disabled={submitting}
              />
            </label>

            <div className="event-form-field">
              <ColorSelect
                label={t("eventColorLabel")}
                value={formData.colorId || ""}
                onChange={(nextValue) => setFormData({ ...formData, colorId: nextValue || null })}
                options={colorOptions}
              />
              {loadingColors ? <span className="event-form-field__helper">{t("loadingEvents")}</span> : null}
            </div>

            <div>
              <div className="event-form-dialog__section-label">{t("tagsLabel")}</div>
              <div className="event-form-dialog__tags">
                {formData.tags.map((tag) => (
                  <span key={tag} className="event-form-tag">
                    <span>{tag}</span>
                    <button type="button" onClick={() => handleRemoveTag(tag)} disabled={submitting} aria-label={`${t("deleteButton")}: ${tag}`}>
                      <CloseIcon width="12" height="12" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="event-form-dialog__tag-entry">
                <label className="event-form-field event-form-field--grow">
                  <span className="setting-field__label">{t("addTagLabel")}</span>
                  <input
                    className="event-form-field__input"
                    value={tagInput}
                    onChange={(eventInput) => setTagInput(eventInput.target.value)}
                    onKeyDown={(eventKey) => {
                      if (eventKey.key === "Enter") {
                        eventKey.preventDefault();
                        handleAddTag();
                      }
                    }}
                    disabled={submitting}
                  />
                </label>
                <button
                  type="button"
                  className="chronicon-button chronicon-button--ghost"
                  onClick={handleAddTag}
                  disabled={submitting || !tagInput.trim()}
                >
                  {t("addTagButton")}
                </button>
              </div>
            </div>
          </div>

          <div className="event-form-dialog__actions">
            <div className="event-form-dialog__actions-row">
              {event && onDelete ? (
                <button type="button" className="chronicon-button chronicon-button--danger" onClick={handleDelete} disabled={submitting}>
                  {t("deleteButton")}
                </button>
              ) : null}
              <button type="submit" className="chronicon-button" disabled={submitting}>
                {event ? t("updateButton") : t("createButton")}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventForm;
