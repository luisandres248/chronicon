import React, { useContext } from "react";
import logoFull from "../../assets/chronicon_logo_full.svg";
import logoWhite from "../../assets/chronicon_logo_white.svg";
import { GlobalContext } from "../context/GlobalContext";

function AppHeader({ title = "Chronicon" }) {
  const { config } = useContext(GlobalContext);
  const src = config?.theme === "dark" ? logoWhite : logoFull;

  return (
    <header className="app-header">
      <img className="app-header__logo" src={src} alt="Chronicon Logo" />
      <h1 className="app-header__title">{title}</h1>
    </header>
  );
}

export default AppHeader;
