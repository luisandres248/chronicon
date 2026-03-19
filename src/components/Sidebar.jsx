import { useMemo } from "react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Wordmark from "./Wordmark";
import { CalendarIcon, GridIcon, SettingsIcon, UploadIcon } from "./icons";

const NAV_ITEMS = [
  { to: "/", key: "gridLink", icon: GridIcon },
  { to: "/calendar", key: "calendarLink", icon: CalendarIcon },
  { to: "/import", key: "importLink", icon: UploadIcon },
  { to: "/config", key: "configTitle", icon: SettingsIcon },
];

function Sidebar({ isOpen, setIsOpen }) {
  const { t } = useTranslation();

  const navItems = useMemo(
    () =>
      NAV_ITEMS.map((item) => ({
        ...item,
        label: t(item.key),
      })),
    [t]
  );

  return (
    <aside className={`sidebar ${isOpen ? "sidebar--open" : ""}`}>
      <button
        type="button"
        className="sidebar__notch"
        onClick={() => setIsOpen((current) => !current)}
        aria-label={isOpen ? t("collapseMenu") : t("expandMenu")}
      >
        <span />
        <span />
        <span />
      </button>
      <div className="sidebar__inner">
        <div className="sidebar__header">
          <div className="sidebar__brand">
            <Wordmark compact={!isOpen} inverted showName={false} />
          </div>
        </div>

        <nav className="sidebar__nav" aria-label={t("mainNavigation")}>
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) => `sidebar__link ${isActive ? "sidebar__link--active" : ""}`}
              onClick={() => setIsOpen(false)}
            >
              <span className="sidebar__icon">
                <Icon width="16" height="16" />
              </span>
              <span className="sidebar__label">{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
}

export default Sidebar;
