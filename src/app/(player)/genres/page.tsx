"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import {
  HiSparkles,
  HiFilm,
  HiPlayCircle,
  HiTv,
  HiArrowRight,
  HiXMark,
} from "react-icons/hi2";
import { useAuthStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import {
  fetchLiveCategories,
  fetchVodCategories,
  fetchSeriesCategories,
} from "@/lib/api-client";
import type { Category, XtreamCredentials } from "@/types";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorDisplay from "@/components/ui/ErrorDisplay";

interface GenreGroup {
  type: "live" | "movie" | "series";
  icon: React.ReactNode;
  label: string;
  color: string;
  bgGradient: string;
  categories: Category[];
}

export default function GenresPage() {
  const router = useRouter();
  const t = useT();
  const credentials = useAuthStore((s) => s.credentials);

  const [genreGroups, setGenreGroups] = useState<GenreGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<"live" | "movie" | "series" | "all">("all");

  const isXtream = credentials && "serverUrl" in credentials;
  const creds = isXtream ? (credentials as XtreamCredentials) : null;

  useEffect(() => {
    if (!isXtream || !creds) return;
    setLoading(true);
    setError(null);

    Promise.all([
      fetchLiveCategories(creds),
      fetchVodCategories(creds),
      fetchSeriesCategories(creds),
    ])
      .then(([liveCategories, vodCategories, seriesCategories]) => {
        const groups: GenreGroup[] = [
          {
            type: "live",
            icon: <HiTv className="h-6 w-6" />,
            label: "Live Kanäle",
            color: "from-red-500 to-pink-500",
            bgGradient: "from-red-500/10 to-pink-500/10",
            categories: liveCategories,
          },
          {
            type: "movie",
            icon: <HiFilm className="h-6 w-6" />,
            label: "Filme",
            color: "from-blue-500 to-cyan-500",
            bgGradient: "from-blue-500/10 to-cyan-500/10",
            categories: vodCategories,
          },
          {
            type: "series",
            icon: <HiPlayCircle className="h-6 w-6" />,
            label: "Serien",
            color: "from-purple-500 to-pink-500",
            bgGradient: "from-purple-500/10 to-pink-500/10",
            categories: seriesCategories,
          },
        ];
        setGenreGroups(groups);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [credentials, isXtream, creds]);

  const filteredGroups = useMemo(() => {
    let groups = genreGroups;

    if (selectedType !== "all") {
      groups = groups.filter((g) => g.type === selectedType);
    }

    if (searchQuery) {
      groups = groups.map((g) => ({
        ...g,
        categories: g.categories.filter((cat) =>
          cat.categoryName.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      }));
    }

    return groups.filter((g) => g.categories.length > 0);
  }, [genreGroups, selectedType, searchQuery]);

  const totalGenres = genreGroups.reduce(
    (sum, g) => sum + g.categories.length,
    0
  );

  if (!isXtream || !creds) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <ErrorDisplay
          message={t("common.notLoggedIn") || "Bitte zuerst anmelden"}
          onRetry={() => router.push("/login")}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner size="lg" text="Genres werden geladen..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <ErrorDisplay
          message={error}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gradient-to-b from-[#0d0d14] to-[#1a1a24] overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#0d0d14]/80 backdrop-blur-md border-b border-[#2a2a38]">
        <div className="px-4 md:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3 mb-4">
            <HiSparkles className="h-8 w-8 text-purple-400" />
            <div>
              <h1 className="text-3xl font-black text-white">Alle Genres</h1>
              <p className="text-gray-400 text-sm">
                {totalGenres} Genres verfügbar • Entdecke neue Inhalte
              </p>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col gap-4">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Genres durchsuchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 bg-[#181820] border border-[#2a2a38] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  <HiXMark className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Type Filter */}
            <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
              {(["all", "live", "movie", "series"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={clsx(
                    "flex-shrink-0 px-5 py-2.5 rounded-full font-semibold text-sm transition-all whitespace-nowrap",
                    selectedType === type
                      ? "bg-purple-500 text-white shadow-lg shadow-purple-500/50"
                      : "bg-[#181820] text-gray-300 border border-[#2a2a38] hover:border-purple-500/50"
                  )}
                >
                  {type === "all" && "Alle"}
                  {type === "live" && "Live TV"}
                  {type === "movie" && "Filme"}
                  {type === "series" && "Serien"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 md:px-6 lg:px-8 py-8">
        {filteredGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <HiSparkles className="h-16 w-16 text-gray-600 mb-4" />
            <h3 className="text-xl font-black text-white mb-2">
              Keine Genres gefunden
            </h3>
            <p className="text-gray-400">
              Versuche eine andere Suche oder Filteroptionen
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {filteredGroups.map((group) => (
              <section key={group.type}>
                {/* Section Header */}
                <div className="flex items-center gap-3 mb-6">
                  <div
                    className={clsx(
                      "p-3 rounded-xl bg-gradient-to-br",
                      group.bgGradient
                    )}
                  >
                    <div className={clsx("text-white", `text-${group.color}`)}>
                      {group.icon}
                    </div>
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white">
                      {group.label}
                    </h2>
                    <p className="text-gray-400 text-sm">
                      {group.categories.length} verfügbar
                    </p>
                  </div>
                </div>

                {/* Genre Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {group.categories.map((category) => (
                    <button
                      key={category.categoryId}
                      onClick={() =>
                        router.push(
                          `/browse/${group.type}/${category.categoryId}?name=${encodeURIComponent(category.categoryName)}`
                        )
                      }
                      className={clsx(
                        "group relative p-6 rounded-2xl bg-gradient-to-br border border-[#2a2a38]",
                        "transition-all duration-300 hover:scale-105 hover:shadow-xl",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500",
                        group.bgGradient
                      )}
                    >
                      {/* Background decoration */}
                      <div
                        className={clsx(
                          "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl",
                          `bg-gradient-to-br ${group.color}`,
                          "blur-xl -z-10"
                        )}
                      />

                      {/* Content */}
                      <div className="relative h-full flex flex-col justify-between">
                        <div className="flex-1">
                          <p className="text-2xl font-black text-white mb-2 group-group-hover:text-amber-300 transition-colors">
                            {category.categoryName}
                          </p>
                        </div>

                        {/* Arrow indicator */}
                        <div className="flex items-center justify-between">
                          <span className="inline-block px-3 py-1 bg-white/10 rounded-full text-xs font-semibold text-gray-300">
                            Erkunden
                          </span>
                          <HiArrowRight className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
