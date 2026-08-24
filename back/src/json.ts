// Helpers for JSON columns stored as TEXT (SQLite has no native array/JSON type).

export function parseStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v as string[];
  if (typeof v === "string") {
    try {
      const p = JSON.parse(v);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return [];
}

export interface LeadItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export function parseItems(v: unknown): LeadItem[] | null {
  if (Array.isArray(v)) return v as LeadItem[];
  if (typeof v === "string") {
    try {
      const p = JSON.parse(v);
      return Array.isArray(p) ? (p as LeadItem[]) : null;
    } catch {
      return null;
    }
  }
  return null;
}
