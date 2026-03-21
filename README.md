# Chronicon

Chronicon es una aplicación para registrar eventos repetidos o puntuales y ver su historial de forma simple. 
El objetivo es poder cargar eventos, y sus recurrencias en caso que corresponda, y poder ver facilmente cantidad de dias que han pasado desde la primera o ultima ocurrencia. o promedio de dias entre ocurrencias.
Se incluye una visualización de los dias pasados en forma de una grilla con un cuadrado representando cada día.
La app está pensada como una interfaz mobile-first, funciona offline y guarda todo localmente en el navegador.

## Tecnologías

- React 18
- Vite
- React Router
- `date-fns`
- `i18next`
- IndexedDB
- `vite-plugin-pwa`
- Capacitor Android

## Funcionalidad

- Crear, editar y eliminar eventos
- Registrar ocurrencias adicionales de un evento
- Agrupar ocurrencias en series
- Ver detalle de cada evento con métricas y grilla temporal
- Asignar color, descripción y etiquetas
- Importar y exportar historial en JSON o ICS
- Configurar idioma, tema y formato de fecha
- Soporte offline y base PWA

## Android

La app incluye un shell nativo de Android con Capacitor en `android/`. La lógica del producto sigue en la app web de `src/`, y Android empaqueta la build generada en `dist/`.

Comandos útiles:

```bash
npm run build:native
npm run android:sync
npm run android:run
```

Los assets de launcher y splash usados por Android están versionados en `assets/` y sus PNG generados en `android/app/src/main/res/`.

Para mantener el repo público sin exponer credenciales, no se versionan archivos locales o sensibles como `android/local.properties`, `google-services.json` ni keystores de firma.

## Estructura general

- `src/context/GlobalContext.jsx`: estado global, configuración y persistencia
- `src/services/localDb.js`: acceso a IndexedDB
- `src/services/eventService.js`: transformación y derivación de eventos
- `src/services/importExportService.js`: importación y exportación JSON/ICS
- `src/components/EventsGrid.jsx`: vista principal
- `src/components/EventCalendar.jsx`: vista de detalle del evento
- `src/pages/ImportEventsPage.jsx`: importación y exportación
- `src/pages/Config.jsx`: configuración

## Correr el proyecto

```bash
npm install
npm run dev
```

Otros comandos:

```bash
npm run build
npm run preview
```
