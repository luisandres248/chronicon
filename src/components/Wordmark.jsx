import React from "react";
import { useContext } from "react";
import logoFull from "../../assets/chronicon_logo_full.svg";
import logoWhite from "../../assets/chronicon_logo_white.svg";
import { GlobalContext } from "../context/GlobalContext";

function Wordmark({ compact = false, inverted = false, showName = !compact }) {
  const { config } = useContext(GlobalContext);
  const shouldInvert = inverted || config?.theme === "dark";
  const src = shouldInvert ? logoWhite : logoFull;
  const className = `wordmark ${compact ? "wordmark--compact" : ""} ${shouldInvert ? "wordmark--inverted" : ""}`;

  return (
    <div className={className}>
      <img className={`brandmark ${compact ? "brandmark--compact" : ""}`} src={src} alt="Chronicon" />
      {showName ? <span className="wordmark__title">Chronicon</span> : null}
    </div>
  );
}

export default Wordmark;
