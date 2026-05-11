"use client";

import { useState, useEffect, useRef, useCallback } from "react";

import clsx from "clsx";
import {
  HiPlay, HiPlus, HiStar, HiOutlineStar,
  HiChevronRight, HiChevronLeft, HiFilm, HiSparkles,
  HiClock, HiArrowPath, HiTv, HiMagnifyingGlass,
  HiTableCells, HiSignal, HiRectangleStack,
} from "react-icons/hi2";
import { useAuthStore, useFavoritesStore, useRecentStore, usePlayerStore, useSettingsStore } from "@/lib/store";
import { nav } from "@/lib/navigate";
import { fixImageUrl as proxyImg } from "@/lib/api-client";

// ── Nav Cards Data ─────────────────────────────────────────────────────────────
const NAV_CARDS = [
  {
    href: "/favorites",
    label: "Favoriten",
    desc: "Deine gespeicherten Sender & Inhalte",
    icon: <HiStar className="h-7 w-7" />,
    gradient: "from-yellow-500/20 via-amber-500/10 to-transparent",
    border: "border-yellow-500/30",
    iconColor: "text-yellow-400",
    accent: "bg-yellow-500",
    priority: true,
  },
  {
    href: "/live",
    label: "Live TV",
    desc: "Hunderte Sender in Echtzeit",
    icon: <HiSignal className="h-7 w-7" />,
    gradient: "from-red-500/20 via-rose-500/10 to-transparent",
    border: "border-red-500/30",
    iconColor: "text-red-400",
    accent: "bg-red-500",
  },
  {
    href: "/movies",
    label: "Filme",
    desc: "Blockbuster & Arthouse",
    icon: <HiFilm className="h-7 w-7" />,
    gradient: "from-purple-500/20 via-violet-500/10 to-transparent",
    border: "border-purple-500/30",
    iconColor: "text-purple-400",
    accent: "bg-purple-500",
  },
  {
    href: "/series",
    label: "Serien",
    desc: "Alle Staffeln auf einen Blick",
    icon: <HiRectangleStack className="h-7 w-7" />,
    gradient: "from-orange-500/20 via-amber-500/10 to-transparent",
    border: "border-orange-500/30",
    iconColor: "text-orange-400",
    accent: "bg-orange-500",
  },
  {
    href: "/epg",
    label: "TV Guide",
    desc: "Was läuft jetzt & als nächstes",
    icon: <HiTableCells className="h-7 w-7" />,
    gradient: "from-teal-500/20 via-green-500/10 to-transparent",
    border: "border-teal-500/30",
    iconColor: "text-teal-400",
    accent: "bg-teal-500",
  },
  {
    href: "/search",
    label: "Suche",
    desc: "Alles durchsuchen",
    icon: <HiMagnifyingGlass className="h-7 w-7" />,
    gradient: "from-pink-500/20 via-rose-500/10 to-transparent",
    border: "border-pink-500/30",
    iconColor: "text-pink-400",
    accent: "bg-pink-500",
  },
];

// ── Scroll Row ────────────────────────────────────────────────────────────────
function ScrollRow<T extends { id: string; name: string; logo?: string; streamType?: string }>({
  title, icon, items, onPlay, onFavorite, isFavorite, badge,
}: {
  title: string;
  icon: React.ReactNode;
  items: T[];
  onPlay: (item: T) => void;
  onFavorite?: (item: T) => void;
  isFavorite?: (id: string) => boolean;
  badge?: (item: T) => React.ReactNode;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

  const scroll = (dir: "left" | "right") => {
    const el = rowRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "right" ? 380 : -380, behavior: "smooth" });
  };

  const onScroll = () => {
    const el = rowRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    setCanRight(el.scrollWidth > el.clientWidth);
  }, [items]);

  if (!items.length) return null;

  return (
    <section className="mb-10">
      <h2 className="flex items-center gap-2 text-lg md:text-xl font-black text-white mb-4 px-4 md:px-6 lg:px-8">
        {icon} {title}
      </h2>
      <div className="relative group/row">
        {canLeft && (
          <button onClick={() => scroll("left")}
            className="absolute left-0 top-0 bottom-3 z-20 w-16 bg-gradient-to-r from-[#0d0d14] to-transparent flex items-center justify-start pl-2 opacity-0 group-hover/row:opacity-100 transition-opacity">
            <div className="bg-black/80 text-white rounded-full p-2 shadow-2xl hover:bg-black transition-colors">
              <HiChevronLeft className="h-5 w-5" />
            </div>
          </button>
        )}
        <div ref={rowRef} onScroll={onScroll}
          className="flex gap-3 overflow-x-auto px-4 md:px-6 lg:px-8 pb-3 hide-scrollbar">
          {items.map((item) => (
            <div key={item.id} className="flex-shrink-0 w-36 md:w-44 group/card relative cursor-pointer" onClick={() => onPlay(item)}>
              <div className="relative rounded-xl overflow-hidden bg-[#1a1a28] aspect-[2/3] mb-2 ring-2 ring-transparent group-hover/card:ring-purple-500 transition-all duration-200 shadow-lg">
                {item.logo ? (
                  <img src={item.logo} alt={item.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover/card:scale-110"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/50 to-blue-900/50">
                    <span className="text-4xl opacity-50">
                      {item.streamType === "movie" ? "🎬" : item.streamType === "series" ? "🎭" : "📺"}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity flex items-end p-2">
                  <div className="flex gap-1.5 w-full">
                    <button onClick={(e) => { e.stopPropagation(); onPlay(item); }}
                      className="flex-1 bg-white text-black text-[10px] font-black py-1.5 rounded-lg flex items-center justify-center gap-1">
                      <HiPlay className="h-3 w-3" /> Play
                    </button>
                    {onFavorite && (
                      <button onClick={(e) => { e.stopPropagation(); onFavorite(item); }}
                        className="bg-black/60 border border-white/30 text-white p-1.5 rounded-lg">
                        {isFavorite?.(item.id) ? <HiStar className="h-3 w-3 text-yellow-400" /> : <HiOutlineStar className="h-3 w-3" />}
                      </button>
                    )}
                  </div>
                </div>
                {badge && <div className="absolute top-2 left-2">{badge(item)}</div>}
              </div>
              <p className="text-[11px] font-semibold text-gray-400 line-clamp-2 leading-tight group-hover/card:text-white transition-colors">
                {item.name}
              </p>
            </div>
          ))}
        </div>
        {canRight && (
          <button onClick={() => scroll("right")}
            className="absolute right-0 top-0 bottom-3 z-20 w-16 bg-gradient-to-l from-[#0d0d14] to-transparent flex items-center justify-end pr-2 opacity-0 group-hover/row:opacity-100 transition-opacity">
            <div className="bg-black/80 text-white rounded-full p-2 shadow-2xl hover:bg-black transition-colors">
              <HiChevronRight className="h-5 w-5" />
            </div>
          </button>
        )}
      </div>
    </section>
  );
}

// ── Continue Watching ─────────────────────────────────────────────────────────
function ContinueCard({ item, progress, onPlay }: {
  item: { streamId: string; name: string; logo?: string; streamType: string };
  progress: number;
  onPlay: () => void;
}) {
  return (
    <div className="flex-shrink-0 w-52 md:w-64 group/card cursor-pointer" onClick={onPlay}>
      <div className="relative rounded-xl overflow-hidden bg-[#1a1a28] aspect-video mb-2 ring-2 ring-transparent group-hover/card:ring-purple-500 transition-all shadow-lg">
        {item.logo ? (
          <img src={item.logo} alt={item.name} className="w-full h-full object-cover transition-transform duration-300 group-hover/card:scale-105"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-900/60 to-blue-900/60 flex items-center justify-center">
            <span className="text-5xl opacity-30">▶</span>
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center justify-center">
          <div className="bg-white text-black rounded-full p-4 shadow-2xl">
            <HiPlay className="h-6 w-6" />
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
          <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500" style={{ width: `${Math.min(100, progress * 100)}%` }} />
        </div>
        <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
          {Math.round((1 - progress) * 100)}% left
        </div>
      </div>
      <p className="text-[11px] font-semibold text-gray-400 line-clamp-1 group-hover/card:text-white transition-colors">{item.name}</p>
    </div>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero({ items, onPlay, onFavorite, isFavorite }: {
  items: { id: string; name: string; logo?: string; streamType: string }[];
  onPlay: (item: { id: string; streamType: string }) => void;
  onFavorite: (item: { id: string; name: string; logo?: string; streamType: string }) => void;
  isFavorite: (id: string) => boolean;
}) {
  const [idx, setIdx] = useState(0);
  const [fade, setFade] = useState(true);

  const go = useCallback((next: number) => {
    setFade(false);
    setTimeout(() => { setIdx(next); setFade(true); }, 350);
  }, []);

  useEffect(() => {
    if (items.length < 2) return;
    const t = setInterval(() => go((idx + 1) % items.length), 9000);
    return () => clearInterval(t);
  }, [items.length, idx, go]);

  if (!items.length) return null;
  const item = items[idx];

  return (
    <div className="relative h-[50vh] md:h-[62vh] min-h-[380px] mb-10 overflow-hidden">
      <div className={clsx("absolute inset-0 transition-all duration-500", fade ? "opacity-100 scale-100" : "opacity-0 scale-105")}>
        {item.logo
          ? <img src={item.logo} alt="" className="w-full h-full object-cover" />
          : <div className="w-full h-full bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900" />
        }
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-[#0d0d14] via-[#0d0d14]/55 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d14] via-transparent to-[#0d0d14]/10" />

      <div className={clsx("absolute inset-0 flex flex-col justify-end pb-14 md:pb-18 px-6 md:px-10 lg:px-16 transition-all duration-400", fade ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3")}>
        <div className="max-w-lg">
          <span className={clsx(
            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4",
            item.streamType === "live" ? "bg-red-500/20 text-red-400 border border-red-500/40" : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
          )}>
            {item.streamType === "live" ? "🔴 LIVE" : "▶ VOD"}
          </span>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white leading-tight mb-3 drop-shadow-2xl">
            {item.name}
          </h1>
          <p className="text-gray-400 text-sm mb-6">Premium HD · Sofort verfügbar</p>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => onPlay(item)}
              className="flex items-center gap-2 px-8 py-3 bg-white text-black font-black text-sm rounded-xl hover:bg-gray-100 transition-all hover:scale-105 shadow-2xl">
              <HiPlay className="h-5 w-5" /> Abspielen
            </button>
            <button onClick={() => onFavorite(item)}
              className="flex items-center gap-2 px-5 py-3 bg-white/10 backdrop-blur-sm text-white font-bold text-sm rounded-xl border border-white/20 hover:bg-white/20 transition-all">
              {isFavorite(item.id) ? <><HiStar className="h-4 w-4 text-yellow-400" /> Favorit</> : <><HiPlus className="h-4 w-4" /> Merken</>}
            </button>
          </div>
        </div>
      </div>

      {items.length > 1 && (
        <div className="absolute bottom-5 right-6 flex gap-1.5">
          {items.map((_, i) => (
            <button key={i} onClick={() => go(i)}
              className={clsx("rounded-full transition-all duration-300", i === idx ? "w-6 h-2 bg-white" : "w-2 h-2 bg-white/30 hover:bg-white/50")} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Empty Hero ────────────────────────────────────────────────────────────────
function EmptyHero() {
  return (
    <div className="relative h-[45vh] min-h-[300px] mb-10 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-blue-900/30 to-[#0d0d14]" style={{
        backgroundImage: "radial-gradient(ellipse at 25% 60%, rgba(139,92,246,0.2) 0%, transparent 55%), radial-gradient(ellipse at 75% 30%, rgba(59,130,246,0.12) 0%, transparent 55%)"
      }} />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d14] to-transparent" />
      <div className="relative h-full flex flex-col justify-end pb-14 px-6 md:px-10 lg:px-16">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 rounded-full text-purple-300 text-[10px] font-black uppercase tracking-widest mb-4 w-fit">
          <HiSparkles className="h-3.5 w-3.5" /> IPTV TREX Premium
        </div>
        <h1 className="text-4xl md:text-6xl font-black text-white leading-tight mb-3">
          Dein Kino.<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Immer dabei.</span>
        </h1>
        <p className="text-gray-500 text-sm mb-7 max-w-md">Hunderte Sender, Tausende Filme & Serien — alles an einem Ort.</p>
        <div className="flex gap-3">
          <a href="/live/"
            className="flex items-center gap-2 px-7 py-3 bg-white text-black font-black text-sm rounded-xl hover:bg-gray-100 transition-all hover:scale-105 shadow-2xl">
            <HiPlay className="h-5 w-5" /> Live TV starten
          </a>
          <a href="/movies/"
            className="flex items-center gap-2 px-5 py-3 bg-white/10 text-white font-bold text-sm rounded-xl border border-white/20 hover:bg-white/20 transition-all">
            <HiFilm className="h-4 w-4" /> Filme
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Premium Nav Cards ─────────────────────────────────────────────────────────
function NavCards({ favCount }: { favCount: number }) {
  return (
    <div className="px-4 md:px-6 lg:px-8 mb-10 space-y-3">

      {/* ── Row 1: Favoriten (full width hero) ── */}
      <a href="/favorites/" className="group relative w-full overflow-hidden rounded-2xl text-left transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]">
        {/* rich gradient bg */}
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-600/40 via-amber-600/25 to-yellow-900/10" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40" />
        {/* glow blob */}
        <div className="absolute -left-6 -top-6 h-32 w-32 rounded-full bg-yellow-500/30 blur-3xl group-hover:bg-yellow-400/50 transition-colors duration-500" />
        {/* border */}
        <div className="absolute inset-0 rounded-2xl border border-yellow-500/25 group-hover:border-yellow-400/50 transition-colors" />
        <div className="relative flex items-center gap-5 px-6 py-5">
          {/* icon with glow ring */}
          <div className="relative flex-shrink-0">
            <div className="absolute inset-0 rounded-2xl bg-yellow-500/40 blur-xl scale-150" />
            <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-2xl shadow-yellow-900/50">
              <HiStar className="h-9 w-9 text-white drop-shadow-lg" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <span className="text-xl font-black text-white tracking-tight">Favoriten</span>
              {favCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-yellow-500/30 border border-yellow-400/40 text-yellow-200 text-xs font-black">{favCount}</span>
              )}
            </div>
            <p className="text-sm text-yellow-200/60 truncate">Deine gespeicherten Sender, Filme & Serien</p>
          </div>
          <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-yellow-500/20 border border-yellow-400/30 flex items-center justify-center group-hover:bg-yellow-500/35 transition-colors">
            <HiChevronRight className="h-5 w-5 text-yellow-300 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </a>

      {/* ── Row 2: Live TV + Filme (2 col) ── */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { href: "/live",   label: "Live TV", desc: "Hunderte Sender", icon: <HiSignal className="h-8 w-8 text-white drop-shadow-lg" />, from: "from-red-600", via: "via-rose-700", to: "to-red-900/50", blob: "bg-red-500/40", border: "border-red-500/25 group-hover:border-red-400/50" },
          { href: "/movies", label: "Filme",   desc: "Blockbuster & Arthouse", icon: <HiFilm className="h-8 w-8 text-white drop-shadow-lg" />, from: "from-violet-600", via: "via-purple-700", to: "to-purple-900/50", blob: "bg-violet-500/40", border: "border-violet-500/25 group-hover:border-violet-400/50" },
        ].map((c) => (
          <a key={c.href} href={c.href + "/"} className="group relative overflow-hidden rounded-2xl text-left transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
            <div className={clsx("absolute inset-0 bg-gradient-to-br", c.from, c.via, c.to)} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className={clsx("absolute -right-4 -top-4 h-24 w-24 rounded-full blur-3xl transition-all duration-500 group-hover:scale-125", c.blob)} />
            <div className={clsx("absolute inset-0 rounded-2xl border transition-colors", c.border)} />
            <div className="relative p-5">
              <div className="relative inline-flex mb-3">
                <div className={clsx("absolute inset-0 rounded-xl blur-xl scale-150", c.blob)} />
                <div className={clsx("relative h-13 w-13 rounded-xl bg-gradient-to-br p-3", c.from, c.via)}>
                  {c.icon}
                </div>
              </div>
              <p className="text-lg font-black text-white leading-none mb-1">{c.label}</p>
              <p className="text-xs text-white/50">{c.desc}</p>
            </div>
          </a>
        ))}
      </div>

      {/* ── Row 3: Serien, TV Guide, Suche (3 col) ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { href: "/series",    label: "Serien",   icon: <HiRectangleStack className="h-6 w-6 text-white" />, from: "from-orange-600/60", to: "to-orange-900/30", blob: "bg-orange-500/30", border: "border-orange-500/20 group-hover:border-orange-400/45" },
          { href: "/epg",       label: "TV Guide", icon: <HiTableCells className="h-6 w-6 text-white" />,     from: "from-teal-600/60",   to: "to-teal-900/30",   blob: "bg-teal-500/30",   border: "border-teal-500/20 group-hover:border-teal-400/45" },
          { href: "/search",    label: "Suche",    icon: <HiMagnifyingGlass className="h-6 w-6 text-white" />,from: "from-pink-600/60",   to: "to-pink-900/30",   blob: "bg-pink-500/30",   border: "border-pink-500/20 group-hover:border-pink-400/45" },
        ].map((c) => (
          <a key={c.href} href={c.href + "/"} className="group relative overflow-hidden rounded-2xl text-center transition-all duration-300 hover:scale-[1.03] active:scale-[0.97]">
            <div className={clsx("absolute inset-0 bg-gradient-to-b", c.from, c.to)} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <div className={clsx("absolute inset-x-0 -top-6 h-16 mx-auto w-16 rounded-full blur-2xl transition-all duration-500 group-hover:scale-125", c.blob)} />
            <div className={clsx("absolute inset-0 rounded-2xl border transition-colors", c.border)} />
            <div className="relative flex flex-col items-center justify-center gap-2.5 py-5 px-3">
              <div className={clsx("relative h-11 w-11 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center group-hover:bg-white/20 transition-colors")}>
                {c.icon}
              </div>
              <p className="text-sm font-black text-white leading-none">{c.label}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

// ── Recent Tabs (TV / Filme / Serien) ─────────────────────────────────────────
type RecentTab = "all" | "live" | "movie" | "series";

function RecentSection({ items, onPlay, onFavorite, isFavorite }: {
  items: { id: string; name: string; logo?: string; streamType: string }[];
  onPlay: (item: { id: string; streamType?: string }) => void;
  onFavorite: (item: { id: string; name: string; logo?: string; streamType?: string }) => void;
  isFavorite: (id: string) => boolean;
}) {
  const [tab, setTab] = useState<RecentTab>("all");

  const tv      = items.filter((i) => i.streamType === "live");
  const movies  = items.filter((i) => i.streamType === "movie");
  const series  = items.filter((i) => i.streamType === "series");

  const tabs: { key: RecentTab; label: string; icon: React.ReactNode; count: number }[] = (
    [
      { key: "all" as RecentTab,    label: "Alle",    icon: <HiArrowPath className="h-3.5 w-3.5" />,      count: items.length },
      { key: "live" as RecentTab,   label: "TV",      icon: <HiTv className="h-3.5 w-3.5" />,             count: tv.length },
      { key: "movie" as RecentTab,  label: "Filme",   icon: <HiFilm className="h-3.5 w-3.5" />,           count: movies.length },
      { key: "series" as RecentTab, label: "Serien",  icon: <HiRectangleStack className="h-3.5 w-3.5" />, count: series.length },
    ] as { key: RecentTab; label: string; icon: React.ReactNode; count: number }[]
  ).filter((t) => t.key === "all" || t.count > 0);

  const visible = tab === "all" ? items : tab === "live" ? tv : tab === "movie" ? movies : series;

  if (!items.length) return null;

  return (
    <section className="mb-10">
      {/* Header with tabs */}
      <div className="flex items-center justify-between px-4 md:px-6 lg:px-8 mb-4">
        <h2 className="flex items-center gap-2 text-lg md:text-xl font-black text-white">
          <HiClock className="h-5 w-5 text-blue-400" /> Zuletzt geschaut
        </h2>
        <div className="flex items-center gap-1 bg-white/5 border border-white/8 rounded-xl p-1">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                tab === t.key
                  ? "bg-purple-600 text-white shadow-lg"
                  : "text-gray-500 hover:text-gray-300"
              )}
            >
              {t.icon} {t.label}
              {t.key !== "all" && t.count > 0 && (
                <span className={clsx("text-[10px] font-black", tab === t.key ? "text-purple-200" : "text-gray-600")}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Scroll row */}
      <div className="flex gap-3 overflow-x-auto px-4 md:px-6 lg:px-8 pb-3 hide-scrollbar">
        {visible.slice(0, 20).map((item) => (
          <div key={item.id} className="flex-shrink-0 w-36 md:w-44 group/card relative cursor-pointer" onClick={() => onPlay(item)}>
            <div className="relative rounded-xl overflow-hidden bg-[#1a1a28] aspect-[2/3] mb-2 ring-2 ring-transparent group-hover/card:ring-purple-500 transition-all duration-200 shadow-lg">
              {item.logo ? (
                <img src={item.logo} alt={item.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover/card:scale-110"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/50 to-blue-900/50">
                  <span className="text-4xl opacity-50">
                    {item.streamType === "movie" ? "🎬" : item.streamType === "series" ? "🎭" : "📺"}
                  </span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity flex items-end p-2">
                <div className="flex gap-1.5 w-full">
                  <button onClick={(e) => { e.stopPropagation(); onPlay(item); }}
                    className="flex-1 bg-white text-black text-[10px] font-black py-1.5 rounded-lg flex items-center justify-center gap-1">
                    <HiPlay className="h-3 w-3" /> Play
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); onFavorite(item); }}
                    className="bg-black/60 border border-white/30 text-white p-1.5 rounded-lg">
                    {isFavorite(item.id) ? <HiStar className="h-3 w-3 text-yellow-400" /> : <HiOutlineStar className="h-3 w-3" />}
                  </button>
                </div>
              </div>
              {item.streamType === "live" && (
                <div className="absolute top-2 left-2">
                  <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">LIVE</span>
                </div>
              )}
            </div>
            <p className="text-[11px] font-semibold text-gray-400 line-clamp-2 leading-tight group-hover/card:text-white transition-colors">
              {item.name}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { favorites, toggle, isFavorite } = useFavoritesStore();
  const { items: recentItems } = useRecentStore();
  const { positions } = usePlayerStore();
  const { startInFavorites } = useSettingsStore();

  useEffect(() => {
    if (startInFavorites) nav("/favorites");
  }, [startInFavorites]);

  const continueWatching = Object.entries(positions)
    .filter(([, p]) => p.duration > 0 && p.position / p.duration > 0.02 && p.position / p.duration < 0.95)
    .sort(([, a], [, b]) => b.updatedAt - a.updatedAt)
    .slice(0, 15)
    .map(([streamId, pos]) => {
      const r = recentItems.find((x) => x.id === streamId);
      if (!r?.name) return null;
      return { streamId, progress: pos.position / pos.duration, name: r.name, logo: proxyImg(r.logo || ""), streamType: r.streamType || "live" };
    }).filter(Boolean) as { streamId: string; progress: number; name: string; logo?: string; streamType: string }[];

  const heroItems = recentItems.slice(0, 6).map((r) => ({ id: r.id, name: r.name, logo: proxyImg(r.logo || ""), streamType: r.streamType }));
  const recentRow = recentItems.slice(0, 30).map((r) => ({ id: r.id, name: r.name, logo: proxyImg(r.logo || ""), streamType: r.streamType }));
  const favRow = favorites.slice(0, 20).map((f) => ({ id: f.id, name: f.name, logo: proxyImg(f.logo || ""), streamType: f.streamType }));

  const play = (item: { id: string; streamType?: string }) => {
    nav(`/player/${item.id}?type=${item.streamType || "live"}`);
  };

  const toggleFav = (item: { id: string; name: string; logo?: string; streamType?: string }) =>
    toggle({ id: item.id, name: item.name, logo: item.logo, streamType: (item.streamType || "live") as "live" | "movie" | "series" });

  return (
    <div className="min-h-full overflow-y-auto bg-[#0d0d14]">

      {/* Hero */}
      {heroItems.length > 0
        ? <Hero items={heroItems} onPlay={play} onFavorite={toggleFav} isFavorite={isFavorite} />
        : <EmptyHero />
      }

      {/* Glassmorphism Nav Cards */}
      <NavCards favCount={favorites.length} />

      {/* Continue Watching */}
      {continueWatching.length > 0 && (
        <section className="mb-10">
          <h2 className="flex items-center gap-2 text-lg font-black text-white mb-4 px-4 md:px-6 lg:px-8">
            <HiClock className="h-5 w-5 text-purple-400" /> Weiterschauen
          </h2>
          <div className="flex gap-3 overflow-x-auto px-4 md:px-6 lg:px-8 pb-3 hide-scrollbar">
            {continueWatching.map((item) => (
              <ContinueCard key={item.streamId} item={item} progress={item.progress}
                onPlay={() => play({ id: item.streamId, streamType: item.streamType })} />
            ))}
          </div>
        </section>
      )}

      {/* Zuletzt geschaut mit 3 Kategorien */}
      <RecentSection items={recentRow} onPlay={play} onFavorite={toggleFav} isFavorite={isFavorite} />

      {/* Favoriten Row */}
      {favRow.length > 0 && (
        <ScrollRow title="Meine Favoriten" icon={<HiStar className="h-5 w-5 text-yellow-400" />}
          items={favRow} onPlay={play} onFavorite={toggleFav} isFavorite={isFavorite} />
      )}

      <div className="h-8" />
    </div>
  );
}
