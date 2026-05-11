"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import {
  HiGlobeAlt,
  HiUser,
  HiLockClosed,
  HiLink,
  HiTrash,
  HiTag,
  HiPlay,
  HiCheckCircle,
  HiExclamationCircle,
  HiChevronRight,
  HiPencil,
  HiXMark,
} from "react-icons/hi2";
import { useAuthStore } from "@/lib/store";
import { xtreamLogin, parseM3UFromUrl } from "@/lib/api-client";

type Tab = "xtream" | "m3u";

const MAC_STORAGE_KEY = "iptv-trex-device-mac";

function generateMacAddress(): string {
  const hex = () => Math.floor(Math.random() * 256).toString(16).toUpperCase().padStart(2, "0");
  return `00:1A:79:${hex()}:${hex()}:${hex()}`;
}

function getOrCreateMac(): string {
  if (typeof window === "undefined") return "";
  const stored = localStorage.getItem(MAC_STORAGE_KEY);
  if (stored) return stored;
  const mac = generateMacAddress();
  localStorage.setItem(MAC_STORAGE_KEY, mac);
  return mac;
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, setMac, macAddress, isLoggedIn, savedPlaylists, savePlaylist, removePlaylist, switchPlaylist } = useAuthStore();

  const [tab, setTab] = useState<Tab>("xtream");
  const [playlistName, setPlaylistName] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [m3uUrl, setM3uUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const startEdit = (pl: typeof savedPlaylists[0]) => {
    setEditingId(pl.id);
    setError("");
    if (pl.type === "xtream" && "serverUrl" in pl.credentials) {
      const c = pl.credentials as { serverUrl: string; username: string; password: string };
      setTab("xtream");
      setPlaylistName(pl.name);
      setServerUrl(c.serverUrl);
      setUsername(c.username);
      setPassword(c.password);
    } else if ("url" in pl.credentials) {
      setTab("m3u");
      setPlaylistName(pl.name);
      setM3uUrl((pl.credentials as { url: string }).url);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setPlaylistName("");
    setServerUrl("");
    setUsername("");
    setPassword("");
    setM3uUrl("");
    setError("");
  };

  useEffect(() => {
    const mac = getOrCreateMac();
    if (mac && mac !== macAddress) setMac(mac);
  }, [macAddress, setMac]);

  useEffect(() => {
    const editId = searchParams.get("edit");
    if (editId && savedPlaylists.length > 0) {
      const pl = savedPlaylists.find((p) => p.id === editId);
      if (pl) startEdit(pl);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    // Don't redirect if we came here to edit a playlist
    if (isLoggedIn && !searchParams.get("edit")) window.location.replace("/");
  }, [isLoggedIn, router, searchParams]);

  const handleXtreamLogin = async () => {
    if (!playlistName.trim()) { setError("Bitte einen Namen für die Playlist eingeben"); return; }
    if (!serverUrl || !username || !password) { setError("Bitte alle Felder ausfüllen"); return; }
    setLoading(true);
    setError("");
    try {
      const creds = { serverUrl: serverUrl.replace(/\/+$/, ""), username, password };
      await xtreamLogin(creds);
      const playlistId = editingId ?? `xtream-${Date.now()}`;
      if (editingId) removePlaylist(editingId);
      savePlaylist({ id: playlistId, name: playlistName.trim(), type: "xtream", credentials: creds, addedAt: Date.now() });
      setSuccess(true);
      setEditingId(null);
      setTimeout(() => { login(creds, playlistName.trim()); window.location.replace("/"); }, 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login fehlgeschlagen. Zugangsdaten prüfen.");
    } finally {
      setLoading(false);
    }
  };

  const handleM3ULogin = async () => {
    if (!playlistName.trim()) { setError("Bitte einen Namen für die Playlist eingeben"); return; }
    if (!m3uUrl) { setError("Bitte eine M3U URL eingeben"); return; }
    setLoading(true);
    setError("");
    try {
      await parseM3UFromUrl(m3uUrl);
      const creds = { url: m3uUrl };
      const playlistId = `m3u-${Date.now()}`;
      savePlaylist({ id: playlistId, name: playlistName.trim(), type: "m3u", credentials: creds, addedAt: Date.now() });
      setSuccess(true);
      setTimeout(() => { login(creds, playlistName.trim()); window.location.replace("/"); }, 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Playlist konnte nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchPlaylist = (id: string) => { switchPlaylist(id); window.location.replace("/"); };

  const btnLabel = editingId ? "Speichern" : tab === "xtream" ? "Verbinden" : "Playlist laden";

  const inputClass = clsx(
    "w-full rounded-xl border bg-white/3 py-3.5 pl-12 pr-4 text-base text-white placeholder-gray-600",
    "outline-none transition-all duration-200",
    "border-white/8 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:bg-white/5"
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#060609] p-4 overflow-hidden">
      {/* Animated background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-purple-700/15 blur-[120px] animate-pulse" style={{ animationDuration: "4s" }} />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-blue-700/15 blur-[120px] animate-pulse" style={{ animationDuration: "6s" }} />
        <div className="absolute top-3/4 left-1/2 h-64 w-64 rounded-full bg-violet-700/10 blur-[100px] animate-pulse" style={{ animationDuration: "8s" }} />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "64px 64px"
        }} />
      </div>

      <div className="relative w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="relative inline-flex mb-5">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-purple-600 via-violet-600 to-blue-600 flex items-center justify-center shadow-2xl shadow-purple-900/50">
              <span className="text-2xl font-black text-white tracking-tight">TX</span>
            </div>
            {/* Glow ring */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 blur-xl opacity-40 -z-10" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            IPTV <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">TREX</span>
          </h1>
          <p className="text-gray-500 mt-2 text-sm">Premium Streaming Experience</p>
        </div>

        {/* Saved playlists — quick access at top */}
        {savedPlaylists.length > 0 && (
          <div className="mb-6">
            <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-3">Gespeicherte Playlists</p>
            <div className="space-y-2">
              {savedPlaylists.map((pl) => {
                const displayUrl =
                  pl.type === "xtream" && "serverUrl" in pl.credentials
                    ? (pl.credentials as { serverUrl: string }).serverUrl
                    : "url" in pl.credentials
                      ? (pl.credentials as { url: string }).url
                      : "";
                return (
                  <div key={pl.id} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/3 p-3 hover:bg-white/6 transition-colors group">
                    <button onClick={() => handleSwitchPlaylist(pl.id)} className="flex-1 flex items-center gap-3 text-left">
                      <div className={clsx(
                        "flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 text-xs font-bold text-white",
                        pl.type === "xtream" ? "bg-purple-600" : "bg-blue-600"
                      )}>
                        {pl.type === "xtream" ? "XC" : "M3"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white truncate group-hover:text-purple-300 transition-colors">{pl.name}</p>
                        <p className="text-[10px] text-gray-500 truncate">{displayUrl}</p>
                      </div>
                      <HiChevronRight className="h-4 w-4 text-gray-600 group-hover:text-purple-400 flex-shrink-0 transition-colors" />
                    </button>
                    <button
                      onClick={() => startEdit(pl)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-600 hover:text-blue-400 hover:bg-blue-500/10 transition-colors flex-shrink-0"
                    >
                      <HiPencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => removePlaylist(pl.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
                    >
                      <HiTrash className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-white/5" />
              <span className="text-xs text-gray-600">oder neu hinzufügen</span>
              <div className="flex-1 h-px bg-white/5" />
            </div>
          </div>
        )}

        {/* Login card */}
        <div className={clsx(
          "rounded-2xl border overflow-hidden shadow-2xl shadow-black/50",
          "bg-[#0d0d18]/90 backdrop-blur-xl border-white/8",
          success && "border-green-500/30"
        )}>
          {/* Tab bar / edit mode header */}
          {editingId ? (
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-blue-500/10">
              <div className="flex items-center gap-2">
                <HiPencil className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-bold text-blue-300">Playlist bearbeiten</span>
              </div>
              <button onClick={cancelEdit} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors">
                <HiXMark className="h-4 w-4" />
                Abbrechen
              </button>
            </div>
          ) : (
            <div className="flex border-b border-white/5 bg-white/2">
              {(["xtream", "m3u"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setError(""); }}
                  className={clsx(
                    "flex-1 py-4 text-sm font-semibold transition-all relative",
                    tab === t ? "text-white" : "text-gray-500 hover:text-gray-300"
                  )}
                >
                  {t === "xtream" ? "Xtream Codes" : "M3U Playlist"}
                  {tab === t && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-blue-500" />
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="p-6 space-y-4">
            {/* Success state */}
            {success && (
              <div className="flex items-center gap-3 rounded-xl bg-green-500/10 border border-green-500/20 px-4 py-3">
                <HiCheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                <p className="text-sm text-green-300">Verbunden! Weiterleitung...</p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-3 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
                <HiExclamationCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            {/* Playlist Name */}
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-2">Playlist Name *</label>
              <div className="relative">
                <HiTag className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input type="text" value={playlistName} onChange={(e) => setPlaylistName(e.target.value)}
                  placeholder='z.B. "Mein IPTV", "Familie"' className={inputClass} />
              </div>
            </div>

            {tab === "xtream" ? (
              <>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-2">Server URL</label>
                  <div className="relative">
                    <HiGlobeAlt className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <input type="url" value={serverUrl} onChange={(e) => setServerUrl(e.target.value)}
                      placeholder="http://example.com:8080" className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-2">Benutzername</label>
                  <div className="relative">
                    <HiUser className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                      placeholder="Benutzername eingeben" className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-2">Passwort</label>
                  <div className="relative">
                    <HiLockClosed className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                      placeholder="Passwort eingeben" className={inputClass}
                      onKeyDown={(e) => e.key === "Enter" && handleXtreamLogin()} />
                  </div>
                </div>
                <button onClick={handleXtreamLogin} disabled={loading || success}
                  className={clsx(
                    "w-full rounded-xl py-3.5 font-bold text-white transition-all duration-200 flex items-center justify-center gap-2 text-sm",
                    "bg-gradient-to-r from-purple-600 to-blue-600",
                    "hover:from-purple-500 hover:to-blue-500 hover:shadow-lg hover:shadow-purple-900/40",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  )}>
                  {loading ? (
                    <><div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Verbinde...</>
                  ) : (
                    <><HiPlay className="h-4 w-4" /> {btnLabel}</>
                  )}
                </button>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-2">M3U / M3U8 URL</label>
                  <div className="relative">
                    <HiLink className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <input type="url" value={m3uUrl} onChange={(e) => setM3uUrl(e.target.value)}
                      placeholder="http://example.com/playlist.m3u" className={inputClass}
                      onKeyDown={(e) => e.key === "Enter" && handleM3ULogin()} />
                  </div>
                </div>
                <button onClick={handleM3ULogin} disabled={loading || success}
                  className={clsx(
                    "w-full rounded-xl py-3.5 font-bold text-white transition-all duration-200 flex items-center justify-center gap-2 text-sm",
                    "bg-gradient-to-r from-purple-600 to-blue-600",
                    "hover:from-purple-500 hover:to-blue-500 hover:shadow-lg hover:shadow-purple-900/40",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  )}>
                  {loading ? (
                    <><div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Lade Playlist...</>
                  ) : (
                    <><HiPlay className="h-4 w-4" /> {btnLabel}</>
                  )}
                </button>
              </>
            )}
          </div>

          {/* MAC Address footer */}
          <div className="border-t border-white/5 px-6 py-3 flex items-center justify-between bg-white/2">
            <span className="text-[10px] text-gray-600 uppercase tracking-widest">Device MAC</span>
            <span className="text-[11px] text-gray-500 font-mono">{macAddress || "Wird generiert..."}</span>
          </div>
        </div>

        <p className="text-center text-[11px] text-gray-700 mt-6">
          IPTV TREX Premium — Alle Streams verschlüsselt & sicher
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}
