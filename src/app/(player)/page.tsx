"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { HiTv, HiFilm, HiRectangleStack, HiStar, HiPlay, HiMagnifyingGlass, HiFire, HiSparkles } from "react-icons/hi2";
import { useAuthStore, useFavoritesStore, useRecentStore, usePlayerStore, useSettingsStore } from "@/lib/store";

const quickAccess = [
  { href: "/live", label: "Live TV", icon: HiTv, emoji: "📺", gradient: "from-blue-600 to-blue-400" },
  { href: "/movies", label: "Filme", icon: HiFilm, emoji: "🎬", gradient: "from-purple-600 to-pink-500" },
  { href: "/series", label: "Serien", icon: HiRectangleStack, emoji: "🎭", gradient: "from-orange-600 to-red-500" },
  { href: "/favorites", label: "Favoriten", icon: HiStar, emoji: "⭐", gradient: "from-yellow-500 to-amber-500" },
];

export default function HomePage() {
  const router = useRouter();
  const { playlistName } = useAuthStore();
  const { favorites } = useFavoritesStore();
  const { items: recentItems } = useRecentStore();
  const { positions } = usePlayerStore();
  const { fontSize, remoteControlMode } = useSettingsStore();
  const [featuredIndex, setFeaturedIndex] = useState(0);

  const isLarge = fontSize === "large" || fontSize === "extra-large" || remoteControlMode;

  // Continue watching: items with saved position < 95%
  const continueWatching = Object.entries(positions)
    .filter(([, pos]) => pos.duration > 0 && (pos.position / pos.duration) < 0.95 && (pos.position / pos.duration) > 0.02)
    .sort(([, a], [, b]) => b.updatedAt - a.updatedAt)
    .slice(0, 10)
    .map(([streamId, pos]) => {
      const recent = recentItems.find((r) => r.id === streamId);
      return { streamId, ...pos, name: recent?.name || `Stream ${streamId}`, logo: recent?.logo, streamType: recent?.streamType || "live" };
    });

  // Featured items rotation
  const featuredItems = recentItems.length > 0 ? recentItems.slice(0, 5) : [];

  useEffect(() => {
    if (featuredItems.length === 0) return;
    const timer = setInterval(() => {
      setFeaturedIndex((prev) => (prev + 1) % featuredItems.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [featuredItems.length]);

  const currentFeatured = featuredItems[featuredIndex] || null;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 6) return "Gute Nacht";
    if (h < 11) return "Guten Morgen";
    if (h < 14) return "Guten Mittag";
    if (h < 18) return "Guten Nachmittag";
    if (h < 22) return "Guten Abend";
    return "Gute Nacht";
  };

  return (
    <div className="min-h-full overflow-y-auto bg-gradient-to-b from-[#0d0d14] via-[#0d0d14] to-[#1a1a24]">
      {/* ==================== HERO SECTION ==================== */}
      {currentFeatured && (
        <div className={clsx(
          "relative mb-8 rounded-3xl overflow-hidden group cursor-pointer",
          isLarge ? "h-96" : "h-56 md:h-72 lg:h-80"
        )}>
          {/* Background with gradient overlay */}
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
            style={{
              backgroundImage: currentFeatured.logo
                ? `url('${currentFeatured.logo}')`
                : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
          </div>

          {/* Content */}
          <div className={clsx(
            "relative h-full flex flex-col justify-end p-6 md:p-8 lg:p-12",
            isLarge ? "p-12" : ""
          )}>
            <div className="max-w-2xl">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl md:text-3xl lg:text-4xl">{currentFeatured.streamType === "live" ? "📺" : "🎬"}</span>
                <span className="px-3 py-1 bg-amber-500/20 text-amber-400 text-xs md:text-sm font-bold rounded-full uppercase tracking-wider">
                  {currentFeatured.streamType === "live" ? "Live" : "VOD"}
                </span>
              </div>
              <h1 className={clsx(
                "font-black text-white mb-2 line-clamp-2",
                isLarge ? "text-4xl md:text-5xl lg:text-6xl" : "text-2xl md:text-4xl lg:text-5xl"
              )}>
                {currentFeatured.name}
              </h1>
              <p className="text-gray-300 text-sm md:text-base mb-6 line-clamp-2">
                Jetzt ansehen - Premium Streaming Experience
              </p>
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={() => router.push(`/player/${currentFeatured.id}?type=${currentFeatured.streamType}`)}
                  className="flex items-center gap-2 px-6 md:px-8 py-3 md:py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-amber-500/30"
                >
                  <HiPlay className="h-5 w-5 md:h-6 md:w-6" />
                  <span className="hidden sm:inline">Jetzt abspielen</span>
                  <span className="sm:hidden">Play</span>
                </button>
                <button
                  onClick={() => {/* Favorites toggle */}}
                  className="flex items-center gap-2 px-6 md:px-8 py-3 md:py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all backdrop-blur-sm border border-white/20"
                >
                  <HiStar className="h-5 w-5 md:h-6 md:w-6" />
                  <span className="hidden sm:inline">Zu Favoriten</span>
                </button>
              </div>
            </div>
          </div>

          {/* Dot indicators */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {featuredItems.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setFeaturedIndex(idx)}
                className={clsx(
                  "h-2 rounded-full transition-all",
                  idx === featuredIndex ? "w-8 bg-amber-500" : "w-2 bg-white/40 hover:bg-white/60"
                )}
              />
            ))}
          </div>
        </div>
      )}

      {/* ==================== WELCOME BANNER & SEARCH ==================== */}
      <div className="mb-8 px-4 md:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className={clsx("font-black text-white mb-1", isLarge ? "text-4xl" : "text-2xl md:text-3xl")}>
              {greeting()}
            </h2>
            {playlistName && (
              <p className={clsx("text-amber-400 font-semibold", isLarge ? "text-lg" : "text-sm md:text-base")}>
                📡 {playlistName}
              </p>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <button
          onClick={() => router.push("/search")}
          className="w-full flex items-center gap-3 px-4 py-3 md:py-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all group cursor-pointer"
        >
          <HiMagnifyingGlass className="h-5 w-5 text-gray-500 group-hover:text-amber-400 transition-colors" />
          <span className="text-gray-500 group-hover:text-gray-400 transition-colors">Nach Kanälen, Filmen und Serien suchen...</span>
        </button>
      </div>

      {/* ==================== QUICK ACCESS SECTION ==================== */}
      <div className="px-4 md:px-6 lg:px-8 mb-12">
        <div className={clsx("grid gap-4", isLarge ? "grid-cols-2" : "grid-cols-2 md:grid-cols-4 gap-4 md:gap-5")}>
          {quickAccess.map((item) => (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={clsx(
                "group relative overflow-hidden rounded-2xl transition-all duration-300",
                "hover:shadow-2xl hover:-translate-y-1 active:scale-95",
                "focus-visible:ring-4 focus-visible:ring-amber-400 focus-visible:outline-none",
                `bg-gradient-to-br ${item.gradient}`,
                isLarge ? "p-10 aspect-square flex flex-col justify-center" : "p-6 md:p-8"
              )}
            >
              {/* Animated background glow */}
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-all" />
              <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-white/20 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-all" />

              <div className="relative flex flex-col items-center text-center z-10">
                <span className={clsx("mb-3 block transition-transform group-hover:scale-110", isLarge ? "text-6xl" : "text-4xl md:text-5xl")}>{item.emoji}</span>
                <h3 className={clsx("font-black text-white", isLarge ? "text-2xl" : "text-lg md:text-xl")}>{item.label}</h3>
                {item.href === "/favorites" && favorites.length > 0 && (
                  <span className="mt-2 bg-white/30 text-white px-3 py-1 rounded-full text-xs md:text-sm font-bold backdrop-blur-sm">
                    {favorites.length}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ==================== CONTINUE WATCHING ==================== */}
      {continueWatching.length > 0 && (
        <section className="px-4 md:px-6 lg:px-8 mb-12">
          <div className="flex items-center gap-3 mb-6">
            <HiPlay className="h-6 w-6 text-amber-400" />
            <h2 className={clsx("font-black text-white", isLarge ? "text-2xl" : "text-xl md:text-2xl")}>
              ▶️ Weiterschauen
            </h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
            {continueWatching.map((item) => {
              const progress = item.duration > 0 ? (item.position / item.duration) * 100 : 0;
              return (
                <button
                  key={item.streamId}
                  onClick={() => router.push(`/player/${item.streamId}?type=${item.streamType}`)}
                  className={clsx(
                    "flex-shrink-0 rounded-xl overflow-hidden group transition-all hover:shadow-2xl hover:-translate-y-2 active:scale-95",
                    "focus-visible:ring-4 focus-visible:ring-amber-400 focus-visible:outline-none",
                    isLarge ? "w-56" : "w-40 md:w-48"
                  )}
                >
                  <div className="relative aspect-video bg-[#22222e] flex items-center justify-center overflow-hidden">
                    {item.logo ? (
                      <img src={item.logo} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                    ) : (
                      <HiPlay className="h-8 w-8 text-gray-600" />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/50 transition-all duration-300">
                      <HiPlay className="h-12 w-12 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 scale-75 group-hover:scale-100" />
                    </div>
                    {/* Progress bar */}
                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/50">
                      <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-r-full" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                  <div className="p-3 bg-[#181820]/80 backdrop-blur-sm">
                    <p className={clsx("font-semibold text-white truncate", isLarge ? "text-base" : "text-sm")}>{item.name}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-500">{Math.round(progress)}% gesehen</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ==================== RECENTLY WATCHED ==================== */}
      {recentItems.length > 0 && (
        <section className="px-4 md:px-6 lg:px-8 mb-12">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-2xl">🕐</span>
            <h2 className={clsx("font-black text-white", isLarge ? "text-2xl" : "text-xl md:text-2xl")}>
              Zuletzt gesehen
            </h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
            {recentItems.slice(0, 15).map((item) => (
              <button
                key={item.id}
                onClick={() => router.push(`/player/${item.id}?type=${item.streamType}`)}
                className={clsx(
                  "flex-shrink-0 rounded-xl overflow-hidden group transition-all hover:shadow-xl hover:-translate-y-1 active:scale-95",
                  "focus-visible:ring-4 focus-visible:ring-amber-400 focus-visible:outline-none",
                  isLarge ? "w-40" : "w-28 md:w-32"
                )}
              >
                <div className="aspect-square bg-[#22222e] flex items-center justify-center overflow-hidden relative">
                  {item.logo ? (
                    <img src={item.logo} alt={item.name} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300" />
                  ) : (
                    <span className="text-4xl">
                      {item.streamType === "live" ? "📺" : item.streamType === "movie" ? "🎬" : "🎭"}
                    </span>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                    <HiPlay className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                <div className="p-2 bg-[#181820]/80">
                  <p className={clsx("font-medium text-white truncate", isLarge ? "text-sm" : "text-xs")}>{item.name}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ==================== FAVORITES PREVIEW ==================== */}
      {favorites.length > 0 && (
        <section className="px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <HiStar className="h-6 w-6 text-yellow-400" />
              <h2 className={clsx("font-black text-white", isLarge ? "text-2xl" : "text-xl md:text-2xl")}>
                Favoriten
              </h2>
            </div>
            <button
              onClick={() => router.push("/favorites")}
              className="text-yellow-400 hover:text-yellow-300 text-sm font-semibold transition-colors flex items-center gap-1"
            >
              Alle anzeigen →
            </button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
            {favorites.slice(0, 10).map((fav) => (
              <button
                key={fav.id}
                onClick={() => router.push(`/player/${fav.id}?type=${fav.streamType}`)}
                className={clsx(
                  "flex-shrink-0 rounded-xl overflow-hidden group transition-all hover:shadow-2xl hover:-translate-y-2 active:scale-95",
                  "focus-visible:ring-4 focus-visible:ring-yellow-400 focus-visible:outline-none",
                  "border-2 border-yellow-500/30 hover:border-yellow-400/60",
                  isLarge ? "w-40" : "w-28 md:w-32"
                )}
              >
                <div className="aspect-square bg-gradient-to-br from-yellow-600/20 to-amber-600/20 flex items-center justify-center overflow-hidden relative">
                  {fav.logo ? (
                    <img src={fav.logo} alt={fav.name} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300" />
                  ) : (
                    <span className="text-4xl">{fav.streamType === "live" ? "📺" : "🎬"}</span>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                    <HiPlay className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                <div className="p-2 bg-[#181820]/80">
                  <p className={clsx("font-medium text-white truncate", isLarge ? "text-sm" : "text-xs")}>{fav.name}</p>
                  {fav.channelNumber && <p className="text-xs text-yellow-400 font-bold">#{fav.channelNumber}</p>}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
