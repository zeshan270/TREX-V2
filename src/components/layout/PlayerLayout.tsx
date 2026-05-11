"use client";

import { usePathname } from "next/navigation";
import { useRef, useCallback, useState, useEffect } from "react";
import clsx from "clsx";
import {
  HiHome,
  HiTv,
  HiFilm,
  HiRectangleStack,
  HiStar,
  HiMagnifyingGlass,
  HiCog6Tooth,
  HiBars3,
  HiXMark,
  HiTableCells,
  HiSparkles,
  HiFire,
  HiCommandLine,
} from "react-icons/hi2";
import { useAuthStore, useSettingsStore, useRecentStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { nav } from "@/lib/navigate";

const navItems = [
  { href: "/", labelKey: "nav.home" as const, icon: HiHome, accent: "from-purple-500 to-blue-500", dot: "bg-purple-400" },
  { href: "/live", labelKey: "nav.liveTV" as const, icon: HiTv, accent: "from-red-500 to-pink-500", dot: "bg-red-400" },
  { href: "/movies", labelKey: "nav.movies" as const, icon: HiFilm, accent: "from-blue-500 to-cyan-500", dot: "bg-blue-400" },
  { href: "/series", labelKey: "nav.series" as const, icon: HiRectangleStack, accent: "from-orange-500 to-amber-500", dot: "bg-orange-400" },
  { href: "/favorites", labelKey: "nav.favorites" as const, icon: HiStar, accent: "from-yellow-500 to-amber-500", dot: "bg-yellow-400" },
  { href: "/trending", labelKey: "nav.trending" as const, icon: HiFire, accent: "from-orange-600 to-red-600", dot: "bg-orange-500" },
  { href: "/genres", labelKey: "nav.genres" as const, icon: HiSparkles, accent: "from-purple-500 to-pink-500", dot: "bg-purple-400" },
  { href: "/epg", labelKey: "nav.tvGuide" as const, icon: HiTableCells, accent: "from-green-500 to-teal-500", dot: "bg-green-400" },
  { href: "/search", labelKey: "nav.search" as const, icon: HiMagnifyingGlass, accent: "from-pink-500 to-rose-500", dot: "bg-pink-400" },
  { href: "/settings", labelKey: "nav.settings" as const, icon: HiCog6Tooth, accent: "from-gray-500 to-slate-500", dot: "bg-gray-400" },
];

// ===== Spotlight Search =====
function SpotlightSearch({ onClose }: { onClose: () => void }) {
  const { items: recentItems } = useRecentStore();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filteredRecent = recentItems
    .filter((item) => !query || item.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 6);

  const quickLinks = [
    { label: "Live TV", href: "/live", icon: HiTv, color: "text-red-400" },
    { label: "Filme", href: "/movies", icon: HiFilm, color: "text-blue-400" },
    { label: "Serien", href: "/series", icon: HiRectangleStack, color: "text-orange-400" },
    { label: "Suche", href: `/search${query ? `?q=${encodeURIComponent(query)}` : ""}`, icon: HiMagnifyingGlass, color: "text-pink-400" },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      nav(`/search?q=${encodeURIComponent(query.trim())}`);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[10vh] px-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

      {/* Panel */}
      <div
        className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0d0d14]/95 shadow-2xl shadow-purple-900/30 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search bar */}
        <form onSubmit={handleSubmit} className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
          <HiMagnifyingGlass className="h-5 w-5 text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Suchen nach Filmen, Serien, Live TV..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-white placeholder-gray-500 text-lg focus:outline-none"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} className="text-gray-500 hover:text-white transition-colors">
              <HiXMark className="h-5 w-5" />
            </button>
          )}
          <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 border border-white/10 text-gray-500 text-xs">
            ESC
          </kbd>
        </form>

        {/* Quick links */}
        {!query && (
          <div className="px-5 py-3 border-b border-white/5">
            <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-3">Schnellzugriff</p>
            <div className="grid grid-cols-4 gap-2">
              {quickLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => { nav(link.href); onClose(); }}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <link.icon className={clsx("h-5 w-5", link.color)} />
                  <span className="text-xs text-gray-300">{link.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recent / Results */}
        {filteredRecent.length > 0 && (
          <div className="px-5 py-3 max-h-80 overflow-y-auto">
            <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-3">
              {query ? "Ergebnisse" : "Zuletzt angesehen"}
            </p>
            <ul className="space-y-1">
              {filteredRecent.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => { nav(`/player/${item.id}?type=${item.streamType}`); onClose(); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/8 transition-colors text-left group"
                  >
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500/30 to-blue-500/30 flex items-center justify-center flex-shrink-0">
                      {item.streamType === "live" ? (
                        <HiTv className="h-4 w-4 text-red-400" />
                      ) : item.streamType === "movie" ? (
                        <HiFilm className="h-4 w-4 text-blue-400" />
                      ) : (
                        <HiRectangleStack className="h-4 w-4 text-orange-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate group-hover:text-purple-300 transition-colors">{item.name}</p>
                      <p className="text-xs text-gray-500 capitalize">{item.streamType === "live" ? "Live TV" : item.streamType === "movie" ? "Film" : "Serie"}</p>
                    </div>
                    <HiMagnifyingGlass className="h-4 w-4 text-gray-600 group-hover:text-gray-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Footer hint */}
        <div className="px-5 py-2.5 border-t border-white/5 flex items-center gap-4 text-xs text-gray-600">
          <span className="flex items-center gap-1.5"><kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-gray-500">↵</kbd> Öffnen</span>
          <span className="flex items-center gap-1.5"><kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-gray-500">ESC</kbd> Schließen</span>
        </div>
      </div>
    </div>
  );
}

export default function PlayerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const macAddress = useAuthStore((s) => s.macAddress);
  const credentials = useAuthStore((s) => s.credentials);
  const playlistName = useAuthStore((s) => s.playlistName);
  const { fontSize, remoteControlMode } = useSettingsStore();
  const t = useT();
  const navRef = useRef<HTMLUListElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [exitToast, setExitToast] = useState(false);
  const [spotlight, setSpotlight] = useState(false);

  const isLarge = fontSize === "large" || fontSize === "extra-large" || remoteControlMode;

  const serverHost =
    credentials && "serverUrl" in credentials
      ? (() => { try { return new URL(credentials.serverUrl).hostname; } catch { return credentials.serverUrl; } })()
      : credentials && "url" in credentials
        ? "M3U Playlist"
        : "";

  // Close menu on route change
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setMenuOpen(false); setSpotlight(false); }
      // CMD+K or CTRL+K → spotlight
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSpotlight((v) => !v);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // Back navigation guard (TiviMate-style)
  const lastBackRef = useRef(0);
  const pathnameRef = useRef(pathname);
  const exitToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { pathnameRef.current = pathname; }, [pathname]);

  useEffect(() => {
    window.history.pushState({ trex: "guard" }, "");
    const handlePopState = (e: PopStateEvent) => {
      const p = pathnameRef.current;
      if (p.startsWith("/player/")) return;
      const trex = (e.state as { trex?: string } | null)?.trex;
      if (trex === "player" || trex === "player-guard") {
        window.history.pushState({ trex: "guard" }, "");
        return;
      }
      if (p === "/") {
        const now = Date.now();
        if (now - lastBackRef.current < 2000) { window.history.back(); return; }
        lastBackRef.current = now;
        setExitToast(true);
        if (exitToastTimerRef.current) clearTimeout(exitToastTimerRef.current);
        exitToastTimerRef.current = setTimeout(() => setExitToast(false), 2000);
        window.history.pushState({ trex: "guard" }, "");
        return;
      }
      // Navigate to logical parent page
      if (p.startsWith("/movies/")) { nav("/movies"); }
      else if (p.startsWith("/series/")) { nav("/series"); }
      else if (p.startsWith("/player/")) { nav("/"); }
      else if (p.startsWith("/browse/")) { nav("/genres"); }
      else { nav("/"); }
      window.history.pushState({ trex: "guard" }, "");
    };
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (exitToastTimerRef.current) clearTimeout(exitToastTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNavKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
    if (!navRef.current) return;
    const items = navRef.current.querySelectorAll("a");
    let nextIndex = index;
    if (e.key === "ArrowDown") { e.preventDefault(); nextIndex = Math.min(index + 1, items.length - 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); nextIndex = Math.max(index - 1, 0); }
    if (nextIndex !== index) (items[nextIndex] as HTMLElement)?.focus();
  }, []);

  const NavLink = ({ item, index, compact = false }: { item: typeof navItems[0]; index: number; compact?: boolean }) => {
    const normPat = pathname.replace(/\/+$/, "") || "/";
    const normHref = item.href.replace(/\/+$/, "") || "/";
    const isActive = normPat === normHref || (normHref !== "/" && normPat.startsWith(normHref));

    const href = item.href.endsWith("/") ? item.href : item.href + "/";
    return (
      <a
        href={href}
        tabIndex={0}
        data-focusable
        className={clsx(
          "group relative flex items-center gap-3 rounded-xl transition-all duration-200 w-full text-left",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500",
          compact ? "px-3 py-3 justify-center" : (isLarge ? "px-4 py-4" : "px-4 py-3"),
          isActive ? "text-white" : "text-gray-400 hover:text-white"
        )}
      >
        {isActive && (
          <div className={clsx("absolute inset-0 rounded-xl opacity-20 bg-gradient-to-r", item.accent)} />
        )}
        {!isActive && (
          <div className="absolute inset-0 rounded-xl bg-white/0 group-hover:bg-white/5 transition-colors" />
        )}
        {isActive && !compact && (
          <div className={clsx("absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-gradient-to-b", item.accent)} />
        )}
        <item.icon className={clsx(
          "relative flex-shrink-0 transition-transform group-hover:scale-110",
          compact ? "h-5 w-5" : (isLarge ? "h-6 w-6" : "h-5 w-5"),
          isActive ? `text-transparent bg-gradient-to-br ${item.accent} bg-clip-text` : ""
        )} style={isActive ? { filter: "drop-shadow(0 0 6px rgba(168,85,247,0.5))" } : {}} />
        {!compact && (
          <span className={clsx("relative font-medium truncate flex-1", isLarge ? "text-base" : "text-sm")}>
            {t(item.labelKey)}
          </span>
        )}
        {isActive && !compact && (
          <div className={clsx("relative ml-auto h-1.5 w-1.5 rounded-full", item.dot)} />
        )}
        {compact && (
          <div className="pointer-events-none absolute left-full ml-3 px-3 py-1.5 rounded-lg bg-[#1a1a28] border border-white/10 text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-xl">
            {t(item.labelKey)}
          </div>
        )}
      </a>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#0d0d14]">
      {/* Desktop Sidebar — full width on xl, icon-only on lg */}
      <aside className={clsx(
        "hidden lg:flex flex-col border-r border-white/5",
        "bg-[#080810]/90 backdrop-blur-xl",
        "xl:w-64 lg:w-20"
      )}>
        {/* Logo */}
        <div className="flex h-16 items-center justify-center xl:justify-start xl:px-5 border-b border-white/5">
          <a href="/" className="flex items-center gap-3 group">
            <div className={clsx(
              "flex h-9 w-9 items-center justify-center rounded-xl",
              "bg-gradient-to-br from-purple-600 via-violet-600 to-blue-600",
              "shadow-lg shadow-purple-900/50 group-hover:shadow-purple-700/60 transition-shadow"
            )}>
              <span className="text-sm font-black text-white tracking-tight">TX</span>
            </div>
            <div className="hidden xl:block">
              <p className="text-base font-black text-white leading-none">IPTV TREX</p>
              <p className="text-[10px] text-purple-400 font-medium tracking-widest uppercase leading-none mt-0.5">Premium</p>
            </div>
          </a>
        </div>

        {/* Spotlight Search Button */}
        <div className="xl:px-3 lg:px-2 pt-3 pb-2">
          <button
            onClick={() => setSpotlight(true)}
            className={clsx(
              "w-full flex items-center gap-2.5 rounded-xl border border-white/8 bg-white/4 transition-all",
              "hover:bg-white/8 hover:border-white/15 text-gray-400 hover:text-white",
              "xl:px-3 xl:py-2.5 lg:p-3 lg:justify-center xl:justify-start"
            )}
          >
            <HiMagnifyingGlass className="h-4 w-4 flex-shrink-0" />
            <span className="hidden xl:block text-sm flex-1 text-left">Suchen...</span>
            <div className="hidden xl:flex items-center gap-0.5">
              <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-white/8 border border-white/10 text-gray-500">⌘K</kbd>
            </div>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto xl:py-3 xl:px-3 lg:py-3 lg:px-2 scrollbar-none">
          <ul ref={navRef} className="space-y-0.5">
            {navItems.map((item, index) => (
              <li key={item.href}>
                <NavLink item={item} index={index} compact={false} />
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t border-white/5 xl:p-4 lg:p-2 space-y-2">
          {(playlistName || serverHost) && (
            <div className={clsx(
              "rounded-xl border border-purple-500/20 bg-purple-500/8 xl:p-3 lg:p-2",
              "xl:block hidden"
            )}>
              <p className="text-[9px] uppercase tracking-widest text-purple-400/70 mb-1">{t("settings.activePlaylist")}</p>
              <p className="text-xs text-purple-200 font-semibold truncate">{playlistName || serverHost}</p>
            </div>
          )}
          <div className={clsx(
            "rounded-xl border border-white/5 bg-white/3 xl:p-3 lg:p-2",
            "xl:block hidden"
          )}>
            <p className="text-[9px] uppercase tracking-widest text-gray-600 mb-1">{t("settings.macAddress")}</p>
            <p className="text-[10px] text-gray-500 font-mono truncate">{macAddress || "00:00:00:00:00:00"}</p>
          </div>
          {/* Compact footer for icon-only mode */}
          <div className="xl:hidden flex flex-col items-center gap-2 py-1">
            <div className="h-8 w-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
              <span className="text-[10px] font-bold text-purple-400">P</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile hamburger overlay */}
      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={() => setMenuOpen(false)}
          />
          <div
            className="absolute left-0 top-0 bottom-0 w-72 flex flex-col border-r border-white/8 animate-in slide-in-from-left duration-250"
            style={{ background: "linear-gradient(160deg, #0d0d1a 0%, #0a0a14 100%)" }}
          >
            {/* Menu header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
              <a href="/" className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 shadow-lg shadow-purple-900/50">
                  <span className="text-sm font-black text-white">TX</span>
                </div>
                <div>
                  <p className="text-base font-black text-white leading-none">IPTV TREX</p>
                  <p className="text-[10px] text-purple-400 tracking-widest uppercase leading-none mt-0.5">Premium</p>
                </div>
              </a>
              <button
                onClick={() => setMenuOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <HiXMark className="h-5 w-5" />
              </button>
            </div>

            {/* Search button in mobile menu */}
            <div className="px-4 pt-3 pb-2">
              <button
                onClick={() => { setMenuOpen(false); setSpotlight(true); }}
                className="w-full flex items-center gap-2.5 rounded-xl border border-white/8 bg-white/4 px-4 py-2.5 text-gray-400"
              >
                <HiMagnifyingGlass className="h-4 w-4" />
                <span className="text-sm">Suchen...</span>
                <span className="ml-auto text-xs text-gray-600">⌘K</span>
              </button>
            </div>

            {/* Menu nav */}
            <nav className="flex-1 overflow-y-auto py-2 px-3">
              <ul className="space-y-0.5">
                {navItems.map((item, index) => (
                  <li key={item.href}>
                    <NavLink item={item} index={index} />
                  </li>
                ))}
              </ul>
            </nav>

            {/* Mobile footer */}
            <div className="border-t border-white/5 p-4 space-y-2">
              {(playlistName || serverHost) && (
                <div className="rounded-xl border border-purple-500/20 bg-purple-500/8 p-3">
                  <p className="text-[9px] uppercase tracking-widest text-purple-400/70 mb-1">{t("settings.activePlaylist")}</p>
                  <p className="text-xs text-purple-200 font-semibold truncate">{playlistName || serverHost}</p>
                </div>
              )}
              <div className="rounded-xl border border-white/5 bg-white/3 p-3">
                <p className="text-[9px] uppercase tracking-widest text-gray-600 mb-1">{t("settings.macAddress")}</p>
                <p className="text-[10px] text-gray-500 font-mono truncate">{macAddress || "00:00:00:00:00:00"}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile top bar */}
      <div className={clsx(
        "lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14",
        "border-b border-white/5 bg-[#080810]/90 backdrop-blur-xl"
      )}>
        <button
          onClick={() => setMenuOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Menü öffnen"
        >
          <HiBars3 className="h-5 w-5" />
        </button>

        <a href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-blue-600">
            <span className="text-xs font-black text-white">TX</span>
          </div>
          <span className="text-sm font-black text-white">IPTV TREX</span>
        </a>

        <button
          onClick={() => setSpotlight(true)}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Suche"
        >
          <HiMagnifyingGlass className="h-5 w-5" />
        </button>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pt-14 lg:pt-0 min-w-0">{children}</main>

      {/* Spotlight Search Modal */}
      {spotlight && <SpotlightSearch onClose={() => setSpotlight(false)} />}

      {/* Double-back exit toast */}
      {exitToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="rounded-2xl border border-white/10 bg-[#0d0d1a]/95 backdrop-blur-xl px-6 py-3 shadow-2xl">
            <p className="text-sm text-gray-300 whitespace-nowrap">{t("common.pressAgainToExit")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
