import React, { useState, useEffect, useContext } from "react";
import { GlobalContext } from "../context/GlobalContext";
import { useTranslation } from "react-i18next";
import {
  createReminderRuleRecord,
  DEFAULT_REMINDER_TIME,
  EVENT_TYPES,
} from "../services/eventService";
import { describeReminderRule, REMINDER_PRESETS } from "../services/reminderService";
import logger from "../utils/logger.js";
import ColorSelect from "./ColorSelect";
import CustomSelect from "./CustomSelect";
import DateField from "./DateField";
import { CloseIcon, PencilIcon, TrashIcon } from "./icons";
import ReminderRuleDialog from "./ReminderRuleDialog";
import { formatDate, normalizeDateFormat, parseDate } from "../utils/dateFormatter";

function toConfiguredDateValue(date, formatStr, locale) {
  const target = date instanceof Date ? date : new Date(date || Date.now());
  return Number.isNaN(target.getTime()) ? "" : formatDate(target, formatStr, locale);
}

const EventForm = ({ open, onClose, onSubmit, event = null, onDelete, seriesMeta = null }) => {
  const { calendarColors, loadingColors, config, isReminderSupported } = useContext(GlobalContext);
  const { t, i18n } = useTranslation();
  const dateFormat = normalizeDateFormat(config?.dateFormat);
  const [formData, setFormData] = useState({
    name: "",
    startDate: toConfiguredDateValue(new Date(), dateFormat, i18n.language),
    description: "",
    colorId: null,
    tags: [],
    eventType: EVENT_TYPES.ONE_TIME,
    reminders: [],
  });
  const [tagInput, setTagInput] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [editingReminderIndex, setEditingReminderIndex] = useState(null);
  const intervalPresets = REMINDER_PRESETS.filter((preset) => preset.category === "interval");
  const anniversaryPresets = REMINDER_PRESETS.filter((preset) => preset.category === "anniversary");

  const initialFormData = {
    name: event?.name || "",
    startDate: toConfiguredDateValue(event?.startDate || new Date(), dateFormat, i18n.language),
    description: event?.description || "",
    colorId: event?.colorId || null,
    tags: event?.tags || [],
    eventType: event?.eventType || EVENT_TYPES.ONE_TIME,
    reminders: event?.reminders || [],
  };

  useEffect(() => {
    if (event) {
      logger.debug("Initializing form with event:", event);
      setFormData({
        name: event.name || "",
        startDate: toConfiguredDateValue(event.startDate || new Date(), dateFormat, i18n.language),
        description: event.description || "",
        colorId: event.colorId || null,
        tags: event.tags || [],
        eventType: event.eventType || EVENT_TYPES.ONE_TIME,
        reminders: event.reminders || [],
      });
    } else {
      setFormData({
        name: "",
        startDate: toConfiguredDateValue(new Date(), dateFormat, i18n.language),
        description: "",
        colorId: null,
        tags: [],
        eventType: EVENT_TYPES.ONE_TIME,
        reminders: [],
      });
    }
    setTagInput("");
    setErrors({});
    setSubmitting(false);
    setReminderDialogOpen(false);
    setEditingReminderIndex(null);
  }, [event, open, dateFormat, i18n.language]);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (eventKey) => {
      if (eventKey.key === "Escape") {
        attemptClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, formData, tagInput, submitting]);

  useEffect(() => {
    if (!open) return undefined;

    const handleBackButton = (eventBack) => {
      eventBack.preventDefault();
      attemptClose();
    };

    window.addEventListener("chronicon:back-button", handleBackButton);
    return () => window.removeEventListener("chronicon:back-button", handleBackButton);
  }, [open, onClose, formData, tagInput, submitting]);

  if (!open) {
    return null;
  }

  const hasUnsavedChanges = () => {
    if (tagInput.trim() !== "") {
      return true;
    }

    return JSON.stringify(formData) !== JSON.stringify(initialFormData);
  };

  const attemptClose = () => {
    if (submitting) {
      return;
    }

    if (hasUnsavedChanges() && !window.confirm(t("confirmDiscardChanges"))) {
      return;
    }

    onClose();
  };

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

  const addPresetReminder = (preset) => {
    setFormData((current) => {
      const exists = current.reminders.some((rule) => (
        rule.kind === preset.kind &&
        rule.anchor === preset.anchor &&
        rule.unit === preset.unit &&
        rule.value === preset.value &&
        rule.timeOfDay === (preset.timeOfDay || DEFAULT_REMINDER_TIME) &&
        rule.at === (preset.at || null)
      ));

      if (exists) {
        return current;
      }

      return {
        ...current,
        reminders: [...current.reminders, createReminderRuleRecord({ ...preset, id: undefined })],
      };
    });
  };

  const handleSaveReminderRule = (nextRule) => {
    setFormData((current) => {
      const nextReminders = [...current.reminders];
      if (editingReminderIndex === null) {
        nextReminders.push(nextRule);
      } else {
        nextReminders[editingReminderIndex] = nextRule;
      }

      return {
        ...current,
        reminders: nextReminders,
      };
    });
    setReminderDialogOpen(false);
    setEditingReminderIndex(null);
  };

  const handleDeleteReminderRule = (indexToDelete) => {
    setFormData((current) => ({
      ...current,
      reminders: current.reminders.filter((_, index) => index !== indexToDelete),
    }));
  };

  const handleSubmit = async (eventSubmit) => {
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
      eventType: formData.eventType,
      reminders: formData.reminders.map((rule) => createReminderRuleRecord(rule)),
    };

    logger.info("Submitting form data:", cleanedFormData);

    try {
      if (
        event &&
        event.eventType === EVENT_TYPES.SERIES &&
        cleanedFormData.eventType === EVENT_TYPES.ONE_TIME &&
        (seriesMeta?.occurrenceCount || 0) > 1
      ) {
        const confirmed = window.confirm(t("confirmConvertToOneTime"));
        if (!confirmed) {
          setSubmitting(false);
          return;
        }
      }
      await onSubmit(cleanedFormData);
    } catch (submitError) {
      setErrors((current) => ({
        ...current,
        startDate: submitError?.message || t("updateEventError"),
      }));
      setSubmitting(false);
    }
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
  const eventTypeOptions = [
    { value: EVENT_TYPES.ONE_TIME, label: t("eventTypeOneTime") },
    { value: EVENT_TYPES.SERIES, label: t("eventTypeSeries") },
  ];

  return (
    <div className="modal-overlay" role="presentation" onClick={attemptClose}>
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
              onClick={attemptClose}
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
              onChange={(startDate) => {
                setFormData({ ...formData, startDate });
                if (errors.startDate) {
                  setErrors((current) => ({ ...current, startDate: "" }));
                }
              }}
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
              <CustomSelect
                label={t("eventTypeLabel")}
                value={formData.eventType}
                onChange={(nextValue) => setFormData({ ...formData, eventType: nextValue })}
                options={eventTypeOptions}
              />
            </div>

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
              {formData.tags.length > 0 ? (
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
              ) : null}
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

            <div className="event-form-dialog__reminders">
              <div className="event-form-dialog__section-label">{t("reminderSectionTitle")}</div>
              <p className="event-form-field__helper">
                {isReminderSupported ? t("reminderSectionDescription") : t("reminderAndroidOnlyHint")}
              </p>
              <div className="event-form-dialog__preset-row">
                <div className="event-form-dialog__preset-group">
                  <div className="event-form-dialog__section-label">{t("reminderPresetPeriodicTitle")}</div>
                  <div className="event-form-dialog__preset-buttons">
                    {intervalPresets.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        className="chronicon-button chronicon-button--ghost"
                        onClick={() => addPresetReminder(preset)}
                        disabled={submitting}
                      >
                        {t(preset.labelKey)}
                      </button>
                    ))}
                  </div>
                  <p className="event-form-field__helper">{t("reminderPresetPeriodicHint")}</p>
                </div>
                <div className="event-form-dialog__preset-group">
                  <div className="event-form-dialog__section-label">{t("reminderPresetMilestoneTitle")}</div>
                  <div className="event-form-dialog__preset-buttons">
                    {anniversaryPresets.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        className="chronicon-button chronicon-button--ghost"
                        onClick={() => addPresetReminder(preset)}
                        disabled={submitting}
                      >
                        {t(preset.labelKey)}
                      </button>
                    ))}
                  </div>
                  <p className="event-form-field__helper">{t("reminderPresetMilestoneHint")}</p>
                </div>
              </div>
              <div className="event-form-dialog__reminder-list">
                {formData.reminders.map((rule, index) => (
                  <div key={rule.id} className="event-form-dialog__reminder-item">
                    <div>
                      <strong>{describeReminderRule(rule, t)}</strong>
                    </div>
                    <div className="event-list-card__actions">
                      <button
                        type="button"
                        className="icon-action"
                        onClick={() => {
                          setEditingReminderIndex(index);
                          setReminderDialogOpen(true);
                        }}
                        disabled={submitting}
                        aria-label={t("editReminderTitle")}
                      >
                        <PencilIcon width="12" height="12" />
                      </button>
                      <button
                        type="button"
                        className="icon-action"
                        onClick={() => handleDeleteReminderRule(index)}
                        disabled={submitting}
                        aria-label={t("deleteButton")}
                      >
                        <TrashIcon width="12" height="12" />
                      </button>
                    </div>
                  </div>
                ))}
                {formData.reminders.length === 0 ? (
                  <div className="event-form-field__helper">{t("reminderEmptyState")}</div>
                ) : null}
              </div>
              <button
                type="button"
                className="chronicon-button chronicon-button--ghost"
                onClick={() => {
                  setEditingReminderIndex(null);
                  setReminderDialogOpen(true);
                }}
                disabled={submitting}
              >
                {t("addCustomReminder")}
              </button>
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
      <ReminderRuleDialog
        open={reminderDialogOpen}
        onClose={() => {
          setReminderDialogOpen(false);
          setEditingReminderIndex(null);
        }}
        onSave={handleSaveReminderRule}
        initialRule={editingReminderIndex === null ? null : formData.reminders[editingReminderIndex]}
      />
    </div>
  );
};

export default EventForm;
