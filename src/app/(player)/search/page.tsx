"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import {
  HiMagnifyingGlass,
  HiXMark,
  HiClock,
  HiViewGrid,
  HiViewList,
  HiAdjustmentsHorizontal,
} from "react-icons/hi2";
import { useAuthStore, useFavoritesStore, useRecentStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import {
  fetchLiveStreams,
  fetchVodStreams,
  fetchSeries,
} from "@/lib/api-client";
import type { Channel, Movie, Series, XtreamCredentials } from "@/types";
import ContentCard from "@/components/ui/ContentCard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

type ContentType = "live" | "movie" | "series" | "all";
type SortBy = "name" | "rating" | "relevant";

interface SearchFilters {
  type: ContentType;
  sortBy: SortBy;
  viewMode: "grid" | "list";
}

interface SearchResult {
  id: string;
  title: string;
  image: string;
  type: ContentType;
  rating?: string;
  description?: string;
  object: Channel | Movie | Series;
}

export default function SearchPage() {
  const router = useRouter();
  const t = useT();
  const credentials = useAuthStore((s) => s.credentials);
  const { toggle, isFavorite } = useFavoritesStore();
  const { add: addRecent } = useRecentStore();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    type: "all",
    sortBy: "relevant",
    viewMode: "grid",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const isXtream = credentials && "serverUrl" in credentials;
  const creds = isXtream ? (credentials as XtreamCredentials) : null;

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("trex-recent-searches");
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored).slice(0, 10));
      } catch {}
    }
  }, []);

  // Generate suggestions based on query
  useEffect(() => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    const matching = recentSearches.filter((s) =>
      s.toLowerCase().includes(query.toLowerCase())
    );
    setSuggestions(matching.slice(0, 5));
  }, [query, recentSearches]);

  // Perform search
  const performSearch = useCallback(
    async (searchQuery: string) => {
      if (!isXtream || !creds || !searchQuery.trim()) {
        setResults([]);
        setHasSearched(false);
        return;
      }

      setLoading(true);
      setHasSearched(true);
      const q = searchQuery.toLowerCase();

      try {
        const allResults: SearchResult[] = [];

        // Search Live TV
        if (filters.type === "live" || filters.type === "all") {
          try {
            const liveStreams = await fetchLiveStreams(creds);
            const matching = liveStreams.filter((ch) =>
              ch.name.toLowerCase().includes(q)
            );
            allResults.push(
              ...matching.map((ch) => ({
                id: ch.id,
                title: ch.name,
                image: ch.logo,
                type: "live" as const,
                object: ch,
              }))
            );
          } catch {}
        }

        // Search Movies
        if (filters.type === "movie" || filters.type === "all") {
          try {
            const movies = await fetchVodStreams(creds);
            const matching = movies.filter((m) =>
              m.name.toLowerCase().includes(q)
            );
            allResults.push(
              ...matching.map((m) => ({
                id: String(m.streamId),
                title: m.name,
                image: m.streamIcon,
                type: "movie" as const,
                rating: m.rating,
                description: m.plot,
                object: m,
              }))
            );
          } catch {}
        }

        // Search Series
        if (filters.type === "series" || filters.type === "all") {
          try {
            const series = await fetchSeries(creds);
            const matching = series.filter((s) =>
              s.name.toLowerCase().includes(q)
            );
            allResults.push(
              ...matching.map((s) => ({
                id: String(s.seriesId),
                title: s.name,
                image: s.cover,
                type: "series" as const,
                rating: s.rating,
                description: s.plot,
                object: s,
              }))
            );
          } catch {}
        }

        // Sort results
        if (filters.sortBy === "name") {
          allResults.sort((a, b) => a.title.localeCompare(b.title));
        } else if (filters.sortBy === "rating") {
          allResults.sort(
            (a, b) =>
              (parseFloat(b.rating || "0") || 0) -
              (parseFloat(a.rating || "0") || 0)
          );
        }

        setResults(allResults);

        // Save to recent searches
        const newRecent = [
          searchQuery,
          ...recentSearches.filter((s) => s !== searchQuery),
        ].slice(0, 10);
        setRecentSearches(newRecent);
        localStorage.setItem("trex-recent-searches", JSON.stringify(newRecent));
      } catch (err) {
        console.error("Search error:", err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [filters, credentials, isXtream, creds, recentSearches]
  );

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        performSearch(query);
      } else {
        setResults([]);
        setHasSearched(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, performSearch]);

  const displayedResults = useMemo(() => {
    return results.slice(0, 100);
  }, [results]);

  const handleResultClick = (result: SearchResult) => {
    addRecent({
      id: result.id,
      name: result.title,
      streamType: result.type === "all" ? "live" : result.type,
      logo: result.image,
    });
  };

  return (
    <div className="min-h-full bg-gradient-to-b from-[#0d0d14] to-[#1a1a24]">
      {/* Header with Search */}
      <div className="sticky top-0 z-40 bg-[#0d0d14]/80 backdrop-blur-md border-b border-[#2a2a38]">
        <div className="px-4 md:px-6 lg:px-8 py-4">
          {/* Search Input */}
          <div className="mb-4">
            <div className="relative">
              <HiMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Kanäle, Filme, Serien durchsuchen..."
                className="w-full pl-11 pr-10 py-3 bg-[#181820] border border-[#2a2a38] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                autoFocus
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  <HiXMark className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Suggestions Dropdown */}
            {query && suggestions.length > 0 && (
              <div className="absolute top-full left-4 right-4 mt-2 bg-[#181820] border border-[#2a2a38] rounded-xl overflow-hidden shadow-xl z-50">
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setQuery(suggestion);
                      searchInputRef.current?.focus();
                    }}
                    className="w-full px-4 py-3 text-left text-gray-300 hover:bg-[#22222e] transition-colors flex items-center gap-2 border-b border-[#2a2a38] last:border-b-0"
                  >
                    <HiClock className="h-4 w-4 text-gray-500" />
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filter Controls */}
          {hasSearched && (
            <div className="flex gap-2 items-center overflow-x-auto pb-2 hide-scrollbar">
              {/* Type Filter */}
              {(["all", "live", "movie", "series"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilters({ ...filters, type })}
                  className={clsx(
                    "flex-shrink-0 px-4 py-2 rounded-full font-medium text-sm transition-all whitespace-nowrap",
                    filters.type === type
                      ? "bg-purple-500 text-white shadow-lg shadow-purple-500/50"
                      : "bg-[#181820] text-gray-400 border border-[#2a2a38] hover:border-purple-500/50"
                  )}
                >
                  {type === "all" && "Alles"}
                  {type === "live" && "Live"}
                  {type === "movie" && "Filme"}
                  {type === "series" && "Serien"}
                </button>
              ))}

              <div className="flex-1" />

              {/* View Mode */}
              <div className="flex gap-1 bg-[#181820] rounded-lg p-1">
                {(["grid", "list"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setFilters({ ...filters, viewMode: mode })}
                    className={clsx(
                      "p-2 rounded transition-colors",
                      filters.viewMode === mode
                        ? "bg-purple-500 text-white"
                        : "text-gray-400 hover:text-gray-300"
                    )}
                  >
                    {mode === "grid" ? (
                      <HiViewGrid className="h-5 w-5" />
                    ) : (
                      <HiViewList className="h-5 w-5" />
                    )}
                  </button>
                ))}
              </div>

              {/* Filter Panel */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={clsx(
                  "flex-shrink-0 px-3 py-2 rounded-lg transition-all",
                  showFilters
                    ? "bg-purple-500 text-white"
                    : "bg-[#181820] text-gray-400 hover:text-gray-300"
                )}
              >
                <HiAdjustmentsHorizontal className="h-5 w-5" />
              </button>
            </div>
          )}

          {/* Advanced Filter Panel */}
          {showFilters && hasSearched && (
            <div className="mt-4 p-4 bg-[#181820] border border-[#2a2a38] rounded-xl">
              <label className="block text-sm font-semibold text-gray-400 mb-2">
                Sortieren nach
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    sortBy: e.target.value as SortBy,
                  })
                }
                className="w-full px-3 py-2 bg-[#0d0d14] border border-[#2a2a38] rounded-lg text-white focus:outline-none focus:border-purple-500"
              >
                <option value="relevant">Relevant</option>
                <option value="name">Nach Name</option>
                <option value="rating">Nach Bewertung</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 md:px-6 lg:px-8 py-8">
        {!query ? (
          // Empty State with Recent Searches
          <div className="max-w-4xl">
            <h2 className="text-xl font-black text-white mb-4 flex items-center gap-2">
              <HiClock className="h-5 w-5 text-gray-500" />
              Letzte Suchanfragen
            </h2>

            {recentSearches.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {recentSearches.map((search, idx) => (
                  <button
                    key={idx}
                    onClick={() => setQuery(search)}
                    className="px-4 py-3 bg-[#181820] hover:bg-[#22222e] border border-[#2a2a38] rounded-lg text-gray-300 text-sm font-medium transition-all text-left truncate"
                  >
                    {search}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Noch keine Suchanfragen</p>
            )}
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-16">
            <LoadingSpinner text="Suche wird durchgeführt..." />
          </div>
        ) : displayedResults.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <HiMagnifyingGlass className="h-16 w-16 text-gray-600 mb-4" />
            <h3 className="text-xl font-black text-white mb-2">Keine Ergebnisse</h3>
            <p className="text-gray-400">
              Versuche einen anderen Suchbegriff
            </p>
          </div>
        ) : (
          <>
            {/* Results Info */}
            <div className="mb-6">
              <p className="text-gray-400 text-sm">
                {displayedResults.length} Ergebnisse für "{query}"
              </p>
            </div>

            {/* Grid View */}
            {filters.viewMode === "grid" && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {displayedResults.map((result) => (
                  <ContentCard
                    key={`${result.type}-${result.id}`}
                    id={result.id}
                    title={result.title}
                    image={result.image}
                    rating={result.rating}
                    isFavorite={isFavorite(result.id)}
                    onFavoriteToggle={() =>
                      toggle({
                        id: result.id,
                        name: result.title,
                        streamType: result.type === "all" ? "live" : result.type,
                        logo: result.image,
                      })
                    }
                    onClick={() => {
                      handleResultClick(result);
                      router.push(
                        `/${result.type === "all" ? "movies" : result.type}/${result.id}`
                      );
                    }}
                  />
                ))}
              </div>
            )}

            {/* List View */}
            {filters.viewMode === "list" && (
              <div className="space-y-2">
                {displayedResults.map((result) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => {
                      handleResultClick(result);
                      router.push(
                        `/${result.type === "all" ? "movies" : result.type}/${result.id}`
                      );
                    }}
                    className="w-full flex gap-4 p-4 rounded-xl bg-[#181820] hover:bg-[#22222e] border border-[#2a2a38] hover:border-purple-500/30 transition-all text-left group"
                  >
                    {result.image && (
                      <div className="relative w-16 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-[#0d0d14]">
                        <img
                          src={result.image}
                          alt={result.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                        />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold truncate mb-1">
                        {result.title}
                      </p>
                      <span className="inline-block px-2 py-1 bg-[#0d0d14] rounded text-xs font-medium text-gray-400 mb-2">
                        {result.type === "all" && "Andere"}
                        {result.type === "live" && "Live TV"}
                        {result.type === "movie" && "Film"}
                        {result.type === "series" && "Serie"}
                      </span>
                      {result.rating &&
                        parseFloat(result.rating) > 0 && (
                          <p className="text-sm text-yellow-400 mb-1">
                            ★ {parseFloat(result.rating).toFixed(1)}
                          </p>
                        )}
                      {result.description && (
                        <p className="text-sm text-gray-400 line-clamp-2">
                          {result.description}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
