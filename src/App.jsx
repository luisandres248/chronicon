import React, { Suspense, lazy, useContext, useEffect, useMemo, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { GlobalProvider, GlobalContext } from "./context/GlobalContext";
import Sidebar from "./components/Sidebar";
import PublicInfoPage from "./pages/PublicInfoPage";

const Config = lazy(() => import("./pages/Config"));
const EventsGrid = lazy(() => import("./components/EventsGrid"));
const EventCalendar = lazy(() => import("./components/EventCalendar"));
const ImportEventsPage = lazy(() => import("./pages/ImportEventsPage"));

function AppContent() {
  const { config } = useContext(GlobalContext);
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const isPublicPage = ["/privacy", "/terms", "/support"].includes(location.pathname);

  const shellTheme = useMemo(() => `theme-${config?.theme || "chronicon"}`, [config?.theme]);

  useEffect(() => {
    document.body.classList.remove("theme-light", "theme-dark");
    document.body.classList.add(shellTheme);

    return () => {
      document.body.classList.remove("theme-light", "theme-dark");
    };
  }, [shellTheme]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return undefined;
    }

    let removeListener = null;

    const registerBackButtonListener = async () => {
      const listener = await CapacitorApp.addListener("backButton", () => {
        if (sidebarOpen) {
          setSidebarOpen(false);
          return;
        }

        const modalBackEvent = new CustomEvent("chronicon:back-button", { cancelable: true });
        window.dispatchEvent(modalBackEvent);
        if (modalBackEvent.defaultPrevented) {
          return;
        }

        if (location.pathname !== "/") {
          if (window.history.length > 1) {
            navigate(-1);
          } else {
            navigate("/", { replace: true });
          }
          return;
        }

        CapacitorApp.exitApp();
      });

      removeListener = () => {
        listener.remove();
      };
    };

    registerBackButtonListener();

    return () => {
      if (removeListener) {
        removeListener();
      }
    };
  }, [location.pathname, navigate, sidebarOpen]);

  if (isPublicPage) {
    return (
      <Routes>
        <Route path="/privacy" element={<PublicInfoPage page="privacy" />} />
        <Route path="/terms" element={<PublicInfoPage page="terms" />} />
        <Route path="/support" element={<PublicInfoPage page="support" />} />
      </Routes>
    );
  }

  return (
    <div className={`app-shell ${shellTheme} ${sidebarOpen ? "app-shell--sidebar-open" : ""}`}>
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="app-shell__backdrop" onClick={() => setSidebarOpen(false)} />
      <main className="app-shell__main">
        <Suspense fallback={<div className="view-state">{t("loadingEvents")}</div>}>
          <Routes>
            <Route path="/" element={<EventsGrid />} />
            <Route path="/calendar" element={<EventCalendar />} />
            <Route path="/config" element={<Config />} />
            <Route path="/import" element={<ImportEventsPage />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

function App() {
  return (
    <GlobalProvider>
      <AppContent />
    </GlobalProvider>
  );
}

export default App;
