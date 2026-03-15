# Android Plan

## Estado actual

- La app web ya funciona en React + Vite y builda a `dist/`.
- Los datos se guardan localmente en IndexedDB.
- Ya quedó preparado el inicio de la integración con Capacitor:
  - `package.json` incluye `@capacitor/core`, `@capacitor/android` y `@capacitor/cli`
  - `capacitor.config.ts` apunta a `webDir: "dist"`
- Todavía no existe un `android/` nuevo generado desde el estado actual del proyecto.

## Objetivo

Empaquetar la app actual como aplicación Android usando Capacitor, sin arrastrar residuos de la configuración vieja.

## Plan

### 1. Cerrar la preparación de Capacitor

- Instalar dependencias:

```bash
npm install
```

- Verificar que estén disponibles:
  - `@capacitor/core`
  - `@capacitor/android`
  - `@capacitor/cli`

### 2. Generar Android limpio

- Crear el proyecto Android desde cero:

```bash
npx cap add android
```

- Confirmar que se genere:
  - `android/app`
  - `android/gradle`
  - `android/settings.gradle`
  - `android/app/src/main/AndroidManifest.xml`

### 3. Conectar el build web

- Generar la app web:

```bash
npm run build
```

- Sincronizar Capacitor con Android:

```bash
npx cap sync android
```

- Validar que `dist/` se copie correctamente dentro del proyecto Android.

### 4. Abrir y probar en Android Studio

- Abrir el proyecto:

```bash
npx cap open android
```

- Revisar en Android Studio:
  - `minSdk`
  - `targetSdk`
  - nombre/app id
  - íconos y splash
  - permisos

### 5. Validar comportamiento real en Android

- Probar:
  - arranque de la app
  - navegación entre vistas
  - persistencia local
  - creación/edición/eliminación de eventos
  - import/export
  - tema claro/oscuro
  - funcionamiento offline

- Verificar especialmente IndexedDB dentro del WebView de Android.

### 6. Ajustes específicos de Android

- Revisar si hace falta reemplazar o complementar IndexedDB con un plugin nativo en el futuro.
- Configurar ícono y nombre final de la app.
- Revisar comportamiento del botón atrás.
- Revisar apertura de archivos/importación desde Android si se quiere soportar flujo nativo.

### 7. Preparar release

- Definir versión inicial:
  - `versionCode`
  - `versionName`

- Generar build firmada desde Android Studio o Gradle.
- Probar APK/AAB en dispositivo real.

## Riesgos y puntos a revisar

- IndexedDB puede comportarse distinto en WebView según versión de Android.
- PWA y Capacitor pueden convivir, pero en Android empaquetado el runtime real es Capacitor, no la PWA del navegador.
- Importación/exportación puede requerir trabajo adicional si más adelante se quiere integración nativa con archivos del sistema.

## Secuencia recomendada

```bash
npm install
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

## Resultado esperado

- Proyecto `android/` nuevo y limpio
- App web actual embebida en Android vía Capacitor
- Base lista para pruebas reales y para decidir después si se agregan plugins nativos
