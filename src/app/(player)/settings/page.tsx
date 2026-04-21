"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import {
  HiCog6Tooth, HiLockClosed, HiTrash, HiDeviceTablet,
  HiArrowLeftOnRectangle, HiShieldCheck, HiTv, HiEye,
  HiLanguage, HiSignal, HiListBullet, HiChevronRight,
  HiInformationCircle, HiCheckCircle, HiChartBar, HiMoon,
  HiCommandLine, HiBellAlert
} from "react-icons/hi2";
import { useAuthStore, useSettingsStore, useRecentStore } from "@/lib/store";
import { useI18nStore, useT, LOCALE_NAMES, type Locale } from "@/lib/i18n";
import { ConfirmDialog } from "@/components/ui/Modal";
import PinDialog from "@/components/ui/PinDialog";

type SettingsSection = "general" | "video" | "playback" | "accessibility" | "storage" | "about";

interface SettingItemProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  value?: string;
  action?: React.ReactNode;
  onClick?: () => void;
}

function SettingItem({ icon, label, description, value, action, onClick }: SettingItemProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 transition-all group"
    >
      <div className="text-2xl text-amber-400">{icon}</div>
      <div className="flex-1 text-left">
        <p className="font-semibold text-white">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
        {value && <p className="text-sm text-amber-400 mt-0.5 font-medium">{value}</p>}
      </div>
      {action ? (
        <div onClick={(e) => e.stopPropagation()}>{action}</div>
      ) : (
        <HiChevronRight className="h-5 w-5 text-gray-600 group-hover:text-gray-500 transition-colors" />
      )}
    </button>
  );
}

function SettingSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3 px-4">{title}</h3>
      <div className="space-y-2 px-4">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { macAddress, logout, credentials, playlistName, savedPlaylists, switchPlaylist } = useAuthStore();
  const {
    parentalPin, bufferSize, preferredFormat, autoplay,
    fontSize, remoteControlMode, showChannelNumbers, brightness,
    setPin, setBufferSize, setPreferredFormat, setAutoplay,
    setFontSize, setRemoteControlMode, setShowChannelNumbers, setBrightness,
  } = useSettingsStore();
  const clearRecent = useRecentStore((s) => s.clear);
  const { locale, setLocale } = useI18nStore();
  const t = useT();

  const [currentSection, setCurrentSection] = useState<SettingsSection>("general");
  const [showSetPin, setShowSetPin] = useState(false);
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [showDeviceInfo, setShowDeviceInfo] = useState(false);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  // Device info
  const getDeviceInfo = () => {
    if (typeof window === "undefined") return {};
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      cookiesEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      screenResolution: `${window.innerWidth}x${window.innerHeight}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  };

  const renderSection = () => {
    switch (currentSection) {
      case "general":
        return (
          <div className="space-y-6">
            <SettingSection title="Sprache & Lokalisierung">
              <SettingItem
                icon="🌐"
                label="Sprache"
                description="Wählen Sie Ihre bevorzugte Sprache"
                action={
                  <div className="flex gap-2">
                    {["de", "en", "tr"].map((l) => (
                      <button
                        key={l}
                        onClick={(e) => {
                          e.stopPropagation();
                          setLocale(l as Locale);
                        }}
                        className={clsx(
                          "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                          locale === l
                            ? "bg-amber-500 text-white"
                            : "bg-white/10 text-gray-400 hover:bg-white/20"
                        )}
                      >
                        {LOCALE_NAMES[l as Locale]}
                      </button>
                    ))}
                  </div>
                }
              />
            </SettingSection>

            <SettingSection title="Sicherheit & Zugriff">
              <SettingItem
                icon={<HiLockClosed />}
                label="Elternkontrollen"
                description="PIN-Code für Inhalte festlegen"
                value={parentalPin ? "Aktiviert" : "Deaktiviert"}
                onClick={() => setShowSetPin(true)}
              />
              <SettingItem
                icon={<HiDeviceTablet />}
                label="Geräte-MAC"
                description="Eindeutige Geräte-ID"
                action={
                  <span className="text-sm text-gray-400 font-mono select-all">{macAddress}</span>
                }
              />
            </SettingSection>

            <SettingSection title="Konto & Playlists">
              <SettingItem
                icon="📡"
                label="Aktive Playlist"
                description="Aktuell aktive IPTV-Quelle"
                value={playlistName}
              />
              <SettingItem
                icon={<HiArrowLeftOnRectangle />}
                label="Abmelden"
                description="Von Ihrem Konto abmelden"
                onClick={() => setShowConfirmLogout(true)}
              />
            </SettingSection>
          </div>
        );

      case "video":
        return (
          <div className="space-y-6">
            <SettingSection title="Videoeinstellungen">
              <SettingItem
                icon={<HiSignal />}
                label="Puffergröße"
                description="HLS-Pufferspeicher (Sekunden)"
                action={
                  <select
                    value={bufferSize}
                    onChange={(e) => setBufferSize(Number(e.target.value) as 5 | 10 | 15 | 20)}
                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm"
                  >
                    <option value={5}>5s</option>
                    <option value={10}>10s</option>
                    <option value={15}>15s</option>
                    <option value={20}>20s</option>
                  </select>
                }
              />
              <SettingItem
                icon="🎬"
                label="Videoformat"
                description="Bevorzugtes Wiedergabeformat"
                action={
                  <select
                    value={preferredFormat}
                    onChange={(e) => setPreferredFormat(e.target.value as "hls" | "dash" | "mp4")}
                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm"
                  >
                    <option value="hls">HLS (Standard)</option>
                    <option value="dash">DASH</option>
                    <option value="mp4">MP4</option>
                  </select>
                }
              />
              <SettingItem
                icon={<HiMoon />}
                label="Helligkeit"
                description="Bildschirmhelligkeit anpassen"
                action={
                  <input
                    type="range"
                    min="50"
                    max="100"
                    value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    className="w-24"
                  />
                }
              />
            </SettingSection>

            <SettingSection title="Qualität">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-3">Verfügbare Qualitätsoptionen werden automatisch erkannt.</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Automatisch</span>
                    <span className="text-amber-400">✓</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Die beste verfügbare Qualität wird basierend auf Ihrer Verbindung automatisch gewählt.
                  </div>
                </div>
              </div>
            </SettingSection>
          </div>
        );

      case "playback":
        return (
          <div className="space-y-6">
            <SettingSection title="Wiedergabeverhalten">
              <SettingItem
                icon="▶️"
                label="Autoplay"
                description="Nächsten Inhalt automatisch abspielen"
                action={
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setAutoplay(!autoplay);
                    }}
                    className={clsx(
                      "px-4 py-2 rounded-lg font-semibold text-sm transition-all",
                      autoplay
                        ? "bg-green-500/20 text-green-400"
                        : "bg-white/10 text-gray-400"
                    )}
                  >
                    {autoplay ? "An" : "Aus"}
                  </button>
                }
              />
              <SettingItem
                icon="⏱️"
                label="Fortschritt speichern"
                description="Automatisch Startposition speichern"
                action={
                  <span className="text-green-400 text-sm font-semibold">✓ Aktiviert</span>
                }
              />
            </SettingSection>

            <SettingSection title="Steuerung">
              <SettingItem
                icon={<HiTv />}
                label="TV-Fernbedienungsmodus"
                description="Optimiert für Fernbedienungen"
                action={
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setRemoteControlMode(!remoteControlMode);
                    }}
                    className={clsx(
                      "px-4 py-2 rounded-lg font-semibold text-sm transition-all",
                      remoteControlMode
                        ? "bg-blue-500/20 text-blue-400"
                        : "bg-white/10 text-gray-400"
                    )}
                  >
                    {remoteControlMode ? "An" : "Aus"}
                  </button>
                }
              />
            </SettingSection>
          </div>
        );

      case "accessibility":
        return (
          <div className="space-y-6">
            <SettingSection title="Anzeige">
              <SettingItem
                icon="🔤"
                label="Schriftgröße"
                description="Größe der Benutzeroberfläche"
                action={
                  <select
                    value={fontSize}
                    onChange={(e) => setFontSize(e.target.value as any)}
                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm"
                  >
                    <option value="normal">Normal</option>
                    <option value="large">Groß</option>
                    <option value="extra-large">Sehr Groß</option>
                  </select>
                }
              />
              <SettingItem
                icon={<HiListBullet />}
                label="Kanalnummern anzeigen"
                description="Zeige Kanalnummern in Listen"
                action={
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowChannelNumbers(!showChannelNumbers);
                    }}
                    className={clsx(
                      "px-4 py-2 rounded-lg font-semibold text-sm transition-all",
                      showChannelNumbers
                        ? "bg-green-500/20 text-green-400"
                        : "bg-white/10 text-gray-400"
                    )}
                  >
                    {showChannelNumbers ? "An" : "Aus"}
                  </button>
                }
              />
            </SettingSection>

            <SettingSection title="Untertitel & Audio">
              <SettingItem
                icon="CC"
                label="Untertitel"
                description="Standarduntertitel verwenden"
                action={
                  <span className="text-sm text-gray-500">Automatisch</span>
                }
              />
              <SettingItem
                icon="🔊"
                label="Standardaudio"
                description="Bevorzugte Audiosprache"
                action={
                  <span className="text-sm text-gray-500">Originalsprache</span>
                }
              />
            </SettingSection>
          </div>
        );

      case "storage":
        return (
          <div className="space-y-6">
            <SettingSection title="Speicher & Cache">
              <SettingItem
                icon={<HiChartBar />}
                label="Zuletzt angesehen"
                description={`${useRecentStore((s) => s.items).length} Elemente`}
                onClick={() => setShowConfirmClear(true)}
              />
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-sm text-gray-400">
                  Löschen Sie den Verlauf der zuletzt angesehenen Inhalte.
                </p>
              </div>
            </SettingSection>

            <SettingSection title="Daten">
              <SettingItem
                icon="💾"
                label="Lokale Daten"
                description="Einstellungen, Favoriten, Verlauf"
                action={
                  <span className="text-xs text-gray-500">Gespeichert</span>
                }
              />
            </SettingSection>
          </div>
        );

      case "about":
        return (
          <div className="space-y-6">
            <SettingSection title="Über die App">
              <SettingItem
                icon="🎬"
                label="IPTV TREX"
                description="Premium Streaming Experience"
                value="v1.0.0"
              />
              <SettingItem
                icon={<HiInformationCircle />}
                label="Build Informationen"
                description="Geräte- & System-Details"
                onClick={() => setShowDeviceInfo(true)}
              />
            </SettingSection>

            <SettingSection title="Links">
              <a
                href="#"
                className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-white/5 transition-all"
              >
                <div className="text-left">
                  <p className="font-semibold text-white">Datenschutz</p>
                  <p className="text-xs text-gray-500">Datenschutzerklärung</p>
                </div>
                <HiChevronRight className="h-5 w-5 text-gray-600" />
              </a>
            </SettingSection>

            <SettingSection title="Support">
              <SettingItem
                icon={<HiBellAlert />}
                label="Fehler melden"
                description="Helfen Sie uns, die App zu verbessern"
              />
            </SettingSection>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-full bg-gradient-to-b from-[#0d0d14] to-[#1a1a24] overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#0d0d14]/80 backdrop-blur-md border-b border-[#2a2a38]">
        <div className="px-4 md:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-black text-white mb-2">⚙️ Einstellungen</h1>
          <p className="text-gray-400">Personalisieren Sie Ihre Erfahrung</p>
        </div>
      </div>

      <div className="flex h-[calc(100vh-120px)]">
        {/* Sidebar */}
        <div className="hidden md:flex w-56 flex-col border-r border-[#2a2a38] bg-[#0d0d14]/50">
          <div className="p-4 space-y-2">
            {[
              { id: "general", label: "Allgemein", icon: "⚙️" },
              { id: "video", label: "Video", icon: "🎬" },
              { id: "playback", label: "Wiedergabe", icon: "▶️" },
              { id: "accessibility", label: "Barrierefreiheit", icon: "♿" },
              { id: "storage", label: "Speicher", icon: "💾" },
              { id: "about", label: "Über", icon: "ℹ️" },
            ].map((section) => (
              <button
                key={section.id}
                onClick={() => setCurrentSection(section.id as SettingsSection)}
                className={clsx(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                  currentSection === section.id
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                <span className="text-lg">{section.icon}</span>
                <span className="font-semibold">{section.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Mobile Tabs */}
        <div className="md:hidden w-full overflow-x-auto border-b border-[#2a2a38]">
          <div className="flex gap-2 p-3 min-w-max px-4">
            {[
              { id: "general", label: "Allgemein" },
              { id: "video", label: "Video" },
              { id: "playback", label: "Wiedergabe" },
            ].map((section) => (
              <button
                key={section.id}
                onClick={() => setCurrentSection(section.id as SettingsSection)}
                className={clsx(
                  "px-4 py-2 rounded-lg whitespace-nowrap text-sm font-semibold transition-all",
                  currentSection === section.id
                    ? "bg-amber-500 text-white"
                    : "bg-white/10 text-gray-400"
                )}
              >
                {section.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10">
          <div className="max-w-3xl">{renderSection()}</div>
        </div>
      </div>

      {/* Dialogs */}
      <PinDialog isOpen={showSetPin} onClose={() => setShowSetPin(false)} />
      <ConfirmDialog
        isOpen={showConfirmLogout}
        title="Abmelden"
        message="Möchten Sie sich wirklich abmelden? Sie müssen sich erneut anmelden, um Inhalte zu streamen."
        confirmText="Abmelden"
        cancelText="Abbrechen"
        isDangerous={true}
        onConfirm={handleLogout}
        onCancel={() => setShowConfirmLogout(false)}
      />
      <ConfirmDialog
        isOpen={showConfirmClear}
        title="Verlauf löschen"
        message="Möchten Sie den Verlauf der zuletzt angesehenen Inhalte wirklich löschen?"
        confirmText="Löschen"
        cancelText="Abbrechen"
        isDangerous={true}
        onConfirm={() => {
          clearRecent();
          setShowConfirmClear(false);
        }}
        onCancel={() => setShowConfirmClear(false)}
      />
    </div>
  );
}
