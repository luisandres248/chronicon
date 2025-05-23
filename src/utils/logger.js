const logger = {
  log: (...args) => {
    if (import.meta.env.MODE === 'development') {
      console.log(...args);
    }
  },
  warn: (...args) => {
    if (import.meta.env.MODE === 'development') {
      console.warn(...args);
    }
  },
  error: (...args) => {
    if (import.meta.env.MODE === 'development') {
      console.error(...args);
    }
  },
  info: (...args) => {
    if (import.meta.env.MODE === 'development') {
      console.info(...args);
    }
  },
  debug: (...args) => {
    if (import.meta.env.MODE === 'development') {
      console.debug(...args);
    }
  },
};

export default logger;
