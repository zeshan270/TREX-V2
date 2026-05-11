"use client";

/* eslint-disable @next/next/no-img-element */
import clsx from "clsx";
import { HiHeart, HiOutlineHeart, HiStar, HiPlay, HiTv, HiFilm, HiRectangleStack } from "react-icons/hi2";
import { useState, useCallback } from "react";

interface ContentCardProps {
  id: string;
  title: string;
  image?: string;
  rating?: string | number;
  year?: string;
  subtitle?: string;
  isFavorite?: boolean;
  onFavoriteToggle?: () => void;
  onClick?: () => void;
  className?: string;
  channelNumber?: number;
  watchProgress?: number; // 0-100
  streamType?: "live" | "movie" | "series";
  isLive?: boolean;
}

export default function ContentCard({
  id,
  title,
  image,
  rating,
  year,
  subtitle,
  isFavorite,
  onFavoriteToggle,
  onClick,
  className,
  channelNumber,
  watchProgress,
  streamType,
  isLive,
}: ContentCardProps) {
  const [imgError, setImgError] = useState(false);
  const [hovered, setHovered] = useState(false);
  const numRating = typeof rating === "string" ? parseFloat(rating) : rating;
  const ratingNum = numRating && !isNaN(numRating) ? numRating : 0;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick?.();
      }
    },
    [onClick]
  );

  const TypeIcon = streamType === "live" ? HiTv : streamType === "series" ? HiRectangleStack : HiFilm;

  return (
    <div
      tabIndex={0}
      role="button"
      className={clsx(
        "group relative overflow-hidden rounded-xl cursor-pointer",
        "bg-[#111118] border border-white/5",
        "transition-all duration-300 hover:scale-[1.03] hover:border-white/15 hover:shadow-2xl hover:shadow-black/60",
        "focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none",
        className
      )}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Channel number badge */}
      {channelNumber !== undefined && channelNumber > 0 && (
        <div className="absolute top-2 left-2 z-20 flex h-7 min-w-[1.75rem] items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 px-2 shadow-lg shadow-purple-900/50">
          <span className="text-xs font-bold text-white">{channelNumber}</span>
        </div>
      )}

      {/* LIVE badge */}
      {(isLive || streamType === "live") && (
        <div className="absolute top-2 left-2 z-20 flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600 shadow-lg">
          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
          <span className="text-[10px] font-bold text-white tracking-wider">LIVE</span>
        </div>
      )}

      {/* Image */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#0d0d18]">
        {image && !imgError ? (
          <img
            src={image}
            alt={title}
            className={clsx(
              "absolute inset-0 h-full w-full object-cover transition-transform duration-500",
              hovered ? "scale-110" : "scale-100"
            )}
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-purple-900/30 to-blue-900/20 gap-3">
            <TypeIcon className="h-10 w-10 text-gray-600" />
            <span className="text-lg font-bold text-gray-600">
              {title.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* Hover overlay with play button */}
        <div className={clsx(
          "absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent",
          "flex flex-col items-center justify-center gap-2",
          "transition-opacity duration-300",
          hovered ? "opacity-100" : "opacity-0"
        )}>
          <div className={clsx(
            "flex h-14 w-14 items-center justify-center rounded-full",
            "bg-white/20 backdrop-blur-sm border border-white/30",
            "transition-transform duration-300",
            hovered ? "scale-100" : "scale-75"
          )}>
            <HiPlay className="h-7 w-7 text-white ml-0.5" />
          </div>
        </div>

        {/* Favorite button */}
        {onFavoriteToggle && (
          <button
            onClick={(e) => { e.stopPropagation(); onFavoriteToggle(); }}
            tabIndex={-1}
            className={clsx(
              "absolute top-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full",
              "backdrop-blur-sm transition-all duration-200",
              isFavorite
                ? "bg-red-500/80 hover:bg-red-600/90 scale-100"
                : "bg-black/50 hover:bg-black/70 opacity-0 group-hover:opacity-100"
            )}
            aria-label={isFavorite ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"}
          >
            {isFavorite ? (
              <HiHeart className="h-4 w-4 text-white" />
            ) : (
              <HiOutlineHeart className="h-4 w-4 text-white" />
            )}
          </button>
        )}

        {/* Watch progress bar */}
        {watchProgress !== undefined && watchProgress > 2 && watchProgress < 98 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-r-full"
              style={{ width: `${watchProgress}%` }}
            />
          </div>
        )}

        {/* Rating badge (top left if no channel number) */}
        {ratingNum >= 7 && channelNumber === undefined && !(isLive || streamType === "live") && (
          <div className="absolute top-2 left-2 z-20 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-yellow-500/90 shadow">
            <HiStar className="h-3 w-3 text-white" />
            <span className="text-[10px] font-bold text-white">{ratingNum.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="text-sm font-semibold text-white truncate leading-tight group-hover:text-purple-300 transition-colors">
          {title}
        </h3>
        <div className="mt-1 flex items-center gap-2 flex-wrap">
          {ratingNum > 0 && ratingNum < 7 && (
            <div className="flex items-center gap-0.5">
              <HiStar className="h-3 w-3 text-yellow-400" />
              <span className="text-[10px] text-gray-400">{ratingNum.toFixed(1)}</span>
            </div>
          )}
          {year && <span className="text-[10px] text-gray-500">{year}</span>}
          {watchProgress !== undefined && watchProgress > 2 && watchProgress < 98 && (
            <span className="text-[10px] text-purple-400 font-medium">{Math.round(watchProgress)}% gesehen</span>
          )}
        </div>
        {subtitle && (
          <p className="mt-0.5 text-[11px] text-gray-500 truncate">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
