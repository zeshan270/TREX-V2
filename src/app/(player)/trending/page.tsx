"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { HiFire, HiSparkles, HiArrowTrendingUp } from "react-icons/hi2";
import { useRecentStore, useFavoritesStore, usePlayerStore } from "@/lib/store";
import { SkeletonGrid } from "@/components/ui/Skeleton";
import ContentCard from "@/components/ui/ContentCard";

export default function TrendingPage() {
  const router = useRouter();
  const { items: recentItems } = useRecentStore();
  const { favorites } = useFavoritesStore();
  const { positions } = usePlayerStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // Calculate trending score based on recent views and watch time
  const trendingItems = recentItems
    .map((item) => {
      const position = positions[item.id];
      const watchTime = position ? position.position : 0;
      const totalWatchTime = position ? position.duration : 0;
      const watchPercentage = totalWatchTime > 0 ? (watchTime / totalWatchTime) * 100 : 0;

      // Trending score = recency + watch percentage
      const recencyScore = 100 - (Date.now() - item.lastWatched) / (24 * 60 * 60 * 1000) * 10;
      const trendingScore = (watchPercentage / 100) * 50 + Math.max(0, recencyScore);

      return { ...item, trendingScore };
    })
    .sort((a, b) => b.trendingScore - a.trendingScore)
    .slice(0, 20);

  const topWatched = recentItems.slice(0, 10);
  const mostFavorited = favorites.slice(0, 10);

  return (
    <div className="min-h-full bg-gradient-to-b from-[#0d0d14] to-[#1a1a24] overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#0d0d14]/80 backdrop-blur-md border-b border-[#2a2a38]">
        <div className="px-4 md:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3 mb-2">
            <HiFire className="h-8 w-8 text-orange-400" />
            <h1 className="text-3xl font-black text-white">Trending Jetzt</h1>
          </div>
          <p className="text-gray-400">Die beliebtesten und meistgesehenen Inhalte</p>
        </div>
      </div>

      <div className="px-4 md:px-6 lg:px-8 py-8 space-y-12">
        {/* Featured Trending */}
        {trendingItems.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-6">
              <HiArrowTrendingUp className="h-6 w-6 text-orange-400" />
              <h2 className="text-2xl font-black text-white">🔥 Das Heißeste jetzt</h2>
            </div>
            {loading ? (
              <SkeletonGrid count={4} />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {trendingItems.slice(0, 4).map((item) => (
                  <div key={item.id} className="relative group">
                    <ContentCard
                      id={item.id}
                      title={item.name}
                      image={item.logo}
                      onClick={() => router.push(`/player/${item.id}?type=${item.streamType}`)}
                      isFavorite={favorites.some((f) => f.id === item.id)}
                      onFavoriteToggle={() => {}}
                    />
                    {/* Trending badge */}
                    <div className="absolute top-3 right-3 bg-gradient-to-r from-orange-600 to-red-600 text-white px-3 py-1 rounded-full text-xs font-black flex items-center gap-1 shadow-lg">
                      <HiFire className="h-3 w-3" />
                      Trending
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Top Watched */}
        {topWatched.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-6">
              <HiSparkles className="h-6 w-6 text-yellow-400" />
              <h2 className="text-2xl font-black text-white">👑 Meistgesehen</h2>
            </div>
            {loading ? (
              <SkeletonGrid count={5} />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {topWatched.map((item, idx) => (
                  <div key={item.id} className="relative group">
                    <div className="absolute -top-3 -left-3 z-10 bg-gradient-to-br from-yellow-500 to-amber-500 text-white h-10 w-10 rounded-full flex items-center justify-center font-black text-lg shadow-lg">
                      #{idx + 1}
                    </div>
                    <ContentCard
                      id={item.id}
                      title={item.name}
                      image={item.logo}
                      onClick={() => router.push(`/player/${item.id}?type=${item.streamType}`)}
                      isFavorite={favorites.some((f) => f.id === item.id)}
                      onFavoriteToggle={() => {}}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Most Favorited */}
        {mostFavorited.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-6">
              <span className="text-2xl">⭐</span>
              <h2 className="text-2xl font-black text-white">Lieblingsinhalte</h2>
            </div>
            {loading ? (
              <SkeletonGrid count={5} />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {mostFavorited.map((item) => (
                  <ContentCard
                    key={item.id}
                    id={item.id}
                    title={item.name}
                    image={item.logo}
                    onClick={() => router.push(`/player/${item.id}?type=${item.streamType}`)}
                    isFavorite={true}
                    onFavoriteToggle={() => {}}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Empty State */}
        {trendingItems.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <HiFire className="h-16 w-16 text-orange-400/30 mb-4" />
            <h3 className="text-xl font-black text-white mb-2">Keine Trending-Inhalte</h3>
            <p className="text-gray-400 max-w-sm">
              Schauen Sie sich einige Inhalte an, um Trending-Daten zu sehen.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
