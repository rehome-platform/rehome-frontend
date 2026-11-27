const UUID_CORE =
  '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';

const UUID_DISPLAY_REGEX = new RegExp(
  `(?:\\s*\\(\\s*#?${UUID_CORE}\\s*\\)|\\s*\\[\\s*#?${UUID_CORE}\\s*\\]|\\s*[·•|\\-–—:]\\s*#?${UUID_CORE}|(?:\\s+#|\\b)${UUID_CORE}\\b)`,
  'g'
);

const TRAILING_TRUNCATED_UUID_REGEX =
  /\s*[·•|\-–—:]\s*#?[0-9a-fA-F]{8}-[0-9a-fA-F-]*(?:\.{2,3}|…)\s*$/g;

/**
 * Strips raw UUID suffixes/tokens from notification text for cleaner UI display
 * without modifying underlying notification identifiers or routing metadata.
 */
export function formatNotificationDisplayText(value) {
  if (value == null) return '';
  const raw = String(value);
  const stripped = raw
    .replace(UUID_DISPLAY_REGEX, '')
    .replace(TRAILING_TRUNCATED_UUID_REGEX, '');
  if (stripped === raw) {
    return raw;
  }
  return stripped
    .replace(/\s+([,:.;!?])/g, '$1')
    .replace(/^\s*[·•|\-–—:]\s*/, '')
    .replace(/\s*[·•|\-–—:]\s*$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
