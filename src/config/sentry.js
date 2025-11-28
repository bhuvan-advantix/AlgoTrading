import * as Sentry from "@sentry/react";

export const initSentry = () => {
  if (process.env.NODE_ENV === 'production') {
    Sentry.init({
      dsn: "your-sentry-dsn",
      integrations: [
        new Sentry.BrowserTracing(),
      ],
      tracesSampleRate: 1.0,
      beforeSend(event) {
        // Don't send events in development
        if (process.env.NODE_ENV !== 'production') {
          return null;
        }
        return event;
      },
    });
  }
};