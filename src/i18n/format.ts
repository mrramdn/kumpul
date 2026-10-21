/** format("Sisa {count} kursi", { count: 3 }) -> "Sisa 3 kursi" */
export function format(template: string, values: Record<string, string | number> = {}) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}
