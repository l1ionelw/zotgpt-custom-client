import { useEffect, useState } from "react";
import { zotFetch } from "../api.js";

const POLL_MS = 30000;

function formatResetIn(resetAt) {
  if (!resetAt) return null;
  const diffMs = new Date(resetAt).getTime() - Date.now();
  // `resetAt` comes back as a UTC ISO string (e.g. "...T21:09:56.168Z");
  // toLocaleString with no `timeZone` option already renders it in the
  // viewer's own system time zone, not the server's - timeZoneName makes
  // that explicit instead of leaving it ambiguous.
  const exact = new Date(resetAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
  if (diffMs <= 0) return `resets soon (${exact})`;
  const diffHours = Math.floor(diffMs / 3_600_000);
  if (diffHours < 1) {
    const diffMinutes = Math.max(1, Math.floor(diffMs / 60_000));
    return `resets in ${diffMinutes}m (${exact})`;
  }
  if (diffHours < 24) return `resets in ${diffHours}h (${exact})`;
  const diffDays = Math.floor(diffHours / 24);
  return `resets in ${diffDays}d (${exact})`;
}

export default function QuotaWidget() {
  const [quota, setQuota] = useState(null); // { costUsd, limitUsd, percentUsed, resetAt }
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  async function fetchQuota() {
    try {
      const res = await zotFetch("/api/quota");
      const data = await res.json();
      if (!res.ok) {
        setQuota(null);
        setError("error");
        return;
      }
      setQuota(data);
      setError(null);
    } catch {
      setQuota(null);
      setError("error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchQuota();
    const interval = setInterval(fetchQuota, POLL_MS);
    return () => clearInterval(interval);
  }, []);

  const percent = quota ? Math.min(100, Math.max(0, quota.percentUsed)) : 0;
  const barColor = percent >= 90 ? "bg-red-500" : percent >= 70 ? "bg-yellow-500" : "bg-green-500";

  return (
    <div className="w-full shrink-0 rounded border border-neutral-700 bg-neutral-900/95 px-3 py-2 text-xs text-neutral-300 shadow-lg font-mono">
      <div className="flex items-center justify-between mb-1">
        <span className="font-bold text-neutral-400">quota</span>
        {loading && !quota && <span className="text-neutral-500">loading...</span>}
        {error && <span className="text-red-400">{error}</span>}
      </div>

      {quota && (
        <>
          <div className="w-full h-1.5 rounded bg-neutral-800 overflow-hidden mb-1">
            <div
              className={`h-full ${barColor} transition-all duration-500`}
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-neutral-400">
            <span>
              ${quota.costUsd.toFixed(2)} / ${quota.limitUsd}
            </span>
            <span>{percent.toFixed(0)}%</span>
          </div>
          <div className="text-neutral-500">{formatResetIn(quota.resetAt)}</div>
        </>
      )}
    </div>
  );
}
