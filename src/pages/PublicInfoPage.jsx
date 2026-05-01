import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Wordmark from "../components/Wordmark";

const CONTENT = {
  es: {
    privacy: {
      title: "Política de Privacidad",
      lead:
        "Chronicon está diseñada para ayudarte a registrar eventos personales y consultar su historial desde tu propio dispositivo.",
      sections: [
        {
          heading: "Resumen",
          body: [
            "La app no requiere crear una cuenta para funcionar.",
            "La información de tus eventos se guarda localmente en el dispositivo o en el navegador donde usas la app.",
            "La app no vende tus datos personales ni los comparte con terceros con fines comerciales."
          ]
        },
        {
          heading: "Datos que procesa la app",
          body: [
            "Chronicon permite guardar nombres de eventos, fechas, descripciones, etiquetas, colores y datos relacionados con recurrencias.",
            "Si eliges importar o exportar archivos JSON o ICS, esos archivos se procesan únicamente para completar la acción solicitada por vos."
          ]
        },
        {
          heading: "Cómo se almacenan los datos",
          body: [
            "Por defecto, la información se almacena localmente en tu dispositivo.",
            "No usamos una cuenta centralizada ni una base de datos remota propia para registrar tus eventos personales."
          ]
        },
        {
          heading: "Conectividad y enlaces externos",
          body: [
            "La app puede acceder a internet cuando importas contenido desde una URL pública o cuando el entorno web necesita cargar recursos del despliegue.",
            "Fuera de esos casos, Chronicon está pensada para funcionar principalmente con datos controlados por el usuario."
          ]
        },
        {
          heading: "Tus controles",
          body: [
            "Podés editar o eliminar tus eventos en cualquier momento.",
            "También podés exportar tus datos o borrar la información local desinstalando la app o limpiando el almacenamiento correspondiente."
          ]
        },
        {
          heading: "Menores de edad",
          body: [
            "Chronicon no está dirigida específicamente a menores de 13 años y no busca recopilar intencionalmente datos personales de niños."
          ]
        },
        {
          heading: "Cambios a esta política",
          body: [
            "Esta política puede actualizarse si cambia el funcionamiento de la app o si se agregan nuevas funciones que impliquen tratamiento de datos."
          ]
        }
      ]
    },
    terms: {
      title: "Términos de Uso",
      lead:
        "Estos términos regulan el uso de Chronicon como herramienta personal de registro y seguimiento de eventos.",
      sections: [
        {
          heading: "Uso permitido",
          body: [
            "Podés usar Chronicon para registrar, consultar, importar y exportar eventos personales o de trabajo.",
            "No debés usar la app para actividades ilegales, abusivas o que afecten la disponibilidad del servicio o del despliegue web."
          ]
        },
        {
          heading: "Disponibilidad",
          body: [
            "La app se ofrece tal como está.",
            "Aunque se intenta mantener un funcionamiento estable, no se garantiza disponibilidad continua ni ausencia total de errores."
          ]
        },
        {
          heading: "Responsabilidad sobre los datos",
          body: [
            "Sos responsable del contenido que cargás en la app y de conservar copias de seguridad si tus datos son importantes.",
            "Se recomienda exportar la información periódicamente antes de reinstalar la app o cambiar de dispositivo."
          ]
        },
        {
          heading: "Propiedad intelectual",
          body: [
            "La marca, diseño, código y materiales de Chronicon pertenecen a su autor o a sus respectivos titulares.",
            "No se concede ningún derecho de uso comercial de la marca salvo autorización expresa."
          ]
        },
        {
          heading: "Cambios",
          body: [
            "Estos términos pueden modificarse con futuras versiones de la app o del sitio web."
          ]
        }
      ]
    },
    support: {
      title: "Soporte",
      lead:
        "Si necesitas ayuda con Chronicon, esta página resume el alcance del soporte y la información útil para resolver problemas comunes.",
      sections: [
        {
          heading: "Problemas habituales",
          body: [
            "Verifica primero que estés usando la versión más reciente publicada.",
            "Si una importación falla, revisa el formato del archivo JSON o ICS, o la disponibilidad de la URL usada para importar.",
            "Si cambias de dispositivo, exporta tus datos antes de migrar o reinstalar la app."
          ]
        },
        {
          heading: "Información útil al reportar un problema",
          body: [
            "Versión de la app.",
            "Modelo de dispositivo y versión de Android.",
            "Descripción clara del problema y pasos para reproducirlo."
          ]
        },
        {
          heading: "Alcance del soporte",
          body: [
            "Se ofrece soporte razonable para errores reproducibles y problemas funcionales reportados por usuarios.",
            "Las solicitudes de nuevas funciones o cambios de producto pueden evaluarse, pero no se garantiza su implementación."
          ]
        },
        {
          heading: "Contacto",
          body: [
            "Usa el mismo canal de contacto publicado en la ficha de Play Console para consultas de soporte o privacidad."
          ]
        }
      ]
    },
    nav: {
      privacy: "Privacidad",
      terms: "Términos",
      support: "Soporte",
      home: "Volver a la app"
    },
    updated: "Última actualización: 11 de abril de 2026"
  },
  en: {
    privacy: {
      title: "Privacy Policy",
      lead:
        "Chronicon is designed to help you record personal events and review their history directly on your own device.",
      sections: [
        {
          heading: "Summary",
          body: [
            "The app does not require an account to work.",
            "Your event information is stored locally on the device or browser where you use the app.",
            "The app does not sell personal data or share it with third parties for commercial purposes."
          ]
        },
        {
          heading: "Data handled by the app",
          body: [
            "Chronicon lets you store event names, dates, descriptions, tags, colors, and recurrence-related data.",
            "If you choose to import or export JSON or ICS files, those files are processed only to complete the action requested by you."
          ]
        },
        {
          heading: "How data is stored",
          body: [
            "By default, information is stored locally on your device.",
            "We do not use a centralized account system or our own remote database to store your personal events."
          ]
        },
        {
          heading: "Connectivity and external links",
          body: [
            "The app may access the internet when you import content from a public URL or when the web deployment needs to load hosted resources.",
            "Outside those cases, Chronicon is intended to work mainly with user-controlled data."
          ]
        },
        {
          heading: "Your controls",
          body: [
            "You can edit or delete your events at any time.",
            "You can also export your data or remove local information by uninstalling the app or clearing the relevant storage."
          ]
        },
        {
          heading: "Children",
          body: [
            "Chronicon is not specifically directed to children under 13 and is not intended to knowingly collect personal data from children."
          ]
        },
        {
          heading: "Changes to this policy",
          body: [
            "This policy may be updated if the app changes or if new features affect how data is handled."
          ]
        }
      ]
    },
    terms: {
      title: "Terms of Use",
      lead:
        "These terms govern the use of Chronicon as a personal tool for recording and tracking events.",
      sections: [
        {
          heading: "Permitted use",
          body: [
            "You may use Chronicon to record, review, import, and export personal or work-related events.",
            "You must not use the app for unlawful, abusive, or disruptive activities affecting the app or its web deployment."
          ]
        },
        {
          heading: "Availability",
          body: [
            "The app is provided as is.",
            "While reasonable effort is made to keep it working reliably, continuous availability and complete absence of errors are not guaranteed."
          ]
        },
        {
          heading: "Responsibility for your data",
          body: [
            "You are responsible for the content you store in the app and for keeping backups if your data is important.",
            "Exporting your data periodically is recommended before reinstalling the app or switching devices."
          ]
        },
        {
          heading: "Intellectual property",
          body: [
            "The Chronicon brand, design, code, and materials belong to their author or respective rights holders.",
            "No commercial trademark rights are granted without explicit permission."
          ]
        },
        {
          heading: "Changes",
          body: [
            "These terms may change in future versions of the app or website."
          ]
        }
      ]
    },
    support: {
      title: "Support",
      lead:
        "If you need help with Chronicon, this page summarizes support scope and the most useful information to include when reporting an issue.",
      sections: [
        {
          heading: "Common issues",
          body: [
            "First confirm that you are using the latest published version.",
            "If an import fails, review the JSON or ICS file format, or verify the availability of the URL used for import.",
            "If you move to a new device, export your data before migrating or reinstalling the app."
          ]
        },
        {
          heading: "Useful information when reporting a problem",
          body: [
            "App version.",
            "Device model and Android version.",
            "Clear description of the issue and exact steps to reproduce it."
          ]
        },
        {
          heading: "Support scope",
          body: [
            "Reasonable support is provided for reproducible bugs and functional issues reported by users.",
            "Feature requests or product changes may be considered, but implementation is not guaranteed."
          ]
        },
        {
          heading: "Contact",
          body: [
            "Use the same contact channel published in the Play Console listing for support or privacy questions."
          ]
        }
      ]
    },
    nav: {
      privacy: "Privacy",
      terms: "Terms",
      support: "Support",
      home: "Back to app"
    },
    updated: "Last updated: April 11, 2026"
  }
};

function PublicInfoPage({ page }) {
  const { i18n } = useTranslation();
  const language = i18n.language?.startsWith("es") ? "es" : "en";
  const copy = CONTENT[language];
  const documentContent = copy[page];

  useEffect(() => {
    document.title = `Chronicon | ${documentContent.title}`;
    return () => {
      document.title = "Chronicon";
    };
  }, [documentContent.title]);

  return (
    <main className="public-page">
      <div className="public-page__backdrop" />
      <div className="public-page__container">
        <header className="public-page__header">
          <Link className="public-page__brand" to="/">
            <Wordmark />
          </Link>
          <nav className="public-page__nav" aria-label="Public pages">
            <Link to="/privacy">{copy.nav.privacy}</Link>
            <Link to="/terms">{copy.nav.terms}</Link>
            <Link to="/support">{copy.nav.support}</Link>
          </nav>
        </header>

        <article className="public-page__article">
          <p className="public-page__eyebrow">{copy.updated}</p>
          <h1>{documentContent.title}</h1>
          <p className="public-page__lead">{documentContent.lead}</p>

          {documentContent.sections.map((section) => (
            <section key={section.heading} className="public-page__section">
              <h2>{section.heading}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </section>
          ))}
        </article>

        <footer className="public-page__footer">
          <Link to="/">{copy.nav.home}</Link>
        </footer>
      </div>
    </main>
  );
}

export default PublicInfoPage;
