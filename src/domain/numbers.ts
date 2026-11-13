/** Strict numeric parsing for user input. Never coerces invalid text to zero. */
export type ParsedNumber =
  | { kind: "blank" }
  | { kind: "number"; value: number }
  | { kind: "invalid"; raw: string };

const NUMBER_RE = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

export function parseNumberInput(raw: string | null | undefined): ParsedNumber {
  const s = (raw ?? "").trim();
  if (s === "") return { kind: "blank" };
  if (!NUMBER_RE.test(s)) return { kind: "invalid", raw: s };
  const value = Number(s);
  if (!Number.isFinite(value)) return { kind: "invalid", raw: s };
  return { kind: "number", value };
}

/** Numbers to a compact editable string (full precision, no trailing noise from toFixed). */
export function numberToInput(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "";
  return String(n);
}
