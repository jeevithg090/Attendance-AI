import { useEffect } from 'react';

const APP_NAME = import.meta.env.VITE_APP_NAME || 'AttendAI';

/** Set `document.title` to "<title> · AttendAI" while the component is mounted. */
export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_NAME}` : `${APP_NAME} — Anti-Proxy Attendance`;
  }, [title]);
}
