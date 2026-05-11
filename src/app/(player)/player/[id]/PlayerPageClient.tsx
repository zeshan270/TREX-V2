"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuthStore, usePlayerStore, useRecentStore, useFavoritesStore } from "@/lib/store";
import { nav } from "@/lib/navigate";
import { fetchEpg, fetchFreeEpg, buildStreamUrl } from "@/lib/api-client";
import { deriveQuality } from "@/components/player/EpgOverlay";
import VideoPlayer from "@/components/player/VideoPlayer";
import ChannelSwitcher from "@/components/player/ChannelSwitcher";
import EpgOverlay from "@/components/player/EpgOverlay";
import type { EpgProgram } from "@/types";
import { HiListBullet, HiChevronUp, HiChevronDown, HiArrowLeft, HiInformationCircle } from "react-icons/hi2";

export default function PlayerPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const id = params.id as string;
  const type = searchParams.get("type") || "live";
  const urlParam = searchParams.get("url");
  const nameParam = searchParams.get("name");
  const referrer = searchParams.get("referrer");

  const credentials = useAuthStore((s) => s.credentials);
  const { currentChannel, playlist, setChannel, next, prev, savePosition, getPosition } =
    usePlayerStore();
  const addRecent = useRecentStore((s) => s.add);
  const favorites = useFavoritesStore((s) => s.favorites);

  const [streamUrl, setStreamUrl] = useState("");
  const [epgPrograms, setEpgPrograms] = useState<EpgProgram[]>([]);
  const [showChannelList, setShowChannelList] = useState(false);
  const [showEpg, setShowEpg] = useState(true);
  const [initialPosition, setInitialPosition] = useState<number | undefined>(undefined);
  const [streamQuality, setStreamQuality] = useState<string>("");

  // Channel number switching state
  const [channelNumberInput, setChannelNumberInput] = useState("");
  const channelNumberTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ref for the entire player page container - used as fullscreen target
  // so that channel list, EPG, etc. remain visible inside fullscreen
  const pageContainerRef = useRef<HTMLDivElement>(null);

  // Channel name for EPG display — for VOD seed directly from URL param
  const [currentChannelName, setCurrentChannelName] = useState(type !== "live" ? (nameParam || "") : "");

  const isXtream = credentials && "serverUrl" in credentials;
  const creds = credentials as { serverUrl: string; username: string; password: string } | null;

  // Ensure all stream URLs use HTTPS when on HTTPS page (enables direct streaming)
  const safeStreamUrl = useCallback((url: string): string => {
    const trimmed = url.trim();
    if (typeof window !== "undefined" && window.location.protocol === "https:" && trimmed.startsWith("http://")) {
      return trimmed.replace(/^http:\/\//i, "https://");
    }
    return trimmed;
  }, []);

  // Build stream URL and restore position
  useEffect(() => {
    if (urlParam) {
      setStreamUrl(safeStreamUrl(decodeURIComponent(urlParam)));
    } else if (isXtream && creds) {
      const streamType = type === "live" ? "live" : type === "movie" ? "movie" : "series";
      const url = buildStreamUrl(creds, Number(id), streamType);
      setStreamUrl(url);
    }

    // Restore saved position
    const saved = getPosition(id);
    if (saved && saved.duration > 0) {
      const progress = saved.position / saved.duration;
      if (progress < 0.95 && saved.position > 5) {
        setInitialPosition(saved.position);
      }
    }
  }, [id, urlParam, type, isXtream, creds, getPosition]);

  // Derive display name: for VOD use nameParam first (not stale currentChannel from live TV)
  const playlistChannel = !currentChannel ? playlist.find((c) => c.id === id) : null;
  const displayName = type === "live"
    ? (currentChannel?.name || nameParam || playlistChannel?.name || id)
    : (nameParam || playlistChannel?.name || id);

  // Track recently watched
  const recentName = currentChannel?.name || nameParam || id;
  useEffect(() => {
    if (currentChannel) {
      addRecent({
        id: currentChannel.id,
        name: currentChannel.name,
        logo: currentChannel.logo,
        streamType: currentChannel.streamType,
      });
    } else if (id) {
      addRecent({
        id,
        name: recentName,
        streamType: type as "live" | "movie" | "series",
      });
    }
  }, [id, currentChannel, addRecent, type, recentName]);

  // Fetch EPG for live channels — try Xtream first, fall back to free XMLTV
  useEffect(() => {
    if (type !== "live") return;
    const name = currentChannel?.name || nameParam || "";
    const tvgId = currentChannel?.tvgId || currentChannel?.epgChannelId || "";

    if (isXtream && creds) {
      fetchEpg(creds, Number(id))
        .then(async (programs) => {
          if (programs.length > 0) {
            setEpgPrograms(programs);
          } else {
            // Fallback to free XMLTV sources
            const free = await fetchFreeEpg(name, tvgId, id).catch(() => []);
            setEpgPrograms(free);
          }
        })
        .catch(async () => {
          const free = await fetchFreeEpg(name, tvgId, id).catch(() => []);
          setEpgPrograms(free);
        });
    } else if (name) {
      fetchFreeEpg(name, tvgId, id).then(setEpgPrograms).catch(() => setEpgPrograms([]));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, type]);

  // Ref so we can cancel the auto-hide timer from anywhere
  const osdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showOsd = useCallback((name: string, url: string, durationMs = 10000) => {
    if (osdTimerRef.current) clearTimeout(osdTimerRef.current);
    setCurrentChannelName(name);
    setStreamQuality(deriveQuality(name, url));
    setShowEpg(true);
    osdTimerRef.current = setTimeout(() => setShowEpg(false), durationMs);
  }, []);

  // Show OSD on initial load / URL changes (fallback if not triggered by switch functions)
  useEffect(() => {
    if (!streamUrl) return;
    // Use every available source for the name — never leave OSD blank
    const name = currentChannel?.name || nameParam || displayName || id;
    showOsd(name, streamUrl);
    return () => { if (osdTimerRef.current) clearTimeout(osdTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamUrl]);

  // Number key channel switching
  useEffect(() => {
    const handleNumberKey = (e: KeyboardEvent) => {
      const key = e.key;
      if (key >= "0" && key <= "9") {
        e.preventDefault();

        setChannelNumberInput((prev) => {
          const newInput = prev + key;

          // Clear existing timer
          if (channelNumberTimerRef.current) {
            clearTimeout(channelNumberTimerRef.current);
          }

          // If 3 digits, switch immediately
          if (newInput.length >= 3) {
            switchToChannelNumber(Number(newInput));
            return "";
          }

          // Otherwise set 1.5s timeout
          channelNumberTimerRef.current = setTimeout(() => {
            if (newInput.length > 0) {
              switchToChannelNumber(Number(newInput));
              setChannelNumberInput("");
            }
          }, 1500);

          return newInput;
        });
      }

    };

    window.addEventListener("keydown", handleNumberKey);
    return () => {
      window.removeEventListener("keydown", handleNumberKey);
      if (channelNumberTimerRef.current) {
        clearTimeout(channelNumberTimerRef.current);
      }
    };
  }, [favorites, playlist]);

  const switchToChannelNumber = useCallback(
    (num: number) => {
      const fav = favorites.find((f) => f.channelNumber === num);
      if (fav) {
        const channel = playlist.find((c) => c.id === fav.id);
        if (channel) {
          const numUrl = safeStreamUrl(channel.url);
          setChannel(channel);
          showOsd(channel.name, numUrl);
          setEpgPrograms([]);
          setStreamUrl(numUrl);
          window.history.replaceState(null, "",
            `/player/${channel.id}?type=live&url=${encodeURIComponent(channel.url)}&name=${encodeURIComponent(channel.name)}`
          );
          if (isXtream && creds) {
            fetchEpg(creds, Number(channel.id)).then(setEpgPrograms).catch(() => setEpgPrograms([]));
          }
          addRecent({ id: channel.id, name: channel.name, logo: channel.logo, streamType: channel.streamType });
          return;
        }
        nav(`/player/${fav.id}?type=live`);
      }
    },
    [favorites, playlist, setChannel, isXtream, creds, addRecent, safeStreamUrl, showOsd]
  );

  // Save position callback
  const handlePositionChange = useCallback(
    (position: number, duration: number) => {
      savePosition(id, position, duration);
    },
    [id, savePosition]
  );

  // Save position on page hide/unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Position is saved by VideoPlayer onPositionChange via the unmount effect
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // Switch channel WITHOUT navigation to preserve fullscreen
  const switchChannelInPlace = useCallback((direction: "next" | "prev") => {
    if (direction === "next") next(); else prev();
    const store = usePlayerStore.getState();
    const ch = store.currentChannel;
    if (ch) {
      const newUrl = safeStreamUrl(ch.url);
      // Show OSD immediately with the new channel info (don't wait for React re-render)
      showOsd(ch.name, newUrl);
      setEpgPrograms([]); // clear stale EPG immediately so OSD shows without old data
      // Update stream URL directly - no router navigation = no fullscreen loss
      setStreamUrl(newUrl);
      // Update URL bar silently without navigation
      window.history.replaceState(
        null, "",
        `/player/${ch.id}?type=live&url=${encodeURIComponent(ch.url)}`
      );
      // Refresh EPG for new channel (with free fallback)
      const tvgId = ch.tvgId || ch.epgChannelId || "";
      if (isXtream && creds) {
        fetchEpg(creds, Number(ch.id))
          .then(async (programs) => {
            if (programs.length > 0) { setEpgPrograms(programs); return; }
            const free = await fetchFreeEpg(ch.name, tvgId, ch.id).catch(() => []);
            setEpgPrograms(free);
          })
          .catch(async () => {
            const free = await fetchFreeEpg(ch.name, tvgId, ch.id).catch(() => []);
            setEpgPrograms(free);
          });
      } else {
        fetchFreeEpg(ch.name, tvgId, ch.id).then(setEpgPrograms).catch(() => setEpgPrograms([]));
      }
      // Track in recents
      addRecent({ id: ch.id, name: ch.name, logo: ch.logo, streamType: ch.streamType });
    }
  }, [next, prev, isXtream, creds, addRecent, safeStreamUrl, showOsd]);

  const handleNext = useCallback(() => switchChannelInPlace("next"), [switchChannelInPlace]);
  const handlePrev = useCallback(() => switchChannelInPlace("prev"), [switchChannelInPlace]);

  // Simple back navigation - just close channel list or exit fullscreen, then use browser back
  const showChannelListRef = useRef(false);

  useEffect(() => {
    showChannelListRef.current = showChannelList;
  }, [showChannelList]);

  const handleBack = () => {
    // If channel list is open, close it first
    if (showChannelListRef.current) {
      setShowChannelList(false);
      return;
    }

    // If fullscreen, exit fullscreen first
    const doc = document as Document & { webkitFullscreenElement?: Element };
    if (document.fullscreenElement || doc.webkitFullscreenElement) {
      document.exitFullscreen?.();
      (doc as any).webkitExitFullscreen?.();
      return;
    }

    // Otherwise, use browser's native back - this will go back to where the user came from
    window.history.back();
  };

  // Channel select - IN-PLACE update to preserve fullscreen (TiviMate-style)
  const handleChannelSelect = (channel: typeof playlist[0]) => {
    setChannel(channel);
    setShowChannelList(false);
    const newUrl = safeStreamUrl(channel.url);
    showOsd(channel.name, newUrl);
    setEpgPrograms([]); // clear stale EPG immediately
    setStreamUrl(newUrl);
    window.history.replaceState(null, "",
      `/player/${channel.id}?type=live&url=${encodeURIComponent(channel.url)}&name=${encodeURIComponent(channel.name)}`
    );
    const tvgId2 = channel.tvgId || channel.epgChannelId || "";
    if (isXtream && creds) {
      fetchEpg(creds, Number(channel.id))
        .then(async (programs) => {
          if (programs.length > 0) { setEpgPrograms(programs); return; }
          const free = await fetchFreeEpg(channel.name, tvgId2, channel.id).catch(() => []);
          setEpgPrograms(free);
        })
        .catch(async () => {
          const free = await fetchFreeEpg(channel.name, tvgId2, channel.id).catch(() => []);
          setEpgPrograms(free);
        });
    } else {
      fetchFreeEpg(channel.name, tvgId2, channel.id).then(setEpgPrograms).catch(() => setEpgPrograms([]));
    }
    addRecent({ id: channel.id, name: channel.name, logo: channel.logo, streamType: channel.streamType });
  };

  if (!streamUrl) {
    return (
      <div className="flex h-full items-center justify-center bg-black">
        <p className="text-gray-500 text-sm">Kein Stream gefunden</p>
      </div>
    );
  }

  return (
    <div ref={pageContainerRef} className="fixed inset-0 z-50 bg-black">
      <VideoPlayer
        src={streamUrl}
        title={displayName}
        contentType={type as "live" | "movie" | "series"}
        initialPosition={initialPosition}
        onChannelNext={type === "live" ? handleNext : undefined}
        onChannelPrev={type === "live" ? handlePrev : undefined}
        onBack={handleBack}
        onPositionChange={handlePositionChange}
        fullscreenContainerRef={pageContainerRef}
      />

      {/* Channel number overlay */}
      {channelNumberInput && (
        <div className="absolute top-6 right-6 z-30 bg-black/80 backdrop-blur-sm rounded-xl px-6 py-4 border border-white/20">
          <p className="text-3xl font-bold text-white tabular-nums">
            {channelNumberInput}
          </p>
          <p className="text-xs text-gray-400 mt-1">Channel</p>
        </div>
      )}

      {/* EPG overlay - satellite-receiver-style OSD */}
      {type === "live" && (
        <EpgOverlay
          programs={epgPrograms}
          channelName={currentChannelName || displayName}
          channelLogo={currentChannel?.logo}
          isVisible={showEpg}
          channelNumber={playlist.indexOf(currentChannel!) + 1}
          streamQuality={streamQuality || deriveQuality(displayName, streamUrl)}
          onToggle={() => {
            if (showEpg) {
              if (osdTimerRef.current) clearTimeout(osdTimerRef.current);
              setShowEpg(false);
            } else {
              showOsd(currentChannelName || displayName, streamUrl);
            }
          }}
        />
      )}

      {/* Always-visible back button — top left */}
      <button
        onClick={handleBack}
        className="absolute top-4 left-4 z-30 flex items-center gap-2 rounded-xl bg-black/60 backdrop-blur-sm border border-white/10 px-4 py-2.5 text-white/90 hover:bg-black/80 hover:text-white transition-all"
      >
        <HiArrowLeft className="h-5 w-5" />
        <span className="text-sm font-semibold">Zurück</span>
      </button>

      {/* Always-visible controls — right edge: prev / info / list / next */}
      {type === "live" && !showChannelList && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
          {playlist.length > 0 && (
            <button
              onClick={handlePrev}
              className="flex h-12 w-10 items-center justify-center rounded-tl-xl bg-black/60 text-white/80 backdrop-blur-sm hover:bg-black/90 hover:text-white transition-all border-b border-white/10"
              title="Vorheriger Kanal"
            >
              <HiChevronUp className="h-5 w-5" />
            </button>
          )}
          <button
            onClick={() => showOsd(currentChannelName || displayName, streamUrl, 10000)}
            className="flex h-12 w-10 items-center justify-center bg-black/60 text-white/80 backdrop-blur-sm hover:bg-black/90 hover:text-white transition-all border-b border-white/10"
            title="Info anzeigen"
          >
            <HiInformationCircle className="h-5 w-5" />
          </button>
          {playlist.length > 0 && (
            <button
              onClick={() => setShowChannelList(true)}
              className="flex h-12 w-10 items-center justify-center bg-black/60 text-white/80 backdrop-blur-sm hover:bg-black/90 hover:text-white transition-all border-b border-white/10"
              title="Kanalliste"
            >
              <HiListBullet className="h-5 w-5" />
            </button>
          )}
          {playlist.length > 0 && (
            <button
              onClick={handleNext}
              className="flex h-12 w-10 items-center justify-center rounded-bl-xl bg-black/60 text-white/80 backdrop-blur-sm hover:bg-black/90 hover:text-white transition-all"
              title="Nächster Kanal"
            >
              <HiChevronDown className="h-5 w-5" />
            </button>
          )}
        </div>
      )}

      {/* Channel switcher */}
      <ChannelSwitcher
        channels={playlist}
        currentId={currentChannel?.id || id}
        isOpen={showChannelList}
        onClose={() => setShowChannelList(false)}
        onSelect={handleChannelSelect}
      />
    </div>
  );
}

