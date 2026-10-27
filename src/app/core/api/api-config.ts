export const API_BASE_URL = 'https://dismantle-drop-down-scowling.ngrok-free.dev';

export function apiUrl(path: string): string {
  return `${API_BASE_URL}/api/${path.replace(/^\/+/, '')}`;
}
