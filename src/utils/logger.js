const LOG_LEVELS = {
  NONE: 0,
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  DEBUG: 4,
};

const getLogLevel = () => {
  // Priority: Manual override > sessionStorage > environment default
  const manualOverride = window.CHRONICON_LOG_LEVEL;
  if (manualOverride && LOG_LEVELS[manualOverride.toUpperCase()] !== undefined) {
    return LOG_LEVELS[manualOverride.toUpperCase()];
  }

  const storedLevel = sessionStorage.getItem('chronicon_log_level');
  if (storedLevel && LOG_LEVELS[storedLevel.toUpperCase()] !== undefined) {
    return LOG_LEVELS[storedLevel.toUpperCase()];
  }

  // Vite provides import.meta.env.DEV
  return import.meta.env.DEV ? LOG_LEVELS.DEBUG : LOG_LEVELS.ERROR;
};

let currentLogLevel = getLogLevel();

const log = (level, ...args) => {
  if (currentLogLevel >= level) {
    const prefix = Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === level);
    console.log(`[${prefix}]`, ...args);
  }
};

const logger = {
  debug: (...args) => log(LOG_LEVELS.DEBUG, ...args),
  info: (...args) => log(LOG_LEVELS.INFO, ...args),
  warn: (...args) => log(LOG_LEVELS.WARN, ...args),
  error: (...args) => {
    if (currentLogLevel >= LOG_LEVELS.ERROR) {
      console.error('[ERROR]', ...args);
    }
  },
};

// Expose a global function to change the log level manually from the console
window.setLogLevel = (levelName) => {
  const newLevel = levelName.toUpperCase();
  if (LOG_LEVELS[newLevel] !== undefined) {
    currentLogLevel = LOG_LEVELS[newLevel];
    sessionStorage.setItem('chronicon_log_level', newLevel);
    console.log(`Log level set to ${newLevel}`);
  } else {
    console.warn(`Invalid log level. Use one of: ${Object.keys(LOG_LEVELS).join(', ')}`);
  }
};

export default logger;
