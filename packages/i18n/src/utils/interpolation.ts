/**
 * String interpolation utility
 * Replaces {key} patterns with values from params object
 *
 * Example:
 *   interpolate("Hello {name}", { name: "World" }) => "Hello World"
 *   interpolate("Sent to {count}/{total}", { count: 1, total: 5 }) => "Sent to 1/5"
 */
export function interpolate(
  template: string,
  params?: Record<string, string | number>
): string {
  if (!params) return template;

  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = params[key];
    return value !== undefined ? String(value) : match;
  });
}

/**
 * Pluralization helper (simple version)
 * More sophisticated pluralization can be added if needed
 */
export function pluralize(
  count: number,
  singular: string,
  plural: string
): string {
  return count === 1 ? singular : plural;
}
