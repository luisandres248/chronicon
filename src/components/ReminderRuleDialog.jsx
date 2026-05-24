import React, { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { GlobalContext } from "../context/GlobalContext";
import {
  createReminderRuleRecord,
  DEFAULT_REMINDER_TIME,
  REMINDER_ANCHORS,
  REMINDER_KINDS,
  REMINDER_UNITS,
} from "../services/eventService";
import { formatDate, normalizeDateFormat, parseDate } from "../utils/dateFormatter";
import CustomSelect from "./CustomSelect";
import DateField from "./DateField";

function toConfiguredDateValue(date, formatStr, locale) {
  const target = date instanceof Date ? date : new Date(date || Date.now());
  return Number.isNaN(target.getTime()) ? "" : formatDate(target, formatStr, locale);
}

function ReminderRuleDialog({ open, onClose, onSave, initialRule = null }) {
  const { config } = useContext(GlobalContext);
  const { t, i18n } = useTranslation();
  const dateFormat = normalizeDateFormat(config?.dateFormat);
  const [kind, setKind] = useState(REMINDER_KINDS.INTERVAL);
  const [anchor, setAnchor] = useState(REMINDER_ANCHORS.LAST);
  const [value, setValue] = useState("1");
  const [unit, setUnit] = useState(REMINDER_UNITS.DAYS);
  const [timeOfDay, setTimeOfDay] = useState(DEFAULT_REMINDER_TIME);
  const [atDate, setAtDate] = useState(toConfiguredDateValue(new Date(), dateFormat, i18n.language));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    if (initialRule) {
      setKind(initialRule.kind);
      setAnchor(initialRule.anchor);
      setValue(String(initialRule.value || 1));
      setUnit(initialRule.unit);
      setTimeOfDay(initialRule.timeOfDay || DEFAULT_REMINDER_TIME);
      setAtDate(toConfiguredDateValue(initialRule.at ? new Date(initialRule.at) : new Date(), dateFormat, i18n.language));
    } else {
      setKind(REMINDER_KINDS.INTERVAL);
      setAnchor(REMINDER_ANCHORS.LAST);
      setValue("1");
      setUnit(REMINDER_UNITS.DAYS);
      setTimeOfDay(DEFAULT_REMINDER_TIME);
      setAtDate(toConfiguredDateValue(new Date(), dateFormat, i18n.language));
    }

    setError("");
  }, [open, initialRule, dateFormat, i18n.language]);

  if (!open) {
    return null;
  }

  const kindOptions = [
    { value: REMINDER_KINDS.ANNIVERSARY, label: t("reminderKindAnniversary") },
    { value: REMINDER_KINDS.INTERVAL, label: t("reminderKindInterval") },
    { value: REMINDER_KINDS.ONE_TIME, label: t("reminderKindOneTime") },
  ];
  const anchorOptions = [
    { value: REMINDER_ANCHORS.FIRST, label: t("reminderAnchorFirst") },
    { value: REMINDER_ANCHORS.LAST, label: t("reminderAnchorLast") },
  ];
  const unitOptions = [
    { value: REMINDER_UNITS.DAYS, label: t("reminderUnitdays") },
    { value: REMINDER_UNITS.WEEKS, label: t("reminderUnitweeks") },
    { value: REMINDER_UNITS.MONTHS, label: t("reminderUnitmonths") },
    { value: REMINDER_UNITS.YEARS, label: t("reminderUnityears") },
  ];

  const handleSave = () => {
    const numericValue = Math.max(1, Number(value || 1));

    if (kind === REMINDER_KINDS.ONE_TIME) {
      const parsedDate = parseDate(atDate, dateFormat, i18n.language);
      if (!parsedDate) {
        setError(t("invalidStartDate"));
        return;
      }

      const [hours, minutes] = (timeOfDay || DEFAULT_REMINDER_TIME).split(":").map(Number);
      const exactDate = new Date(
        parsedDate.getFullYear(),
        parsedDate.getMonth(),
        parsedDate.getDate(),
        Number.isFinite(hours) ? hours : 9,
        Number.isFinite(minutes) ? minutes : 0,
        0,
        0
      );

      onSave(createReminderRuleRecord({
        ...initialRule,
        kind,
        anchor: REMINDER_ANCHORS.FIRST,
        unit: REMINDER_UNITS.DAYS,
        value: 1,
        timeOfDay,
        at: exactDate.toISOString(),
      }));
      return;
    }

    onSave(createReminderRuleRecord({
      ...initialRule,
      kind,
      anchor,
      unit,
      value: numericValue,
      timeOfDay,
      at: null,
    }));
  };

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div className="simple-dialog" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <div className="simple-dialog__header">
          <h2 className="simple-dialog__title">
            {initialRule ? t("editReminderTitle") : t("newReminderTitle")}
          </h2>
        </div>
        <div className="simple-dialog__body">
          <div className="event-form-field">
            <CustomSelect
              label={t("reminderTypeLabel")}
              value={kind}
              onChange={setKind}
              options={kindOptions}
            />
          </div>

          {kind === REMINDER_KINDS.ONE_TIME ? (
            <div className="event-form-dialog__reminder-grid">
              <DateField
                label={t("reminderDateLabel")}
                value={atDate}
                onChange={(nextValue) => {
                  setAtDate(nextValue);
                  if (error) {
                    setError("");
                  }
                }}
                error={error}
              />
              <label className="event-form-field">
                <span className="setting-field__label">{t("reminderTimeLabel")}</span>
                <input
                  className="event-form-field__input"
                  type="time"
                  value={timeOfDay}
                  onChange={(event) => setTimeOfDay(event.target.value || DEFAULT_REMINDER_TIME)}
                />
              </label>
            </div>
          ) : (
            <div className="event-form-dialog__reminder-grid">
              <div className="event-form-field">
                <CustomSelect
                  label={t("reminderAnchorLabel")}
                  value={anchor}
                  onChange={setAnchor}
                  options={anchorOptions}
                />
              </div>
              <label className="event-form-field">
                <span className="setting-field__label">{t("reminderEveryLabel")}</span>
                <input
                  className="event-form-field__input"
                  type="number"
                  min="1"
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                />
              </label>
              <div className="event-form-field">
                <CustomSelect
                  label={t("reminderUnitLabel")}
                  value={unit}
                  onChange={setUnit}
                  options={unitOptions}
                />
              </div>
              <label className="event-form-field">
                <span className="setting-field__label">{t("reminderTimeLabel")}</span>
                <input
                  className="event-form-field__input"
                  type="time"
                  value={timeOfDay}
                  onChange={(event) => setTimeOfDay(event.target.value || DEFAULT_REMINDER_TIME)}
                />
              </label>
            </div>
          )}
        </div>
        <div className="simple-dialog__actions">
          <button type="button" className="chronicon-button chronicon-button--ghost" onClick={onClose}>
            {t("cancelButton")}
          </button>
          <button type="button" className="chronicon-button" onClick={handleSave}>
            {t("saveButton")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReminderRuleDialog;
