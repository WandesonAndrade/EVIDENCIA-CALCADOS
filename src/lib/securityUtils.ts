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

  // Check for dangerous dangerous URI schemes (javascript:, data:, vbscript:)
  if (/^(javascript|data|vbscript):/i.test(trimmed)) {
    console.warn("⚠️ [Security Shield] Dangerous URI scheme blocked:", trimmed);
    return '#';
  }

  return trimmed;
}
