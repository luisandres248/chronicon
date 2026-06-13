import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { CloseIcon } from "./icons";

const ConfirmDialog = ({ open, title, message, confirmText, cancelText, onConfirm, onClose, isDanger = true }) => {
  const { t } = useTranslation();
  
  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose} style={{ zIndex: 9999 }}>
      <div 
        className="event-form-panel" 
        style={{ height: "auto", minHeight: "auto", maxWidth: "420px", margin: "auto" }}
        role="dialog" 
        aria-modal="true" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="event-form-dialog__header">
          <h2 className="event-form-dialog__title">{title}</h2>
          <button type="button" className="event-form-panel__close" onClick={onClose} aria-label={t("closeButton")}>
            <CloseIcon width="14" height="14" />
          </button>
        </div>
        <div className="event-form-dialog__body" style={{ paddingBottom: "24px" }}>
          <p style={{ margin: 0, fontSize: "1.05rem", color: "var(--ink)", lineHeight: "1.5" }}>
            {message}
          </p>
        </div>
        <div className="event-form-dialog__actions">
          <div className="event-form-dialog__actions-row">
            <button type="button" className="chronicon-button chronicon-button--ghost" onClick={onClose}>
              {cancelText || t("cancelButton")}
            </button>
            <button 
              type="button" 
              className={`chronicon-button ${isDanger ? "chronicon-button--danger" : ""}`} 
              onClick={() => {
                onConfirm();
                onClose();
              }}
            >
              {confirmText || t("confirmButton", "Confirm")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
