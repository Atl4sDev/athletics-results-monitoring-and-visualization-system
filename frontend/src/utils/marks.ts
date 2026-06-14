export function disciplineLabel(
  disciplineName: string | null | undefined,
  fallback = '—',
): string {
  return disciplineName || fallback
}
