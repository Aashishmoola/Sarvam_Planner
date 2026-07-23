"use client";

import { useState } from "react";
import type { NonProductiveRow } from "./types";

export function NonProductiveSection({
  goals,
  readOnly,
  onUpsert,
  onResolve,
  pending,
}: {
  goals: NonProductiveRow[];
  readOnly: boolean;
  onUpsert: (position: number, title: string) => void;
  onResolve: (id: string, action: "check" | "cross") => void;
  pending: boolean;
}) {
  const [titles, setTitles] = useState<Record<number, string>>(() => {
    const map: Record<number, string> = {};
    for (const g of goals) map[g.position] = g.title;
    return map;
  });

  const rowByPos = (pos: number) => goals.find((g) => g.position === pos);

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-xs uppercase tracking-widest text-gray-fade">
        Enjoyment goals
      </h2>
      <div className="space-y-3">
        {[0, 1, 2].map((pos) => {
          const row = rowByPos(pos);
          const value = titles[pos] ?? "";
          const resolved = row && row.status !== "pending";

          if (readOnly) {
            return (
              <div
                key={pos}
                className="flex items-center justify-between border border-gray-soft px-4 py-3"
              >
                <span className="text-sm text-blue-50">
                  {value || <span className="text-gray-mid">—</span>}
                </span>
                {resolved && (
                  <span className="text-xs text-gray-fade">
                    {row!.status === "checked" ? "done" : "missed"}
                  </span>
                )}
              </div>
            );
          }

          return (
            <div
              key={pos}
              className={`border px-4 py-3 ${
                row?.status === "checked"
                  ? "border-blue-400/40 bg-blue-400/10"
                  : row?.status === "crossed"
                    ? "border-blue-300/40"
                    : "border-gray-soft"
              }`}
            >
              <input
                value={value}
                onChange={(e) =>
                  setTitles((t) => ({ ...t, [pos]: e.target.value }))
                }
                onBlur={() => value.trim() !== "" && onUpsert(pos, value.trim())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                placeholder={`Enjoyment goal ${pos + 1}`}
                className="block w-full rounded-none border-none bg-transparent px-0 py-1 text-sm text-blue-50 outline-none focus:border-blue-400"
              />
              {row && row.status === "pending" && value.trim() !== "" && (
                <div className="mt-2 flex gap-4">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => onResolve(row.id, "check")}
                    className="tap-target text-xs uppercase tracking-wider text-gray-fade hover:text-blue-200 disabled:opacity-40"
                  >
                    ✓ Done
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => onResolve(row.id, "cross")}
                    className="tap-target text-xs uppercase tracking-wider text-gray-fade hover:text-blue-200 disabled:opacity-40"
                  >
                    ✗ Missed
                  </button>
                </div>
              )}
              {resolved && (
                <span className="mt-1 block text-xs text-gray-fade">
                  {row!.status === "checked" ? "done" : "missed"}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
