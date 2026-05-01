import React, { useEffect, useRef, useState } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "./icons";

function CustomSelect({ label, value, onChange, options, containerClassName = "", triggerClassName = "", menuClassName = "" }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const selectedOption = options.find((option) => option.value === value) || options[0];

  return (
    <div className={`custom-select ${open ? "custom-select--open" : ""} ${containerClassName}`.trim()} ref={rootRef}>
      {label ? <span className="setting-field__label">{label}</span> : null}
      <button
        type="button"
        className={`custom-select__trigger ${triggerClassName} ${open ? "custom-select__trigger--open" : ""}`.trim()}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selectedOption?.label ?? ""}</span>
        {open ? <ChevronUpIcon width="16" height="16" /> : <ChevronDownIcon width="16" height="16" />}
      </button>
      {open ? (
        <div className={`custom-select__menu ${menuClassName}`.trim()}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`custom-select__option ${option.value === value ? "custom-select__option--active" : ""}`}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default CustomSelect;
