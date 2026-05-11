"use client";

import { useState, useEffect, useCallback } from "react";
import clsx from "clsx";
import type { EpgProgram } from "@/types";

interface EpgOverlayProps {
  programs: EpgProgram[];
  channelName?: string;
  channelLogo?: string;
  isVisible: boolean;
  channelNumber?: number;
  streamQuality?: string; // "HD" | "FHD" | "4K" | "SD" | "UHD"
  audioInfo?: string;     // e.g. "Deutsch", "AC3", "AAC"
  onToggle?: () => void;  // user tapped the overlay
}

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtTime(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

function fmtDuration(startStr: string, endStr: string) {
  try {
    const mins = Math.round((new Date(endStr).getTime() - new Date(startStr).getTime()) / 60000);
    if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}min`;
    return `${mins} min`;
  } catch { return ""; }
}

function getProgress(startStr: string, endStr: string) {
  try {
    const start = new Date(startStr).getTime();
    const end = new Date(endStr).getTime();
    const now = Date.now();
    return Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
  } catch { return 0; }
}

function getTimeLeft(endStr: string) {
  try {
    const left = Math.max(0, Math.round((new Date(endStr).getTime() - Date.now()) / 60000));
    if (left === 0) return "Gleich";
    if (left < 60) return `${left} min übrig`;
    return `${Math.floor(left / 60)}h ${left % 60}min übrig`;
  } catch { return ""; }
}

/** Derive quality from channel name or URL */
export function deriveQuality(name?: string, url?: string): string {
  const haystack = ((name || "") + " " + (url || "")).toUpperCase();
  if (/\b(4K|UHD|2160)\b/.test(haystack)) return "4K";
  if (/\b(FHD|1080)\b/.test(haystack)) return "FHD";
  if (/\b(HD|720)\b/.test(haystack)) return "HD";
  if (/\b(SD|480|360|240)\b/.test(haystack)) return "SD";
  return "HD"; // assume HD if unknown
}

// ── Quality badge ─────────────────────────────────────────────────────────────

function QualityBadge({ quality }: { quality: string }) {
  const colorMap: Record<string, string> = {
    "4K":  "bg-purple-600/90 text-purple-100 border-purple-500/60",
    "UHD": "bg-purple-600/90 text-purple-100 border-purple-500/60",
    "FHD": "bg-blue-600/90   text-blue-100   border-blue-500/60",
    "HD":  "bg-green-700/90  text-green-100  border-green-600/60",
    "SD":  "bg-gray-600/90   text-gray-200   border-gray-500/60",
  };
  return (
    <div className={clsx(
      "flex-shrink-0 px-3 py-1 rounded-lg border text-sm font-black tracking-widest",
      colorMap[quality] ?? colorMap["HD"]
    )}>
      {quality}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function EpgOverlay({
  programs,
  channelName,
  channelLogo,
  isVisible,
  channelNumber,
  streamQuality,
  audioInfo,
  onToggle,
}: EpgOverlayProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tick, setTick] = useState(0);

  // Update progress every 10s
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 10000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  if (!isVisible) return null;
  if (!channelName && programs.length === 0) return null;

  const now = Date.now();

  // Find current & next programs
  const current = programs.find((p) => {
    const s = p.startTimestamp ?? new Date(p.start).getTime();
    const e = p.endTimestamp   ?? new Date(p.end).getTime();
    return now >= s && now < e;
  });
  const upcoming = programs
    .filter((p) => {
      const s = p.startTimestamp ?? new Date(p.start).getTime();
      return s > now;
    })
    .sort((a, b) => {
      const sa = a.startTimestamp ?? new Date(a.start).getTime();
      const sb = b.startTimestamp ?? new Date(b.start).getTime();
      return sa - sb;
    })
    .slice(0, 2);

  const quality = streamQuality || deriveQuality(channelName);
  const progress = current ? getProgress(current.start, current.end) : 0;

  return (
    <div
      className={clsx(
        "absolute z-[100] left-0 right-0 pointer-events-auto",
        "bottom-0"
      )}
      onClick={onToggle}
    >
      {/* Gradient bg — tall enough to always be readable */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/90 to-transparent pointer-events-none" style={{ minHeight: 180 }} />

      <div className={clsx(
        "relative mx-auto",
        isFullscreen ? "max-w-6xl px-12 pb-10" : "px-5 pb-7"
      )}>

        {/* ── Row 1: Channel identity + meta badges ──────────────────────────── */}
        <div className="flex items-center gap-4 mb-4">
          {/* Channel number */}
          {channelNumber !== undefined && channelNumber > 0 && (
            <div className="flex-shrink-0 h-12 min-w-[3rem] flex items-center justify-center rounded-xl bg-white/15 border border-white/20 px-3">
              <span className={clsx("font-black text-white tabular-nums leading-none", isFullscreen ? "text-2xl" : "text-lg")}>{channelNumber}</span>
            </div>
          )}

          {/* Logo */}
          {channelLogo && (
            <div className="flex-shrink-0 h-12 w-20 rounded-xl overflow-hidden bg-white/10 flex items-center justify-center p-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={channelLogo} alt="" className="h-full w-full object-contain" />
            </div>
          )}

          {/* Channel name */}
          {channelName && (
            <p className={clsx(
              "text-white font-black flex-1 truncate leading-none drop-shadow-lg",
              isFullscreen ? "text-4xl" : "text-3xl"
            )}>
              {channelName}
            </p>
          )}

          {/* Right badges */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <QualityBadge quality={quality} />
            {audioInfo && (
              <div className="flex-shrink-0 px-2.5 py-1 rounded-lg border border-white/20 bg-white/10 text-xs font-bold text-gray-200 tracking-wider">
                {audioInfo}
              </div>
            )}
            {/* LIVE pulse */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-600/40 border border-red-500/50">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-black text-red-300 tracking-widest">LIVE</span>
            </div>
          </div>
        </div>

        {/* ── Row 2: Current program ─────────────────────────────────────────── */}
        {current ? (
          <div className="mb-3">
            <div className="flex items-baseline justify-between mb-2 gap-4">
              <p className={clsx(
                "font-bold text-white truncate drop-shadow",
                isFullscreen ? "text-3xl" : "text-xl"
              )}>
                {current.title}
              </p>
              <div className="flex items-center gap-2.5 flex-shrink-0">
                <span className={clsx("text-gray-200 tabular-nums font-semibold", isFullscreen ? "text-lg" : "text-base")}>
                  {fmtTime(current.start)} – {fmtTime(current.end)}
                </span>
                <span className="text-xs text-purple-300 font-semibold bg-purple-500/20 border border-purple-500/40 px-2 py-0.5 rounded-lg">
                  {fmtDuration(current.start, current.end)}
                </span>
              </div>
            </div>

            {current.description && isFullscreen && (
              <p className="text-sm text-gray-400 line-clamp-2 mb-3 leading-relaxed">
                {current.description}
              </p>
            )}

            {/* Progress bar */}
            <div className="relative h-2 rounded-full bg-white/15 overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-1000"
                style={{ width: `${progress}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-white shadow-lg border-2 border-purple-400 -translate-x-1/2 transition-all duration-1000"
                style={{ left: `${progress}%` }}
              />
            </div>

            <div className="flex justify-between mt-2">
              <span className="text-sm text-gray-400 tabular-nums font-medium">{fmtTime(current.start)}</span>
              <span className="text-sm text-purple-300 font-bold">{getTimeLeft(current.end)}</span>
              <span className="text-sm text-gray-400 tabular-nums font-medium">{fmtTime(current.end)}</span>
            </div>
          </div>
        ) : programs.length === 0 && (
          <div className="mb-3">
            <p className={clsx("text-gray-400 italic", isFullscreen ? "text-base" : "text-sm")}>Keine EPG-Daten verfügbar</p>
          </div>
        )}

        {/* ── Row 3: Upcoming programs ───────────────────────────────────────── */}
        {upcoming.length > 0 && (
          <div className="border-t border-white/10 pt-3 space-y-2">
            {upcoming.map((prog, i) => (
              <div key={prog.id || i} className="flex items-center gap-3">
                <span className={clsx(
                  "text-sm font-black uppercase tracking-wider flex-shrink-0 w-20",
                  i === 0 ? "text-amber-400" : "text-gray-600"
                )}>
                  {i === 0 ? "Danach" : "Dann"}
                </span>
                <span className={clsx(
                  "flex-1 truncate font-semibold",
                  i === 0 ? "text-base text-gray-200" : "text-sm text-gray-500"
                )}>
                  {prog.title}
                </span>
                <span className={clsx(
                  "flex-shrink-0 tabular-nums font-bold",
                  i === 0 ? "text-base text-gray-300" : "text-sm text-gray-600"
                )}>
                  {fmtTime(prog.start)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
