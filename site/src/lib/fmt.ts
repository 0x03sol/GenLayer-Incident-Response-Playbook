export function shortAddress(addr: string): string {
  if (!addr || !addr.startsWith("0x") || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function shortHash(hash: string): string {
  if (!hash || hash.length < 18) return hash;
  return `${hash.slice(0, 10)}…${hash.slice(-8)}`;
}

export function moduleNumber(id: number): string {
  return `M.${String(id).padStart(2, "0")}`;
}

export function addressFromExplorerUrl(url: string): string {
  const m = url.match(/\/address\/(0x[a-fA-F0-9]+)/);
  return m ? m[1] : "";
}

export function txHashFromExplorerUrl(url: string): string {
  const m = url.match(/\/tx\/(0x[a-fA-F0-9]+)/);
  return m ? m[1] : "";
}

/**
 * Format a unix-seconds timestamp as `YYYY-MM-DD HH:MM UTC`.
 * Editorial date format -- the same shape security advisories print.
 * Build-time-rendered, so the value is fixed at deploy.
 */
export function formatTimestampUTC(unixSec: number): string {
  if (!unixSec) return "";
  const d = new Date(unixSec * 1000);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi} UTC`;
}
