import thaiBanksData from '@/data/thaiBanks.json';

export interface ThaiBank {
  key: string;
  code: string;
  color: string;
  officialName: string;
  thaiName: string;
  niceName: string;
}

const rawBanks = thaiBanksData.th as Record<
  string,
  { code: string; color: string; official_name: string; thai_name: string; nice_name: string }
>;

/** Flat array of all Thai banks, sorted alphabetically by nice_name. */
export const THAI_BANKS: ThaiBank[] = Object.entries(rawBanks)
  .map(([key, b]) => ({
    key,
    code: b.code,
    color: b.color,
    officialName: b.official_name,
    thaiName: b.thai_name,
    niceName: b.nice_name,
  }))
  .sort((a, b) => a.niceName.localeCompare(b.niceName));

/** Look up a bank by its key (e.g. "kbank"), nice_name, or partial match.
 *  Returns undefined if not found. */
export function findBank(query: string): ThaiBank | undefined {
  if (!query) return undefined;
  const q = query.trim().toLowerCase();
  return (
    THAI_BANKS.find((b) => b.key === q) ??
    THAI_BANKS.find((b) => b.niceName.toLowerCase() === q) ??
    THAI_BANKS.find(
      (b) =>
        b.niceName.toLowerCase().includes(q) ||
        b.thaiName.includes(query.trim()) ||
        b.key.includes(q),
    )
  );
}

/** Filter banks by a search query (matches key, niceName, thaiName). */
export function filterBanks(query: string): ThaiBank[] {
  if (!query.trim()) return THAI_BANKS;
  const q = query.trim().toLowerCase();
  return THAI_BANKS.filter(
    (b) =>
      b.key.includes(q) ||
      b.niceName.toLowerCase().includes(q) ||
      b.thaiName.includes(query.trim()) ||
      b.officialName.toLowerCase().includes(q),
  );
}
