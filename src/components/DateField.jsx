import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { addMonths, format, getMonth, getYear, setMonth, setYear, subMonths } from "date-fns";
import { useTranslation } from "react-i18next";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { GlobalContext } from "../context/GlobalContext";
import CustomSelect from "./CustomSelect";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "./icons";
import { formatDate, getDateLocale, normalizeDateFormat, parseDate } from "../utils/dateFormatter";

function DateField({ label, value, onChange, error, disabled = false, className = "event-form-field", inputClassName = "event-form-field__input" }) {
  const { config } = useContext(GlobalContext);
  const { i18n, t } = useTranslation();
  const dateFormat = normalizeDateFormat(config?.dateFormat);
  const parsedDate = parseDate(value, dateFormat, i18n.language);
  const dateLocale = getDateLocale(i18n.language);
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(parsedDate || new Date());
  const navigationStartMonth = useMemo(() => new Date(1900, 0, 1), []);
  const navigationEndMonth = useMemo(() => new Date(new Date().getFullYear() + 5, 11, 31), []);
  const monthOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => ({
        value: String(index),
        label: format(new Date(2024, index, 1), "LLLL", { locale: dateLocale }),
      })),
    [dateLocale]
  );
  const yearOptions = useMemo(() => {
    const startYear = getYear(navigationStartMonth);
    const endYear = getYear(navigationEndMonth);
    return Array.from({ length: endYear - startYear + 1 }, (_, index) => {
      const year = endYear - index;
      return { value: String(year), label: String(year) };
    });
  }, [navigationEndMonth, navigationStartMonth]);

  useEffect(() => {
    if (!open) {
      setVisibleMonth(parsedDate || new Date());
    }
  }, [open, parsedDate]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleSelectDate = (date) => {
    if (!date) {
      return;
    }

    onChange(formatDate(date, dateFormat, i18n.language));
    setOpen(false);
  };

  const handlePreviousMonth = () => {
    setVisibleMonth((current) => {
      const nextMonth = subMonths(current, 1);
      return nextMonth < navigationStartMonth ? current : nextMonth;
    });
  };

  const handleNextMonth = () => {
    setVisibleMonth((current) => {
      const nextMonth = addMonths(current, 1);
      return nextMonth > navigationEndMonth ? current : nextMonth;
    });
  };

  return (
    <div className={`${className} date-field`} ref={rootRef}>
      <span className="setting-field__label">{label}</span>
      <div className="date-field__control">
        <input
          className={`${inputClassName} ${error ? "event-form-field__input--error" : ""}`.trim()}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={dateFormat}
          disabled={disabled}
        />
        <button
          type="button"
          className="date-field__toggle"
          onClick={() => !disabled && setOpen((current) => !current)}
          disabled={disabled}
          aria-label={t("openDatePicker")}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <CalendarIcon width="18" height="18" />
        </button>
      </div>
      {open ? (
        <div className="date-field__popover" role="dialog" aria-label={label}>
          <div className="date-field__calendar-toolbar">
            <div className="date-field__calendar-selects">
              <CustomSelect
                value={String(getMonth(visibleMonth))}
                onChange={(nextValue) => setVisibleMonth((current) => setMonth(current, Number(nextValue)))}
                options={monthOptions}
                containerClassName="date-field__select"
                triggerClassName="date-field__select-trigger"
                menuClassName="date-field__select-menu"
              />
              <CustomSelect
                value={String(getYear(visibleMonth))}
                onChange={(nextValue) => setVisibleMonth((current) => setYear(current, Number(nextValue)))}
                options={yearOptions}
                containerClassName="date-field__select date-field__select--year"
                triggerClassName="date-field__select-trigger"
                menuClassName="date-field__select-menu date-field__select-menu--year"
              />
            </div>
            <div className="date-field__calendar-nav">
              <button type="button" className="date-field__nav-button" onClick={handlePreviousMonth} aria-label={t("previousMonth")}>
                <ChevronLeftIcon width="16" height="16" />
              </button>
              <button type="button" className="date-field__nav-button" onClick={handleNextMonth} aria-label={t("nextMonth")}>
                <ChevronRightIcon width="16" height="16" />
              </button>
            </div>
          </div>
          <DayPicker
            mode="single"
            month={visibleMonth}
            onMonthChange={setVisibleMonth}
            selected={parsedDate || undefined}
            onSelect={handleSelectDate}
            locale={dateLocale}
            startMonth={navigationStartMonth}
            endMonth={navigationEndMonth}
            fixedWeeks
            showOutsideDays
            hideNavigation
            className="date-field__calendar"
          />
        </div>
      ) : null}
      {error ? <span className="event-form-field__error">{error}</span> : null}
    </div>
  );
}

export default DateField;
