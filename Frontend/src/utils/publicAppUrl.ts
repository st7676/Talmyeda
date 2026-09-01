/**
 * Shared by every "here's a link to share" screen (Settings' student/staff
 * join links, and the platform admin's institution-registration link):
 * these links must open in a regular browser (recipients won't install the
 * desktop app), so they can't be built from window.location when running
 * inside Electron (a file:// URL, not shareable). VITE_PUBLIC_APP_URL
 * should point at wherever this same frontend is also hosted as a plain
 * website; falls back to the current origin for the web/dev-server build.
 */
export function getPublicAppUrl(): string | null {
  const configured = import.meta.env.VITE_PUBLIC_APP_URL as string | undefined;
  if (configured) return configured.replace(/\/$/, '');
  if (window.location.protocol === 'file:') return null;
  return window.location.origin;
}
