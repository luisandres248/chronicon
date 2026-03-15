import React, { useContext } from "react";
import logoFull from "../../assets/chronicon_logo_full.svg";
import logoWhite from "../../assets/chronicon_logo_white.svg";
import { GlobalContext } from "../context/GlobalContext";

function AppHeader({ title = "Chronicon" }) {
  const { config } = useContext(GlobalContext);
  const src = config?.theme === "dark" ? logoWhite : logoFull;

  return (
    <header className="app-header">
      <div className="app-header__brand" aria-hidden="true">
        <img className="app-header__logo" src={src} alt="" />
      </div>
      <div className="app-header__center">
        <h1 className="app-header__title">{title}</h1>
      </div>
      <div className="app-header__spacer" aria-hidden="true" />
    </header>
  );
}

export default AppHeader;
