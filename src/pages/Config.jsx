import { useContext } from "react";
import { useTranslation } from "react-i18next";
import { GlobalContext } from "../context/GlobalContext";
import CustomSelect from "../components/CustomSelect";
import { DATE_FORMAT_OPTIONS, normalizeDateFormat } from "../utils/dateFormatter";

const THEME_OPTIONS = ["light", "dark"];

function Config() {
  const { config, updateConfig } = useContext(GlobalContext);
  const { t, i18n } = useTranslation();
  const dateOptions = DATE_FORMAT_OPTIONS.map((value) => ({ value, label: value }));
  const themeOptions = THEME_OPTIONS.map((value) => ({ value, label: t(`${value}Theme`) }));
  const languageOptions = [
    { value: "es", label: t("languageNameSpanish") },
    { value: "en", label: t("languageNameEnglish") },
  ];

  return (
    <section className="page-shell">
      <header className="page-title-block">
        <div>
          <h1>{t("configTitle")}</h1>
          <p>{t("configSubtitle")}</p>
        </div>
      </header>

      <div className="card-list">
        <article className="settings-card">
          <h3>{t("dateFormatLabel")}</h3>
          {t("dateFormatDescription") ? <p>{t("dateFormatDescription")}</p> : null}
          <CustomSelect
            label={t("dateFormatLabel")}
            value={normalizeDateFormat(config.dateFormat)}
            onChange={(nextValue) => updateConfig({ dateFormat: nextValue })}
            options={dateOptions}
          />
        </article>

        <article className="settings-card">
          <h3>{t("appearanceSectionTitle")}</h3>
          {t("appearanceDescription") ? <p>{t("appearanceDescription")}</p> : null}
          <CustomSelect
            label={t("themeLabel")}
            value={config.theme || "light"}
            onChange={(nextValue) => updateConfig({ theme: nextValue })}
            options={themeOptions}
          />
        </article>

        <article className="settings-card">
          <h3>{t("languageSectionTitle")}</h3>
          {t("languageDescription") ? <p>{t("languageDescription")}</p> : null}
          <CustomSelect
            label={t("languageLabel")}
            value={i18n.language}
            onChange={(nextValue) => {
              i18n.changeLanguage(nextValue);
              updateConfig({ language: nextValue });
            }}
            options={languageOptions}
          />
        </article>
      </div>
    </section>
  );
}

export default Config;
