import type {
  XtreamCredentials,
  Category,
  Channel,
  Movie,
  Series,
  EpgProgram,
  XtreamAuthResponse,
  ParsedM3UResult,
  MovieInfo,
  SeriesInfo,
  SeasonInfo,
  EpisodeInfo,
} from "@/types";
import { extractCountryFromGroup, type CountryInfo } from "./countries";
import {
  getCategories as idbGetCats, putCategories as idbPutCats,
  getStreams as idbGetStreams, putStreams as idbPutStreams,
  getVodInfo as idbGetVodInfo, putVodInfo as idbPutVodInfo,
  getSeriesInfo as idbGetSeriesInfo, putSeriesInfo as idbPutSeriesInfo,
} from "./idb";
import { nativeFetch, isNative } from "./capacitor-http";

// ==================== Image URL Fix ====================
function fixImageUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith("http://")) {
    return `/api/proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}

// ==================== Response Cache ====================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

const CACHE_TTL_CATEGORIES = 5 * 60 * 1000; // 5 minutes
const CACHE_TTL_STREAMS = 10 * 60 * 1000; // 10 minutes

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > entry.ttl) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T, ttl: number): void {
  cache.set(key, { data, timestamp: Date.now(), ttl });
}

export function clearCache(): void {
  cache.clear();
}

// ==================== Xtream API Client ====================

function buildBaseUrl(creds: XtreamCredentials): string {
  return creds.serverUrl.trim().replace(/\/+$/, "");
}

function buildApiUrl(creds: XtreamCredentials, action?: string): string {
  const base = buildBaseUrl(creds);
  let url = `${base}/player_api.php?username=${encodeURIComponent(creds.username)}&password=${encodeURIComponent(creds.password)}`;
  if (action) url += `&action=${action}`;
  return url;
}

function buildCacheKey(creds: XtreamCredentials, action: string, extra?: string): string {
  return `${creds.serverUrl}:${creds.username}:${action}${extra ? `:${extra}` : ""}`;
}

/**
 * Strip lone Unicode surrogates that break JSON serialization.
 * IPTV servers often return data with invalid Unicode characters.
 */
function stripSurrogates(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, "\uFFFD")
             .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "\uFFFD");
}

/**
 * Check if a URL is external (points to an IPTV server, not our own app).
 */
function isExternalUrl(url: string): boolean {
  if (url.startsWith("/")) return false;
  if (typeof window === "undefined") return true;
  try {
    const parsed = new URL(url);
    return parsed.origin !== window.location.origin;
  } catch {
    return true;
  }
}

/**
 * Fetch JSON from a URL. Always proxies external URLs to bypass CORS
 * (IPTV servers don't send CORS headers) and mixed content blocking.
 * Sanitizes response text to remove lone surrogates before parsing.
 */
async function fetchJson<T>(rawUrl: string): Promise<T> {
  const url = rawUrl.trim();

  // Native APK: CapacitorHttp intercepts fetch() → native OkHttp → no CORS
  // Browser: proxy external URLs through /api/proxy to bypass CORS
  const needsProxy = typeof window !== "undefined" && isExternalUrl(url) && !isNative();
  const fetchUrl = needsProxy ? `/api/proxy?url=${encodeURIComponent(url)}` : url;

  const res = needsProxy ? await fetch(fetchUrl) : await nativeFetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  const text = await res.text();
  const sanitized = stripSurrogates(text);
  return JSON.parse(sanitized) as T;
}

export async function xtreamLogin(
  creds: XtreamCredentials
): Promise<XtreamAuthResponse> {
  const url = buildApiUrl(creds);
  const data = await fetchJson<{
    user_info: Record<string, unknown>;
    server_info: Record<string, unknown>;
  }>(url);

  if (!data.user_info || data.user_info.auth === 0) {
    throw new Error("Authentication failed. Check your credentials.");
  }

  return {
    userInfo: {
      username: String(data.user_info.username ?? ""),
      password: String(data.user_info.password ?? ""),
      message: String(data.user_info.message ?? ""),
      auth: Number(data.user_info.auth ?? 0),
      status: String(data.user_info.status ?? ""),
      expDate: String(data.user_info.exp_date ?? ""),
      isTrial: String(data.user_info.is_trial ?? ""),
      activeCons: String(data.user_info.active_cons ?? ""),
      createdAt: String(data.user_info.created_at ?? ""),
      maxConnections: String(data.user_info.max_connections ?? ""),
      allowedOutputFormats: (data.user_info.allowed_output_formats as string[]) ?? [],
    },
    serverInfo: {
      url: String(data.server_info.url ?? ""),
      port: String(data.server_info.port ?? ""),
      httpsPort: String(data.server_info.https_port ?? ""),
      serverProtocol: String(data.server_info.server_protocol ?? ""),
      rtmpPort: String(data.server_info.rtmp_port ?? ""),
      timezone: String(data.server_info.timezone ?? ""),
      timestampNow: Number(data.server_info.timestamp_now ?? 0),
      timeNow: String(data.server_info.time_now ?? ""),
    },
  };
}

export async function fetchLiveCategories(
  creds: XtreamCredentials
): Promise<Category[]> {
  const cacheKey = buildCacheKey(creds, "get_live_categories");
  const memCached = getCached<Category[]>(cacheKey);
  if (memCached) return memCached;

  // IDB persistent cache
  if (typeof window !== "undefined") {
    const idb = await idbGetCats<Category[]>(`live:${creds.serverUrl}:${creds.username}`);
    if (idb) { setCache(cacheKey, idb, CACHE_TTL_CATEGORIES); return idb; }
  }

  const url = buildApiUrl(creds, "get_live_categories");
  const data = await fetchJson<
    { category_id: string; category_name: string; parent_id: number }[]
  >(url);
  const result = data.map((c) => ({
    categoryId: c.category_id,
    categoryName: c.category_name,
    parentId: c.parent_id,
  }));

  setCache(cacheKey, result, CACHE_TTL_CATEGORIES);
  if (typeof window !== "undefined") idbPutCats(`live:${creds.serverUrl}:${creds.username}`, result);
  return result;
}

export async function fetchLiveStreams(
  creds: XtreamCredentials,
  categoryId?: string
): Promise<Channel[]> {
  const cacheKey = buildCacheKey(creds, "get_live_streams", categoryId);
  const cached = getCached<Channel[]>(cacheKey);
  if (cached) return cached;

  let url = buildApiUrl(creds, "get_live_streams");
  if (categoryId) url += `&category_id=${categoryId}`;
  const data = await fetchJson<Record<string, unknown>[]>(url);
  const result = data.map((s) => ({
    id: String(s.stream_id ?? ""),
    name: String(s.name ?? ""),
    logo: fixImageUrl(String(s.stream_icon ?? "")),
    group: String(s.category_id ?? ""),
    url: buildStreamUrl(creds, Number(s.stream_id), "live", "m3u8"),
    tvgId: String(s.epg_channel_id ?? ""),
    tvgName: String(s.name ?? ""),
    epgChannelId: String(s.epg_channel_id ?? ""),
    isLive: true,
    streamType: "live" as const,
    categoryId: String(s.category_id ?? ""),
  }));

  setCache(cacheKey, result, CACHE_TTL_STREAMS);
  return result;
}

export async function fetchVodCategories(
  creds: XtreamCredentials
): Promise<Category[]> {
  const cacheKey = buildCacheKey(creds, "get_vod_categories");
  const memCached = getCached<Category[]>(cacheKey);
  if (memCached) return memCached;

  if (typeof window !== "undefined") {
    const idb = await idbGetCats<Category[]>(`vod:${creds.serverUrl}:${creds.username}`);
    if (idb) { setCache(cacheKey, idb, CACHE_TTL_CATEGORIES); return idb; }
  }

  const url = buildApiUrl(creds, "get_vod_categories");
  const data = await fetchJson<
    { category_id: string; category_name: string; parent_id: number }[]
  >(url);
  const result = data.map((c) => ({
    categoryId: c.category_id,
    categoryName: c.category_name,
    parentId: c.parent_id,
  }));

  setCache(cacheKey, result, CACHE_TTL_CATEGORIES);
  if (typeof window !== "undefined") idbPutCats(`vod:${creds.serverUrl}:${creds.username}`, result);
  return result;
}

export async function fetchVodStreams(
  creds: XtreamCredentials,
  categoryId?: string
): Promise<Movie[]> {
  const cacheKey = buildCacheKey(creds, "get_vod_streams", categoryId);
  const memCached = getCached<Movie[]>(cacheKey);
  if (memCached) return memCached;

  if (typeof window !== "undefined" && categoryId) {
    const idb = await idbGetStreams<Movie[]>(`vod:${categoryId}`);
    if (idb) { setCache(cacheKey, idb, CACHE_TTL_STREAMS); return idb; }
  }

  let url = buildApiUrl(creds, "get_vod_streams");
  if (categoryId) url += `&category_id=${categoryId}`;
  const data = await fetchJson<Record<string, unknown>[]>(url);
  const result = data.map((s) => ({
    streamId: Number(s.stream_id ?? 0),
    name: String(s.name ?? ""),
    streamIcon: fixImageUrl(String(s.stream_icon ?? "")),
    rating: String(s.rating ?? "0"),
    categoryId: String(s.category_id ?? ""),
    containerExtension: String(s.container_extension ?? "mp4"),
    added: String(s.added ?? ""),
    plot: s.plot ? String(s.plot) : undefined,
    cast: s.cast ? String(s.cast) : undefined,
    director: s.director ? String(s.director) : undefined,
    genre: s.genre ? String(s.genre) : undefined,
    releaseDate: s.release_date ? String(s.release_date) : undefined,
    duration: s.duration ? String(s.duration) : undefined,
  }));

  setCache(cacheKey, result, CACHE_TTL_STREAMS);
  if (typeof window !== "undefined" && categoryId) idbPutStreams(`vod:${categoryId}`, result);
  return result;
}

export async function fetchSeriesCategories(
  creds: XtreamCredentials
): Promise<Category[]> {
  const cacheKey = buildCacheKey(creds, "get_series_categories");
  const memCached = getCached<Category[]>(cacheKey);
  if (memCached) return memCached;

  if (typeof window !== "undefined") {
    const idb = await idbGetCats<Category[]>(`series:${creds.serverUrl}:${creds.username}`);
    if (idb) { setCache(cacheKey, idb, CACHE_TTL_CATEGORIES); return idb; }
  }

  const url = buildApiUrl(creds, "get_series_categories");
  const data = await fetchJson<
    { category_id: string; category_name: string; parent_id: number }[]
  >(url);
  const result = data.map((c) => ({
    categoryId: c.category_id,
    categoryName: c.category_name,
    parentId: c.parent_id,
  }));

  setCache(cacheKey, result, CACHE_TTL_CATEGORIES);
  if (typeof window !== "undefined") idbPutCats(`series:${creds.serverUrl}:${creds.username}`, result);
  return result;
}

export async function fetchSeries(
  creds: XtreamCredentials,
  categoryId?: string
): Promise<Series[]> {
  const cacheKey = buildCacheKey(creds, "get_series", categoryId);
  const cached = getCached<Series[]>(cacheKey);
  if (cached) return cached;

  let url = buildApiUrl(creds, "get_series");
  if (categoryId) url += `&category_id=${categoryId}`;
  const data = await fetchJson<Record<string, unknown>[]>(url);
  const result = data.map((s) => ({
    seriesId: Number(s.series_id ?? 0),
    name: String(s.name ?? ""),
    cover: fixImageUrl(String(s.cover ?? "")),
    plot: String(s.plot ?? ""),
    cast: String(s.cast ?? ""),
    director: String(s.director ?? ""),
    genre: String(s.genre ?? ""),
    releaseDate: String(s.release_date ?? ""),
    rating: String(s.rating ?? "0"),
    categoryId: String(s.category_id ?? ""),
    lastModified: String(s.last_modified ?? ""),
  }));

  setCache(cacheKey, result, CACHE_TTL_STREAMS);
  return result;
}

export async function fetchSeriesInfo(
  creds: XtreamCredentials,
  seriesId: number
): Promise<{
  info: Series;
  episodes: Record<
    string,
    {
      id: string;
      episode_num: number;
      title: string;
      container_extension: string;
      info: Record<string, unknown>;
      season: number;
    }[]
  >;
}> {
  const url = buildApiUrl(creds, "get_series_info") + `&series_id=${seriesId}`;
  return fetchJson(url);
}

const CACHE_TTL_EPG = 60 * 1000; // 60 seconds — EPG doesn't change often

function parseEpgDate(dateStr: string): number {
  if (!dateStr) return 0;
  // Xtream EPG dates: "2024-01-15 20:00:00" (server timezone)
  const d = new Date(dateStr.replace(" ", "T") + "Z");
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

function mapEpgListings(listings: Record<string, unknown>[]): EpgProgram[] {
  return listings.map((e) => ({
    id: String(e.id ?? ""),
    channelId: String(e.channel_id ?? ""),
    title: e.title ? safeAtob(String(e.title)) : "",
    description: e.description ? safeAtob(String(e.description)) : "",
    start: String(e.start ?? ""),
    end: String(e.end ?? ""),
    startTimestamp: parseEpgDate(String(e.start ?? "")),
    endTimestamp: parseEpgDate(String(e.end ?? "")),
    lang: String(e.lang ?? ""),
    hasArchive: Boolean(e.has_archive),
  }));
}

export async function fetchEpg(
  creds: XtreamCredentials,
  streamId: number
): Promise<EpgProgram[]> {
  const cacheKey = buildCacheKey(creds, "epg", String(streamId));
  const cached = getCached<EpgProgram[]>(cacheKey);
  if (cached) return cached;

  const url = buildApiUrl(creds, "get_short_epg") + `&stream_id=${streamId}`;
  const data = await fetchJson<{
    epg_listings?: Record<string, unknown>[];
  }>(url);
  if (!data.epg_listings) return [];
  const result = mapEpgListings(data.epg_listings);
  setCache(cacheKey, result, CACHE_TTL_EPG);
  return result;
}

/**
 * Fetch extended EPG for a channel (more programs for grid view).
 * Uses higher limit for TV guide display.
 */
export async function fetchFullEpg(
  creds: XtreamCredentials,
  streamId: number,
  limit: number = 30
): Promise<EpgProgram[]> {
  const cacheKey = buildCacheKey(creds, "full_epg", `${streamId}_${limit}`);
  const cached = getCached<EpgProgram[]>(cacheKey);
  if (cached) return cached;

  const url = buildApiUrl(creds, "get_short_epg") + `&stream_id=${streamId}&limit=${limit}`;
  const data = await fetchJson<{
    epg_listings?: Record<string, unknown>[];
  }>(url);
  if (!data.epg_listings) return [];
  const result = mapEpgListings(data.epg_listings);
  setCache(cacheKey, result, 5 * 60 * 1000); // 5min cache for grid
  return result;
}

// ==================== Free XMLTV EPG (fallback for providers without EPG) ====================

/**
 * Free XMLTV sources – fetched through our proxy to bypass CORS.
 * Ordered by coverage: multi-language first, then country-specific.
 */
// Ordered by priority — loaded SEQUENTIALLY, stops at first match
const FREE_EPG_SOURCES = [
  "https://epg.pw/xmltv/epg_DE.xml",   // German (highest priority)
  "https://epg.pw/xmltv/epg_AT.xml",   // Austrian
  "https://epg.pw/xmltv/epg_CH.xml",   // Swiss
  "https://epg.pw/xmltv/epg_TR.xml",   // Turkish
  "https://epg.pw/xmltv/epg_PL.xml",   // Polish
  "https://epg.pw/xmltv/epg_UK.xml",   // UK
  "https://epg.pw/xmltv/epg_US.xml",   // US
  "https://epg.pw/xmltv/epg_FR.xml",   // French
  "https://epg.pw/xmltv/epg_ES.xml",   // Spanish
  "https://epg.pw/xmltv/epg_IT.xml",   // Italian
  "https://epg.pw/xmltv/epg_INT.xml",  // International fallback
];

// Single in-memory cache of parsed XMLTV data keyed by source URL
const xmltvCache = new Map<string, { programs: EpgProgram[]; fetchedAt: number }>();
const XMLTV_TTL = 2 * 60 * 60 * 1000; // 2 hours — EPG data doesn't change often

function parseXmltvDate(s: string): number {
  // Format: 20240101120000 +0100
  const m = s.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*([\+\-]\d{4})?/);
  if (!m) return 0;
  const [, yr, mo, dy, hr, mn, sc, tz = "+0000"] = m;
  const sign = tz[0] === "-" ? -1 : 1;
  const tzH = parseInt(tz.slice(1, 3), 10);
  const tzM = parseInt(tz.slice(3, 5), 10);
  const utcMs = Date.UTC(+yr, +mo - 1, +dy, +hr, +mn, +sc) - sign * (tzH * 60 + tzM) * 60000;
  return utcMs;
}

// Maps channelId → display name from <channel> elements
const xmltvChannelNames = new Map<string, Map<string, string>>(); // sourceUrl → (channelId → displayName)

async function loadXmltvSource(sourceUrl: string): Promise<EpgProgram[]> {
  const hit = xmltvCache.get(sourceUrl);
  if (hit && Date.now() - hit.fetchedAt < XMLTV_TTL) return hit.programs;

  const proxyUrl = `/api/proxy?url=${encodeURIComponent(sourceUrl)}`;
  const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`XMLTV fetch failed: ${res.status}`);
  const text = await res.text();

  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "text/xml");

  // Parse <channel> display names for better matching
  const nameMap = new Map<string, string>();
  doc.querySelectorAll("channel").forEach((el) => {
    const id = el.getAttribute("id") || "";
    const displayName = el.querySelector("display-name")?.textContent?.trim() || "";
    if (id && displayName) nameMap.set(id, displayName);
  });
  xmltvChannelNames.set(sourceUrl, nameMap);

  const progs: EpgProgram[] = [];

  doc.querySelectorAll("programme").forEach((el) => {
    const start = parseXmltvDate(el.getAttribute("start") || "");
    const end   = parseXmltvDate(el.getAttribute("stop")  || "");
    if (!start || !end) return;

    const startStr = new Date(start).toISOString();
    const endStr   = new Date(end).toISOString();
    const chanId   = el.getAttribute("channel") || "";
    const title    = el.querySelector("title")?.textContent?.trim() || "";
    const desc     = el.querySelector("desc")?.textContent?.trim()  || "";
    const category = el.querySelector("category")?.textContent?.trim() || "";

    progs.push({
      id: `${chanId}-${start}`,
      channelId: chanId,
      title,
      description: desc || category,
      start: startStr,
      end: endStr,
      startTimestamp: start,
      endTimestamp: end,
      hasArchive: false,
    });
  });

  xmltvCache.set(sourceUrl, { programs: progs, fetchedAt: Date.now() });
  return progs;
}

/**
 * Attempt to find EPG from free XMLTV sources by matching channel name/tvg-id.
 * Tries each source in order and returns first match.
 */
export async function fetchFreeEpg(
  channelName: string,
  tvgId?: string,
  _streamId?: string
): Promise<EpgProgram[]> {
  // Normalise: lowercase, strip spaces/punctuation/quality suffixes
  const norm = (s: string) =>
    s.toLowerCase()
      .replace(/\s*(hd|fhd|sd|4k|uhd|raw|ᴿᴬᵂ|\+|\|)/gi, "")
      .replace(/[\s\-_.:]/g, "")
      .trim();

  const nameLower = norm(channelName);
  // Also extract key words (3+ chars) for partial matching
  const nameWords = channelName.toLowerCase()
    .replace(/\s*(hd|fhd|sd|4k|uhd|raw)/gi, "")
    .split(/[\s\-_.:]+/)
    .filter((w) => w.length >= 3);

  const idLower = tvgId ? norm(tvgId) : "";

  const findBestChannel = (all: EpgProgram[], nameMap: Map<string, string>): string | null => {
    const uniqueIds = [...new Set(all.map((p) => p.channelId))];

    // 1. Exact tvg-id match on channelId or display name
    if (idLower) {
      const exact = uniqueIds.find((id) => norm(id) === idLower || norm(nameMap.get(id) || "") === idLower);
      if (exact) return exact;
    }

    // 2. Exact channel name match
    const exactName = uniqueIds.find((id) => {
      const displayNorm = norm(nameMap.get(id) || "");
      const idNorm = norm(id);
      return idNorm === nameLower || displayNorm === nameLower;
    });
    if (exactName) return exactName;

    // 3. Partial tvg-id contains/contained-by
    if (idLower.length >= 3) {
      const partial = uniqueIds.find((id) => {
        const n = norm(id);
        return n.includes(idLower) || idLower.includes(n);
      });
      if (partial) return partial;
    }

    // 4. Partial name match on channelId or display name
    const partialName = uniqueIds.find((id) => {
      const displayNorm = norm(nameMap.get(id) || "");
      const idNorm = norm(id);
      return idNorm.includes(nameLower) || nameLower.includes(idNorm) ||
             displayNorm.includes(nameLower) || nameLower.includes(displayNorm);
    });
    if (partialName) return partialName;

    // 5. Word-level match — any key word from channel name found in id/display
    if (nameWords.length > 0) {
      const wordMatch = uniqueIds.find((id) => {
        const displayNorm = (nameMap.get(id) || "").toLowerCase();
        const idStr = id.toLowerCase();
        return nameWords.some((w) => idStr.includes(w) || displayNorm.includes(w));
      });
      if (wordMatch) return wordMatch;
    }

    return null;
  };

  // Load sources SEQUENTIALLY — stop as soon as we find a match
  // (each XMLTV file is 10-50MB; parallel loading kills performance)
  for (const src of FREE_EPG_SOURCES) {
    try {
      const all = await loadXmltvSource(src);
      if (all.length === 0) continue;
      const nameMap = xmltvChannelNames.get(src) || new Map();
      const bestChan = findBestChannel(all, nameMap);
      if (!bestChan) continue;
      const matching = all.filter((p) => p.channelId === bestChan);
      if (!matching.length) continue;
      const winMs = 12 * 3600000;
      const now = Date.now();
      return matching
        .filter((p) => (p.endTimestamp ?? 0) > now - winMs && (p.startTimestamp ?? 0) < now + winMs)
        .sort((a, b) => (a.startTimestamp ?? 0) - (b.startTimestamp ?? 0));
    } catch {
      // Try next source
    }
  }
  return [];
}

/**
 * Bulk EPG lookup: loads one XMLTV source ONCE, matches ALL channels in one pass.
 * Returns map of channel.id → EpgProgram[]. Much faster than per-channel fetchFreeEpg.
 */
export async function fetchFreeEpgBulk(
  channels: { id: string; name: string; tvgId?: string }[]
): Promise<Record<string, EpgProgram[]>> {
  const norm = (s: string) =>
    s.toLowerCase()
      .replace(/\s*(hd|fhd|sd|4k|uhd|raw|ᴿᴬᵂ|\+|\|)/gi, "")
      .replace(/[\s\-_.:]/g, "")
      .trim();

  const nameWords = (name: string) =>
    name.toLowerCase()
      .replace(/\s*(hd|fhd|sd|4k|uhd|raw)/gi, "")
      .split(/[\s\-_.:]+/)
      .filter((w) => w.length >= 3);

  const winMs = 12 * 3600000;
  const now = Date.now();

  for (const src of FREE_EPG_SOURCES) {
    try {
      const all = await loadXmltvSource(src);
      if (all.length === 0) continue;
      const nameMap = xmltvChannelNames.get(src) || new Map();

      // Build unique channel id → programs map from this source
      const byId = new Map<string, EpgProgram[]>();
      for (const p of all) {
        if (!byId.has(p.channelId)) byId.set(p.channelId, []);
        byId.get(p.channelId)!.push(p);
      }
      const uniqueIds = [...byId.keys()];

      const result: Record<string, EpgProgram[]> = {};
      let matched = 0;

      for (const ch of channels) {
        const n = norm(ch.name);
        const id = ch.tvgId ? norm(ch.tvgId) : "";
        const words = nameWords(ch.name);

        // Try each match strategy in order
        const found =
          // 1. Exact tvg-id on xmltv channel id
          (id && uniqueIds.find((xId) => norm(xId) === id)) ||
          // 2. Exact name
          uniqueIds.find((xId) => norm(xId) === n || norm(nameMap.get(xId) || "") === n) ||
          // 3. Tvg-id partial
          (id.length >= 3 && uniqueIds.find((xId) => { const nx = norm(xId); return nx.includes(id) || id.includes(nx); })) ||
          // 4. Name partial
          uniqueIds.find((xId) => { const nx = norm(xId); const dn = norm(nameMap.get(xId) || ""); return nx.includes(n) || n.includes(nx) || dn.includes(n) || n.includes(dn); }) ||
          // 5. Word match
          (words.length > 0 && uniqueIds.find((xId) => {
            const s = (xId + " " + (nameMap.get(xId) || "")).toLowerCase();
            return words.some((w) => s.includes(w));
          }));

        if (found) {
          const programs = (byId.get(found) || [])
            .filter((p) => (p.endTimestamp ?? 0) > now - winMs && (p.startTimestamp ?? 0) < now + winMs)
            .sort((a, b) => (a.startTimestamp ?? 0) - (b.startTimestamp ?? 0));
          if (programs.length > 0) { result[ch.id] = programs; matched++; }
        }
      }

      // If we matched at least 20% of channels, use this source
      if (matched >= Math.max(1, channels.length * 0.2)) return result;
    } catch {
      // try next source
    }
  }
  return {};
}

/**
 * Build a Catchup/Timeshift URL for watching archived programs.
 * Xtream Codes API format: /streaming/timeshift.php?username=X&password=Y&stream=ID&start=YYYY-MM-DD:HH-MM&duration=MINUTES
 */
export function buildCatchupUrl(
  creds: XtreamCredentials,
  streamId: number,
  startTimestamp: number,
  endTimestamp: number
): string {
  const base = upgradeHttps(buildBaseUrl(creds));
  const u = creds.username.trim();
  const p = creds.password.trim();
  const start = new Date(startTimestamp);
  const durationMin = Math.ceil((endTimestamp - startTimestamp) / 60000);

  // Format: YYYY-MM-DD:HH-MM
  const y = start.getUTCFullYear();
  const mo = String(start.getUTCMonth() + 1).padStart(2, "0");
  const d = String(start.getUTCDate()).padStart(2, "0");
  const h = String(start.getUTCHours()).padStart(2, "0");
  const mi = String(start.getUTCMinutes()).padStart(2, "0");
  const startStr = `${y}-${mo}-${d}:${h}-${mi}`;

  return `${base}/streaming/timeshift.php?username=${encodeURIComponent(u)}&password=${encodeURIComponent(p)}&stream=${streamId}&start=${startStr}&duration=${durationMin}`;
}

/**
 * Fetch full movie details (plot, cast, trailer, etc.)
 */
const CACHE_TTL_VOD_INFO = 30 * 60 * 1000; // 30 minutes

export async function fetchVodInfo(
  creds: XtreamCredentials,
  vodId: number
): Promise<MovieInfo> {
  const cacheKey = buildCacheKey(creds, "vod_info", String(vodId));
  const memCached = getCached<MovieInfo>(cacheKey);
  if (memCached) return memCached;

  if (typeof window !== "undefined") {
    const idb = await idbGetVodInfo<MovieInfo>(vodId);
    if (idb) { setCache(cacheKey, idb, CACHE_TTL_VOD_INFO); return idb; }
  }

  const url = buildApiUrl(creds, "get_vod_info") + `&vod_id=${vodId}`;
  const data = await fetchJson<{
    info?: Record<string, unknown>;
    movie_data?: Record<string, unknown>;
  }>(url);

  const info = data.info || {};
  const movieData = data.movie_data || {};
  const backdropRaw = info.backdrop_path;
  const backdropPath: string[] = Array.isArray(backdropRaw)
    ? (backdropRaw as string[]).filter(Boolean)
    : typeof backdropRaw === "string" && backdropRaw
      ? [backdropRaw]
      : [];

  const result: MovieInfo = {
    streamId: Number(movieData.stream_id ?? vodId),
    name: String(info.name ?? movieData.name ?? ""),
    originalName: info.o_name ? String(info.o_name) : undefined,
    cover: fixImageUrl(String(info.movie_image ?? info.cover ?? "")),
    coverBig: info.cover_big ? fixImageUrl(String(info.cover_big)) : undefined,
    backdropPath: backdropPath.map(fixImageUrl),
    rating: String(info.rating ?? "0"),
    plot: String(info.plot ?? info.description ?? ""),
    cast: String(info.cast ?? ""),
    director: String(info.director ?? ""),
    genre: String(info.genre ?? ""),
    releaseDate: String(info.release_date ?? info.releasedate ?? ""),
    year: info.year ? String(info.year) : undefined,
    duration: String(info.duration ?? ""),
    durationSecs: info.duration_secs ? Number(info.duration_secs) : undefined,
    country: info.country ? String(info.country) : undefined,
    youtubeTrailer: info.youtube_trailer ? String(info.youtube_trailer) : undefined,
    tmdbId: info.tmdb_id ? String(info.tmdb_id) : undefined,
    containerExtension: String(movieData.container_extension ?? "mp4"),
    categoryId: String(movieData.category_id ?? info.category_id ?? ""),
  };

  setCache(cacheKey, result, CACHE_TTL_VOD_INFO);
  if (typeof window !== "undefined") idbPutVodInfo(vodId, result);
  return result;
}

/**
 * Fetch full series info with seasons and episodes.
 */
const CACHE_TTL_SERIES_INFO = 30 * 60 * 1000;

export async function fetchFullSeriesInfo(
  creds: XtreamCredentials,
  seriesId: number
): Promise<SeriesInfo> {
  const cacheKey = buildCacheKey(creds, "series_info", String(seriesId));
  const memCached = getCached<SeriesInfo>(cacheKey);
  if (memCached) return memCached;

  if (typeof window !== "undefined") {
    const idb = await idbGetSeriesInfo<SeriesInfo>(seriesId);
    if (idb) { setCache(cacheKey, idb, CACHE_TTL_SERIES_INFO); return idb; }
  }

  const url = buildApiUrl(creds, "get_series_info") + `&series_id=${seriesId}`;
  const data = await fetchJson<{
    info?: Record<string, unknown>;
    seasons?: Record<string, unknown>[];
    episodes?: Record<string, Record<string, unknown>[]>;
  }>(url);

  const info = data.info || {};
  const backdropRaw = info.backdrop_path;
  const backdropPath: string[] = Array.isArray(backdropRaw)
    ? (backdropRaw as string[]).filter(Boolean)
    : typeof backdropRaw === "string" && backdropRaw
      ? [backdropRaw]
      : [];

  const seasons: SeasonInfo[] = (data.seasons || []).map((s) => ({
    seasonNumber: Number(s.season_number ?? 0),
    name: String(s.name ?? `Staffel ${s.season_number}`),
    episodeCount: Number(s.episode_count ?? 0),
    cover: s.cover ? fixImageUrl(String(s.cover)) : undefined,
    coverBig: s.cover_big ? fixImageUrl(String(s.cover_big)) : undefined,
    overview: s.overview ? String(s.overview) : undefined,
    airDate: s.air_date ? String(s.air_date) : undefined,
  }));

  const episodes: Record<string, EpisodeInfo[]> = {};
  if (data.episodes) {
    for (const [seasonNum, eps] of Object.entries(data.episodes)) {
      episodes[seasonNum] = (eps as Record<string, unknown>[]).map((e) => {
        const epInfo = (e.info || {}) as Record<string, unknown>;
        return {
          id: String(e.id ?? ""),
          episodeNum: Number(e.episode_num ?? 0),
          title: String(e.title ?? `Episode ${e.episode_num}`),
          containerExtension: String(e.container_extension ?? "mp4"),
          season: Number(e.season ?? seasonNum),
          info: {
            movieImage: epInfo.movie_image ? fixImageUrl(String(epInfo.movie_image)) : undefined,
            plot: epInfo.plot ? String(epInfo.plot) : undefined,
            duration: epInfo.duration ? String(epInfo.duration) : undefined,
            durationSecs: epInfo.duration_secs ? Number(epInfo.duration_secs) : undefined,
            releaseDate: epInfo.release_date ? String(epInfo.release_date) : undefined,
            rating: epInfo.rating ? String(epInfo.rating) : undefined,
          },
        };
      });
    }
  }

  const result: SeriesInfo = {
    name: String(info.name ?? ""),
    cover: fixImageUrl(String(info.cover ?? "")),
    plot: String(info.plot ?? ""),
    cast: String(info.cast ?? ""),
    director: String(info.director ?? ""),
    genre: String(info.genre ?? ""),
    releaseDate: String(info.release_date ?? ""),
    rating: String(info.rating ?? "0"),
    categoryId: String(info.category_id ?? ""),
    backdropPath,
    youtubeTrailer: info.youtube_trailer ? String(info.youtube_trailer) : undefined,
    seasons,
    episodes,
  };

  setCache(cacheKey, result, CACHE_TTL_SERIES_INFO);
  if (typeof window !== "undefined") idbPutSeriesInfo(seriesId, result);
  return result;
}

function safeAtob(str: string): string {
  try {
    // atob() decodes Base64 to Latin-1 bytes. For UTF-8 content (ä, ö, ü etc.)
    // we must re-decode the byte string as UTF-8.
    const bytes = atob(str);
    const uint8 = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) uint8[i] = bytes.charCodeAt(i);
    return new TextDecoder("utf-8").decode(uint8);
  } catch {
    return str;
  }
}

/**
 * Auto-upgrade HTTP URLs to HTTPS when the page is on HTTPS.
 * This enables direct browser-to-server streaming (bypassing the proxy),
 * which uses the user's real IP instead of the datacenter IP.
 * Most Xtream servers support HTTPS on port 443 alongside HTTP.
 */
function upgradeHttps(url: string): string {
  if (typeof window !== "undefined" && window.location.protocol === "https:") {
    return url.replace(/^http:\/\//i, "https://");
  }
  return url;
}

// Normalize VOD container extension — MKV/AVI/FLV are not reliably decoded
// by browsers. Xtream servers always serve the same stream as .mp4 on request.
function normalizeVodExt(ext: string): string {
  const l = (ext || "mp4").toLowerCase().replace(/^\./, "");
  return (l === "mkv" || l === "avi" || l === "flv" || l === "wmv" || l === "mov") ? "mp4" : (l || "mp4");
}

export function buildStreamUrl(
  creds: XtreamCredentials,
  streamId: number,
  type: "live" | "movie" | "series",
  extension?: string
): string {
  const base = upgradeHttps(buildBaseUrl(creds));
  const u = creds.username.trim();
  const p = creds.password.trim();
  if (type === "live") {
    const ext = extension || "m3u8";
    return `${base}/live/${u}/${p}/${streamId}.${ext}`;
  }
  if (type === "movie") {
    return `${base}/movie/${u}/${p}/${streamId}.${normalizeVodExt(extension || "mp4")}`;
  }
  return `${base}/series/${u}/${p}/${streamId}.${normalizeVodExt(extension || "mp4")}`;
}

export function buildVodUrl(
  creds: XtreamCredentials,
  streamId: number,
  extension: string = "mp4"
): string {
  return buildStreamUrl(creds, streamId, "movie", extension);
}

export function buildSeriesUrl(
  creds: XtreamCredentials,
  episodeId: number,
  extension: string = "mp4"
): string {
  return buildStreamUrl(creds, episodeId, "series", extension);
}

// ==================== Country Detection & Grouping ====================

/**
 * Extract country from a group/category title string.
 * Delegates to the countries utility for pattern matching.
 */
export function extractCountry(groupTitle: string): string {
  const info = extractCountryFromGroup(groupTitle);
  return info ? `${info.flag} ${info.name}` : "Other";
}

/**
 * Group an array of items by detected country from a specified field.
 * Creates a record of country label -> items array.
 *
 * @param items - Array of items (channels, movies, series, categories, etc.)
 * @param groupField - The field name containing the group/category title to parse
 * @returns Record with country labels as keys and arrays of items as values
 */
export function groupByCountry<T extends Record<string, unknown>>(
  items: T[],
  groupField: string
): Record<string, T[]> {
  const groups: Record<string, T[]> = {};

  for (const item of items) {
    const fieldValue = String(item[groupField] ?? "");
    const country = extractCountry(fieldValue);
    if (!groups[country]) {
      groups[country] = [];
    }
    groups[country].push(item);
  }

  return groups;
}

/**
 * Group categories by detected country from their category names.
 * Returns a map of country label -> categories.
 */
export function groupCategoriesByCountry(
  categories: Category[]
): Record<string, Category[]> {
  const groups: Record<string, Category[]> = {};

  for (const cat of categories) {
    const country = extractCountry(cat.categoryName);
    if (!groups[country]) {
      groups[country] = [];
    }
    groups[country].push(cat);
  }

  return groups;
}

// ==================== Parallel Content Fetching ====================

export interface AllContent {
  liveCategories: Category[];
  liveStreams: Channel[];
  vodCategories: Category[];
  vodStreams: Movie[];
  seriesCategories: Category[];
  seriesList: Series[];
}

/**
 * Fetch all content (categories + streams) in parallel for faster loading.
 * Each individual fetch is cached independently.
 */
export async function fetchAllContent(
  creds: XtreamCredentials
): Promise<AllContent> {
  const [
    liveCategories,
    liveStreams,
    vodCategories,
    vodStreams,
    seriesCategories,
    seriesList,
  ] = await Promise.all([
    fetchLiveCategories(creds),
    fetchLiveStreams(creds),
    fetchVodCategories(creds),
    fetchVodStreams(creds),
    fetchSeriesCategories(creds),
    fetchSeries(creds),
  ]);

  return {
    liveCategories,
    liveStreams,
    vodCategories,
    vodStreams,
    seriesCategories,
    seriesList,
  };
}

// ==================== M3U Parser ====================

export async function parseM3UFromUrl(
  m3uUrl: string
): Promise<ParsedM3UResult> {
  // Always proxy external M3U URLs to bypass CORS
  const url = m3uUrl.trim();
  const needsProxy = typeof window !== "undefined" && isExternalUrl(url);
  const fetchUrl = needsProxy ? `/api/proxy?url=${encodeURIComponent(url)}` : url;

  const res = await fetch(fetchUrl);
  if (!res.ok) throw new Error(`Failed to fetch M3U: ${res.statusText}`);
  const text = await res.text();
  return parseM3UContent(stripSurrogates(text));
}

function parseM3UContent(content: string): ParsedM3UResult {
  const lines = stripSurrogates(content).split("\n").map((l) => l.trim());
  const channels: Channel[] = [];
  let epgUrl: string | null = null;

  if (lines[0]?.startsWith("#EXTM3U")) {
    const epgMatch = lines[0].match(/url-tvg="([^"]+)"/);
    if (epgMatch) epgUrl = epgMatch[1];
  }

  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].startsWith("#EXTINF:")) continue;

    const infoLine = lines[i];
    let urlLine = "";
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j] && !lines[j].startsWith("#")) {
        urlLine = lines[j];
        break;
      }
    }
    if (!urlLine) continue;

    const nameMatch = infoLine.match(/,(.+)$/);
    const logoMatch = infoLine.match(/tvg-logo="([^"]*)"/);
    const groupMatch = infoLine.match(/group-title="([^"]*)"/);
    const tvgIdMatch = infoLine.match(/tvg-id="([^"]*)"/);
    const tvgNameMatch = infoLine.match(/tvg-name="([^"]*)"/);

    const name = nameMatch ? nameMatch[1].trim() : "Unknown";
    const isVod =
      urlLine.endsWith(".mp4") ||
      urlLine.endsWith(".mkv") ||
      urlLine.endsWith(".avi");
    const isSeries = /\/series\//.test(urlLine);

    channels.push({
      id: String(channels.length + 1),
      name,
      logo: logoMatch?.[1] ?? "",
      group: groupMatch?.[1] ?? "Uncategorized",
      url: upgradeHttps(urlLine),
      tvgId: tvgIdMatch?.[1] ?? "",
      tvgName: tvgNameMatch?.[1] ?? name,
      isLive: !isVod && !isSeries,
      streamType: isSeries ? "series" : isVod ? "movie" : "live",
    });
  }

  return { channels, epgUrl };
}
