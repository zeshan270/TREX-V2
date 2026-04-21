"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import {
  HiArrowLeft,
  HiAdjustmentsHorizontal,
  HiCheckCircle,
  HiXMark,
} from "react-icons/hi2";
import { useAuthStore, useFavoritesStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import {
  fetchLiveStreams,
  fetchVodStreams,
  fetchSeries,
  buildStreamUrl,
  buildVodUrl,
} from "@/lib/api-client";
import type { Channel, Movie, Series, XtreamCredentials } from "@/types";
import SearchBar from "@/components/ui/SearchBar";
import ContentCard from "@/components/ui/ContentCard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorDisplay from "@/components/ui/ErrorDisplay";

type ContentType = "live" | "movie" | "series";

interface FilterOptions {
  sortBy: "name" | "rating" | "dateAdded";
  viewMode: "grid" | "list";
  itemsPerPage: 20 | 40 | 60;
}

export default function BrowseCategoryPage({
  params,
}: {
  params: { type: ContentType; categoryId: string };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useT();
  const credentials = useAuthStore((s) => s.credentials);
  const { toggle, isFavorite } = useFavoritesStore();

  const categoryName = searchParams.get("name") || "Kategorie";
  const { type, categoryId } = params;

  const [items, setItems] = useState<(Channel | Movie | Series)[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    sortBy: "name",
    viewMode: "grid",
    itemsPerPage: 40,
  });

  const isXtream = credentials && "serverUrl" in credentials;
  const creds = isXtream ? (credentials as XtreamCredentials) : null;

  // Fetch content based on type
  useEffect(() => {
    if (!isXtream || !creds) return;
    setLoading(true);
    setError(null);

    let promise: Promise<any[]>;

    if (type === "live") {
      promise = fetchLiveStreams(creds, categoryId);
    } else if (type === "movie") {
      promise = fetchVodStreams(creds, categoryId);
    } else {
      promise = fetchSeries(creds, categoryId);
    }

    promise
      .then((data) => {
        setItems(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [type, categoryId, credentials, isXtream, creds]);

  const filteredItems = useMemo(() => {
    let result = [...items];

    // Filter by search query
    if (searchQuery) {
      result = result.filter((item) => {
        const name = "name" in item ? item.name : "tvgName" in item ? item.tvgName : "";
        return name.toLowerCase().includes(searchQuery.toLowerCase());
      });
    }

    // Sort
    result.sort((a, b) => {
      const aName = "name" in a ? a.name : "tvgName" in a ? a.tvgName : "";
      const bName = "name" in b ? b.name : "tvgName" in b ? b.tvgName : "";

      if (filters.sortBy === "name") {
        return aName.localeCompare(bName);
      } else if (filters.sortBy === "rating") {
        const aRating = "rating" in a ? parseFloat(a.rating || "0") : 0;
        const bRating = "rating" in b ? parseFloat(b.rating || "0") : 0;
        return bRating - aRating;
      } else if (filters.sortBy === "dateAdded") {
        const aDate = "added" in a ? a.added : "lastModified" in a ? a.lastModified : "0";
        const bDate = "added" in b ? b.added : "lastModified" in b ? b.lastModified : "0";
        return bDate.localeCompare(aDate);
      }

      return 0;
    });

    return result;
  }, [items, searchQuery, filters.sortBy]);

  const displayItems = useMemo(() => {
    return filteredItems.slice(0, filters.itemsPerPage);
  }, [filteredItems, filters.itemsPerPage]);

  const handlePlay = (item: Channel | Movie | Series) => {
    if (!creds) return;

    let url = "";
    let itemId = "";

    if ("streamId" in item) {
      // Movie
      const movie = item as Movie;
      url = buildVodUrl(creds, movie.streamId, movie.containerExtension);
      itemId = String(movie.streamId);
    } else if (type === "series") {
      // Series
      const series = item as Series;
      itemId = String(series.seriesId);
      url = `${creds.serverUrl}:${creds.username}:${creds.password}:${series.seriesId}`;
    } else {
      // Live channel
      const channel = item as Channel;
      url = channel.url || buildStreamUrl(creds, channel.id);
      itemId = channel.id;
    }

    const referrer = window.location.pathname + window.location.search;
    router.push(
      `/player/${itemId}?type=${type}&url=${encodeURIComponent(url)}&name=${encodeURIComponent("name" in item ? item.name : "tvgName" in item ? item.tvgName : "")}&referrer=${encodeURIComponent(referrer)}`
    );
  };

  if (!isXtream || !creds) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <ErrorDisplay message="Nicht angemeldet" onRetry={() => router.push("/login")} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner size="lg" text={`${categoryName} wird geladen...`} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <ErrorDisplay message={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gradient-to-b from-[#0d0d14] to-[#1a1a24]">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#0d0d14]/80 backdrop-blur-md border-b border-[#2a2a38]">
        <div className="px-4 md:px-6 lg:px-8 py-6">
          {/* Back button and title */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <HiArrowLeft className="h-6 w-6 text-white" />
            </button>
            <div>
              <h1 className="text-3xl font-black text-white">{categoryName}</h1>
              <p className="text-gray-400 text-sm">
                {filteredItems.length} Inhalte gefunden
              </p>
            </div>
          </div>

          {/* Search and Filter Bar */}
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <SearchBar
                placeholder="In dieser Kategorie suchen..."
                onSearch={setSearchQuery}
                className="flex-1"
              />
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={clsx(
                  "px-4 py-2.5 rounded-xl font-semibold transition-all min-h-[44px] flex items-center gap-2",
                  showFilters
                    ? "bg-amber-500 text-white"
                    : "bg-[#181820] text-gray-300 border border-[#2a2a38] hover:border-amber-500/50"
                )}
              >
                <HiAdjustmentsHorizontal className="h-5 w-5" />
                <span className="hidden sm:inline">Filter</span>
              </button>
            </div>

            {/* Filter Panel */}
            {showFilters && (
              <div className="p-4 bg-[#181820] border border-[#2a2a38] rounded-xl space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {/* Sort By */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-400 mb-2">
                      Sortieren nach
                    </label>
                    <select
                      value={filters.sortBy}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          sortBy: e.target.value as any,
                        })
                      }
                      className="w-full px-3 py-2 bg-[#0d0d14] border border-[#2a2a38] rounded-lg text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="name">Nach Name</option>
                      <option value="rating">Nach Bewertung</option>
                      <option value="dateAdded">Nach Hinzugefügt</option>
                    </select>
                  </div>

                  {/* View Mode */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-400 mb-2">
                      Ansicht
                    </label>
                    <div className="flex gap-2">
                      {(["grid", "list"] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() =>
                            setFilters({ ...filters, viewMode: mode })
                          }
                          className={clsx(
                            "flex-1 py-2 px-3 rounded-lg font-semibold transition-all text-sm",
                            filters.viewMode === mode
                              ? "bg-amber-500 text-white"
                              : "bg-[#0d0d14] text-gray-400 border border-[#2a2a38]"
                          )}
                        >
                          {mode === "grid" ? "Gitter" : "Liste"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Items per page */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-400 mb-2">
                      Pro Seite
                    </label>
                    <select
                      value={filters.itemsPerPage}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          itemsPerPage: parseInt(e.target.value) as any,
                        })
                      }
                      className="w-full px-3 py-2 bg-[#0d0d14] border border-[#2a2a38] rounded-lg text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="20">20</option>
                      <option value="40">40</option>
                      <option value="60">60</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 md:px-6 lg:px-8 py-8">
        {displayItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <HiXMark className="h-16 w-16 text-gray-600 mb-4" />
            <h3 className="text-xl font-black text-white mb-2">
              Keine Inhalte gefunden
            </h3>
            <p className="text-gray-400">
              {searchQuery
                ? "Versuche eine andere Suche"
                : "Diese Kategorie ist leer"}
            </p>
          </div>
        ) : (
          <>
            {/* Grid View */}
            {filters.viewMode === "grid" && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {displayItems.map((item) => {
                  const itemId =
                    "streamId" in item
                      ? String(item.streamId)
                      : "seriesId" in item
                        ? String(item.seriesId)
                        : item.id;
                  const itemName =
                    "name" in item
                      ? item.name
                      : "tvgName" in item
                        ? item.tvgName
                        : "";
                  const itemLogo =
                    "logo" in item
                      ? item.logo
                      : "streamIcon" in item
                        ? item.streamIcon
                        : "cover" in item
                          ? item.cover
                          : "";
                  const rating =
                    "rating" in item ? item.rating : undefined;

                  return (
                    <ContentCard
                      key={itemId}
                      id={itemId}
                      title={itemName}
                      image={itemLogo}
                      rating={rating}
                      isFavorite={isFavorite(itemId)}
                      onFavoriteToggle={() =>
                        toggle({
                          id: itemId,
                          name: itemName,
                          streamType: type,
                          logo: itemLogo,
                        })
                      }
                      onClick={() => handlePlay(item)}
                    />
                  );
                })}
              </div>
            )}

            {/* List View */}
            {filters.viewMode === "list" && (
              <div className="space-y-2">
                {displayItems.map((item) => {
                  const itemId =
                    "streamId" in item
                      ? String(item.streamId)
                      : "seriesId" in item
                        ? String(item.seriesId)
                        : item.id;
                  const itemName =
                    "name" in item
                      ? item.name
                      : "tvgName" in item
                        ? item.tvgName
                        : "";
                  const itemLogo =
                    "logo" in item
                      ? item.logo
                      : "streamIcon" in item
                        ? item.streamIcon
                        : "cover" in item
                          ? item.cover
                          : "";
                  const rating =
                    "rating" in item ? item.rating : undefined;
                  const description =
                    "plot" in item ? item.plot : undefined;

                  return (
                    <button
                      key={itemId}
                      onClick={() => handlePlay(item)}
                      className="w-full flex gap-4 p-4 rounded-xl bg-[#181820] hover:bg-[#22222e] border border-[#2a2a38] hover:border-amber-500/30 transition-all text-left group"
                    >
                      {/* Thumbnail */}
                      <div className="relative w-16 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-[#0d0d14]">
                        {itemLogo && (
                          <img
                            src={itemLogo}
                            alt={itemName}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                          />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold truncate mb-1">
                          {itemName}
                        </p>
                        {rating && parseFloat(rating) > 0 && (
                          <p className="text-sm text-yellow-400 mb-2">
                            ★ {parseFloat(rating).toFixed(1)}
                          </p>
                        )}
                        {description && (
                          <p className="text-sm text-gray-400 line-clamp-2">
                            {description}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggle({
                              id: itemId,
                              name: itemName,
                              streamType: type,
                              logo: itemLogo,
                            });
                          }}
                          className={clsx(
                            "p-2 rounded-lg transition-all",
                            isFavorite(itemId)
                              ? "bg-yellow-500/20 text-yellow-400"
                              : "hover:bg-white/10 text-gray-400"
                          )}
                        >
                          <HiCheckCircle className="h-5 w-5" />
                        </button>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Show more info */}
            {filteredItems.length > displayItems.length && (
              <div className="mt-8 text-center">
                <p className="text-gray-400 mb-4">
                  Zeige {displayItems.length} von {filteredItems.length} Inhalten
                </p>
                <button
                  onClick={() =>
                    setFilters({
                      ...filters,
                      itemsPerPage:
                        filters.itemsPerPage === 20
                          ? 40
                          : filters.itemsPerPage === 40
                            ? 60
                            : 60,
                    })
                  }
                  className="px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold rounded-xl transition-all"
                >
                  Mehr laden
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
