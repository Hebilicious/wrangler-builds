export const normalizeList = <T>(value: unknown): T[] =>
  Array.isArray(value)
    ? (value as T[])
    : Array.isArray((value as { items?: unknown[] } | null | undefined)?.items)
      ? ((value as { items: unknown[] }).items as unknown[] as T[])
      : value
        ? [value as T]
        : [];

export const normalizeStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

export const arraysEqual = (left: string[], right: string[]): boolean =>
  left.length === right.length && left.every((value, index) => value === right[index]);

export const sortStrings = (values: string[]): string[] =>
  [...values].sort((left, right) => left.localeCompare(right));
