"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { HiStar, HiTrash, HiArrowUp, HiArrowDown, HiAdjustmentsHorizontal, HiEye } from "react-icons/hi2";
import { useFavoritesStore } from "@/lib/store";
import { ConfirmDialog } from "@/components/ui/Modal";
import ContentCard from "@/components/ui/ContentCard";

type SortOption = "date" | "name" | "type";
type FilterOption = "all" | "live" | "movie" | "series";

export default function FavoritesPage() {
  const router = useRouter();
  const { favorites, remove, reorder } = useFavoritesStore();
  const [sortBy, setSortBy] = useState<SortOption>("date");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  // Filter favorites
  const filtered = favorites.filter((fav) => {
    if (filterBy === "all") return true;
    return fav.streamType === filterBy;
  });

  // Sort favorites
  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.name.localeCompare(b.name);
      case "type":
        return a.streamType.localeCompare(b.streamType);
      case "date":
      default:
        return 0; // Keep original order (date added)
    }
  });

  const handleDeleteFavorite = (id: string) => {
    remove(id);
    setShowConfirmDelete(null);
  };

  const handleDragStart = (id: string) => {
    setDraggedItem(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetId: string) => {
    if (!draggedItem || draggedItem === targetId) return;

    const draggedIndex = sorted.findIndex((f) => f.id === draggedItem);
    const targetIndex = sorted.findIndex((f) => f.id === targetId);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      const newOrder = [...sorted];
      [newOrder[draggedIndex], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[draggedIndex]];
      // Update order in store
      newOrder.forEach((fav, idx) => {
        reorder(fav.id, idx);
      });
    }
    setDraggedItem(null);
  };

  return (
    <div className="min-h-full bg-gradient-to-b from-[#0d0d14] to-[#1a1a24] overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#0d0d14]/80 backdrop-blur-md border-b border-[#2a2a38]">
        <div className="px-4 md:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3 mb-4">
            <HiStar className="h-8 w-8 text-yellow-400" />
            <div>
              <h1 className="text-3xl font-black text-white">Favoriten</h1>
              <p className="text-gray-400 text-sm mt-1">{favorites.length} gespeicherte Inhalte</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap gap-3">
            {/* Filter */}
            <div className="flex gap-2">
              {[
                { id: "all", label: "Alle" },
                { id: "live", label: "Live TV" },
                { id: "movie", label: "Filme" },
                { id: "series", label: "Serien" },
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setFilterBy(filter.id as FilterOption)}
                  className={clsx(
                    "px-4 py-2 rounded-lg font-semibold text-sm transition-all",
                    filterBy === filter.id
                      ? "bg-amber-500 text-white"
                      : "bg-white/10 text-gray-400 hover:bg-white/20"
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm font-semibold transition-all hover:bg-white/20"
            >
              <option value="date">Hinzugefügt</option>
              <option value="name">Name (A-Z)</option>
              <option value="type">Typ</option>
            </select>

            {/* View Mode */}
            <div className="flex gap-2 ml-auto">
              <button
                onClick={() => setViewMode("grid")}
                className={clsx(
                  "px-4 py-2 rounded-lg font-semibold text-sm transition-all",
                  viewMode === "grid"
                    ? "bg-amber-500 text-white"
                    : "bg-white/10 text-gray-400 hover:bg-white/20"
                )}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={clsx(
                  "px-4 py-2 rounded-lg font-semibold text-sm transition-all",
                  viewMode === "list"
                    ? "bg-amber-500 text-white"
                    : "bg-white/10 text-gray-400 hover:bg-white/20"
                )}
              >
                List
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 md:px-6 lg:px-8 py-8">
        {favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <HiStar className="h-16 w-16 text-yellow-400/30 mb-4" />
            <h3 className="text-xl font-black text-white mb-2">Keine Favoriten</h3>
            <p className="text-gray-400 max-w-sm mb-6">
              Markieren Sie Ihre Lieblingskanäle und Inhalte, um sie hier zu speichern.
            </p>
            <button
              onClick={() => router.push("/live")}
              className="px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold rounded-xl transition-all"
            >
              Zum Live TV gehen
            </button>
          </div>
        ) : (
          <>
            {sorted.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                Keine Favoriten in dieser Kategorie
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {sorted.map((fav) => (
                  <div
                    key={fav.id}
                    draggable
                    onDragStart={() => handleDragStart(fav.id)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(fav.id)}
                    className={clsx(
                      "relative group cursor-move transition-all",
                      draggedItem === fav.id && "opacity-50"
                    )}
                  >
                    <ContentCard
                      id={fav.id}
                      title={fav.name}
                      image={fav.logo}
                      isFavorite={true}
                      onClick={() => router.push(`/player/${fav.id}?type=${fav.streamType}`)}
                      onFavoriteToggle={() => handleDeleteFavorite(fav.id)}
                    />
                    {/* Type badge */}
                    <div className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-black/50 backdrop-blur-sm text-white text-xs font-bold">
                      {fav.streamType === "live"
                        ? "📺"
                        : fav.streamType === "movie"
                          ? "🎬"
                          : "🎭"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {sorted.map((fav, idx) => (
                  <div
                    key={fav.id}
                    draggable
                    onDragStart={() => handleDragStart(fav.id)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(fav.id)}
                    className={clsx(
                      "flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 transition-all border border-transparent hover:border-white/10 cursor-move group",
                      draggedItem === fav.id && "opacity-50 bg-white/5"
                    )}
                  >
                    {/* Index */}
                    <div className="text-lg font-black text-amber-400 w-8 text-center">
                      {idx + 1}
                    </div>

                    {/* Image */}
                    <img
                      src={fav.logo || ""}
                      alt={fav.name}
                      className="h-12 w-12 rounded-lg object-contain bg-white/10"
                    />

                    {/* Info */}
                    <div className="flex-1">
                      <p className="font-semibold text-white">{fav.name}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {fav.streamType === "live"
                          ? "Live TV"
                          : fav.streamType === "movie"
                            ? "Film"
                            : "Serie"}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => router.push(`/player/${fav.id}?type=${fav.streamType}`)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-all text-blue-400"
                      >
                        <HiEye className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setShowConfirmDelete(fav.id)}
                        className="p-2 hover:bg-red-500/10 rounded-lg transition-all text-red-400"
                      >
                        <HiTrash className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirm */}
      {showConfirmDelete && (
        <ConfirmDialog
          isOpen={true}
          title="Aus Favoriten entfernen"
          message="Sind Sie sicher, dass Sie diesen Inhalt aus Ihren Favoriten entfernen möchten?"
          confirmText="Entfernen"
          cancelText="Abbrechen"
          isDangerous={true}
          onConfirm={() => handleDeleteFavorite(showConfirmDelete)}
          onCancel={() => setShowConfirmDelete(null)}
        />
      )}
    </div>
  );
}
