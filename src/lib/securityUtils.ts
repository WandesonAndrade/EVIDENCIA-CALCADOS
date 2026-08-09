/**
 * Security Utility Functions for Input & Link Sanitization
 */

/**
 * Sanitizes URLs to prevent Cross-Site Scripting (XSS) via URI schemes like `javascript:` or `data:`
 * @param url The input URL string from user or database
 * @returns A safe URL string or '#' if malicious scheme detected
 */
export function sanitizeUrl(url?: string): string {
  if (!url) return '#';
  const trimmed = url.trim();

  // Check for dangerous URI schemes (javascript:, data:, vbscript:)
  if (/^(javascript|data|vbscript):/i.test(trimmed)) {
    console.warn('⚠️ [Security Shield] Dangerous URI scheme blocked:', trimmed);
    return '#';
  }

  return trimmed;
}

/**
 * Removes all legacy Sincom/Moblink auth keys from localStorage.
 * Call once at app startup to ensure no stale/expired tokens are used.
 */
export function purgeLegacyAuthKeys(): void {
  const legacyKeys = [
    'evidencia_sincom_auth_token',
    'evidencia_sincom_auth_session',
    'evidencia_moblink_config',
    'evidencia_moblink_logs',
  ];

  legacyKeys.forEach((key) => {
    if (localStorage.getItem(key) !== null) {
      localStorage.removeItem(key);
      console.info(`[Security] Chave legada removida do localStorage: "${key}"`);
    }
  });
}
