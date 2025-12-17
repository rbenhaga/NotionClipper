/**
 * AccountSection — Premium UI/UX pass (Apple/Notion-ish)
 * - Clear hierarchy, less “grey mush”
 * - Obvious affordances (real buttons, strong labels/value contrast)
 * - Safer destructive actions (confirm modal)
 * - Polished micro-interactions (Framer Motion)
 *
 * Drop-in file: AccountSection.tsx
 */

import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronDown,
  ExternalLink,
  FolderOpen,
  Lock,
  LogOut,
  Pencil,
  RefreshCw,
  Shield,
  X,
} from "lucide-react";

import { useAuth } from "../../../contexts/AuthContext";
import { authDataManager } from "../../../services/AuthDataManager";

interface AccountSectionProps {
  config: {
    userName?: string;
    userEmail?: string;
    [key: string]: unknown;
  };
  showNotification?: (message: string, type: "success" | "error" | "info") => void;
  onDisconnect?: () => void;
}

type ConnectionStatus = "connected" | "expired" | "error" | "unknown";

export const AccountSection: React.FC<AccountSectionProps> = ({
  config,
  showNotification,
  onDisconnect,
}) => {
  const [authData, setAuthData] = useState<{
    fullName?: string;
    email?: string;
    notionWorkspace?: { id: string; name: string; icon?: string };
  } | null>(null);

  // Name edit
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);

  // Advanced
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [disconnectConfirmOpen, setDisconnectConfirmOpen] = useState(false);

  // Reconnect
  const [isReconnecting, setIsReconnecting] = useState(false);

  // TODO: wire to real auth state / token expiry
  const [connectionStatus] = useState<ConnectionStatus>("connected");

  // Auth context (defensive) - Hook MUST be at top level, not inside useMemo
  let authContextValue: ReturnType<typeof useAuth> | null = null;
  try {
    authContextValue = useAuth();
  } catch {
    // Context not available - that's OK
  }
  
  const authProfile = useMemo(() => {
    return authContextValue?.profile
      ? {
          full_name: authContextValue.profile.full_name ?? undefined,
          email: authContextValue.profile.email ?? undefined,
        }
      : null;
  }, [authContextValue?.profile]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await authDataManager.loadAuthData(true);
        if (!data) return;
        setAuthData({
          fullName: data.fullName ?? undefined,
          email: data.email ?? undefined,
          notionWorkspace: data.notionWorkspace ?? undefined,
        });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[AccountSection] loadAuthData failed:", e);
      }
    };
    load();
  }, []);

  const userName = authProfile?.full_name || authData?.fullName || config.userName || "";
  const userEmail = authProfile?.email || authData?.email || config.userEmail || "";
  const workspace = authData?.notionWorkspace;

  useEffect(() => {
    if (userName) setEditName(userName);
  }, [userName]);

  const initials = useMemo(() => {
    const base = (userName || userEmail || "U").trim();
    const parts = base.split(/[\s._-]+/).filter(Boolean);
    const a = parts[0]?.[0] ?? "U";
    const b = parts[1]?.[0] ?? "";
    return (a + b).toUpperCase();
  }, [userName, userEmail]);

  const canDisconnect = Boolean(onDisconnect);

  const handleSaveName = async () => {
    const next = editName.trim();
    if (!next) {
      showNotification?.("Le nom ne peut pas être vide.", "error");
      return;
    }
    setIsSavingName(true);
    try {
      // TODO: persist (your store/DB)
      await new Promise((r) => setTimeout(r, 320));
      setIsEditingName(false);
      showNotification?.("Nom enregistré.", "success");
    } catch {
      showNotification?.("Impossible d’enregistrer le nom.", "error");
    } finally {
      setIsSavingName(false);
    }
  };

  const handleCancelEdit = () => {
    setEditName(userName);
    setIsEditingName(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSaveName();
    if (e.key === "Escape") handleCancelEdit();
  };

  const handleReconnect = async () => {
    setIsReconnecting(true);
    try {
      if ((window as any).electronAPI?.invoke) {
        await (window as any).electronAPI.invoke("auth:notion-oauth");
      }
      showNotification?.("Reconnexion en cours…", "info");
    } catch {
      showNotification?.("La reconnexion a échoué.", "error");
    } finally {
      setTimeout(() => setIsReconnecting(false), 900);
    }
  };

  const handleManageAccess = () => {
    const url = "https://www.notion.so/my-integrations";
    if ((window as any).electronAPI?.invoke) {
      (window as any).electronAPI.invoke("shell:openExternal", url);
    } else {
      window.open(url, "_blank");
    }
  };

  return (
    <div className="max-w-[680px]">
      {/* Top identity strip: increases clarity + removes “where am I?” feeling */}
      <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/70 px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-violet-500/90 to-fuchsia-500/80 text-white flex items-center justify-center font-semibold shadow-sm">
              {initials}
            </div>
            <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-white dark:bg-zinc-950 border border-slate-200/70 dark:border-zinc-800 flex items-center justify-center">
              <Shield size={12} className="text-violet-600" />
            </div>
          </div>

          <div className="min-w-0">
            <div className="truncate text-[14px] font-semibold text-slate-900 dark:text-zinc-50">
              {userName || "Compte"}
            </div>
            <div className="truncate text-[12px] text-slate-500 dark:text-zinc-500">
              {userEmail || "—"}
            </div>
          </div>
        </div>

        <StatusPill status={connectionStatus} />
      </div>

      <div className="space-y-5">
        {/* Notion connection */}
        <SectionCard
          eyebrow="CONNEXION"
          title="Notion"
          description="Synchronisation et accès au workspace."
          rightSlot={
            connectionStatus !== "connected" ? (
              <Button
                variant="primary"
                onClick={handleReconnect}
                disabled={isReconnecting}
                icon={
                  <RefreshCw
                    size={15}
                    className={isReconnecting ? "animate-spin" : ""}
                  />
                }
              >
                {isReconnecting ? "Reconnexion…" : "Reconnecter"}
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={handleManageAccess}
                icon={<ExternalLink size={15} />}
              >
                Gérer l’accès
              </Button>
            )
          }
        >
          <KeyValueRow
            label="Workspace"
            value={
              workspace?.name ? (
                <span className="inline-flex items-center gap-2">
                  {workspace.icon ? (
                    <span className="text-[16px]">{workspace.icon}</span>
                  ) : (
                    <FolderOpen size={16} className="text-slate-400" />
                  )}
                  <span className="font-semibold text-slate-900 dark:text-zinc-50">
                    {workspace.name}
                  </span>
                </span>
              ) : (
                <span className="text-slate-500 dark:text-zinc-500">—</span>
              )
            }
          />

          <Divider />

          <KeyValueRow
            label="Statut"
            value={<InlineStatus status={connectionStatus} />}
          />

          {connectionStatus !== "connected" && (
            <InfoBanner tone={connectionStatus === "expired" ? "warning" : "danger"}>
              {connectionStatus === "expired"
                ? "Session expirée : reconnectez-vous pour reprendre la synchronisation."
                : "Une erreur empêche la connexion à Notion. Essayez de reconnecter."}
            </InfoBanner>
          )}
        </SectionCard>

        {/* Profile */}
        <SectionCard
          eyebrow="PROFIL"
          title="Identité"
          description="Visible dans Clipper Pro uniquement (n’affecte pas Notion)."
          rightSlot={
            !isEditingName ? (
              <Button
                variant="secondary"
                onClick={() => setIsEditingName(true)}
                icon={<Pencil size={15} />}
              >
                Modifier
              </Button>
            ) : null
          }
        >
          <div className="space-y-2">
            <KeyValueRow
              label="Nom"
              value={
                <AnimatePresence mode="wait" initial={false}>
                  {isEditingName ? (
                    <motion.div
                      key="edit"
                      initial={{ opacity: 0, y: -2 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -2 }}
                      className="flex items-center gap-2"
                    >
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={handleKeyDown}
                        autoFocus
                        className="w-[280px] max-w-full rounded-xl border border-slate-300/70 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-[14px] text-slate-900 dark:text-zinc-100 shadow-sm
                                   focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-500"
                        placeholder="Votre nom"
                      />
                      <Button
                        variant="primary"
                        onClick={handleSaveName}
                        disabled={isSavingName}
                        icon={
                          isSavingName ? (
                            <Spinner />
                          ) : (
                            <Check size={16} />
                          )
                        }
                      >
                        Enregistrer
                      </Button>
                      <IconButton onClick={handleCancelEdit} ariaLabel="Annuler">
                        <X size={16} />
                      </IconButton>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="display"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-[14px] font-semibold text-slate-900 dark:text-zinc-50"
                    >
                      {userName || "—"}
                    </motion.div>
                  )}
                </AnimatePresence>
              }
              help={
                isEditingName
                  ? "Astuce : Entrée pour enregistrer · Échap pour annuler"
                  : undefined
              }
            />

            <Divider />

            <KeyValueRow
              label="Email"
              value={
                <div className="flex items-center justify-between gap-3 w-full">
                  <span className="truncate text-[14px] text-slate-700 dark:text-zinc-300">
                    {userEmail || "—"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[12px] text-slate-500 dark:text-zinc-500">
                    <Lock size={14} />
                    Lecture seule
                  </span>
                </div>
              }
              help="Géré par Notion"
            />
          </div>
        </SectionCard>

        {/* Advanced + destructive */}
        <SectionCard
          eyebrow="SYSTÈME"
          title="Sécurité"
          description="Actions rares et potentiellement destructrices."
        >
          <button
            onClick={() => setAdvancedOpen((v) => !v)}
            className="w-full flex items-center justify-between rounded-2xl px-3 py-3 hover:bg-slate-50/70 dark:hover:bg-zinc-900/60 transition-colors"
          >
            <div className="text-left">
              <div className="text-[13px] font-semibold text-slate-900 dark:text-zinc-50">
                Options avancées
              </div>
              <div className="text-[12px] text-slate-500 dark:text-zinc-500">
                Déconnexion de ce workspace sur cet appareil
              </div>
            </div>
            <motion.div
              animate={{ rotate: advancedOpen ? 180 : 0 }}
              transition={{ duration: 0.15 }}
            >
              <ChevronDown size={18} className="text-slate-500 dark:text-zinc-500" />
            </motion.div>
          </button>

          <AnimatePresence initial={false}>
            {advancedOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden"
              >
                <div className="pt-3">
                  <div className="rounded-2xl border border-red-200/60 dark:border-red-500/20 bg-red-50/40 dark:bg-red-500/10 p-3">
                    <div className="text-[13px] font-semibold text-red-800 dark:text-red-200">
                      Déconnexion
                    </div>
                    <div className="mt-1 text-[12px] text-red-700/90 dark:text-red-200/80">
                      Vous devrez reconnecter Notion pour synchroniser à nouveau.
                    </div>

                    <div className="mt-3">
                      <Button
                        variant="danger"
                        onClick={() => setDisconnectConfirmOpen(true)}
                        disabled={!canDisconnect}
                        icon={<LogOut size={16} />}
                      >
                        Se déconnecter
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </SectionCard>
      </div>

      {/* Confirm modal */}
      <ConfirmModal
        open={disconnectConfirmOpen}
        title="Se déconnecter de Notion ?"
        description="Cette action déconnecte Notion sur cet appareil. Vos documents ne seront plus synchronisés tant que vous ne vous reconnectez pas."
        confirmText="Se déconnecter"
        cancelText="Annuler"
        tone="danger"
        onCancel={() => setDisconnectConfirmOpen(false)}
        onConfirm={() => {
          setDisconnectConfirmOpen(false);
          onDisconnect?.();
        }}
      />
    </div>
  );
};

/* =========================
   UI building blocks
========================= */

const SectionCard: React.FC<{
  eyebrow?: string;
  title: string;
  description?: string;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
}> = ({ eyebrow, title, description, rightSlot, children }) => (
  <div className="rounded-3xl border border-slate-200/70 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/70 backdrop-blur shadow-[0_1px_0_rgba(0,0,0,0.03)]">
    <div className="px-5 py-4 border-b border-slate-100/80 dark:border-zinc-900 flex items-start justify-between gap-3">
      <div className="min-w-0">
        {eyebrow ? (
          <div className="text-[11px] tracking-wider font-semibold text-slate-400 dark:text-zinc-600">
            {eyebrow}
          </div>
        ) : null}
        <div className="mt-0.5 text-[14px] font-semibold text-slate-900 dark:text-zinc-50">
          {title}
        </div>
        {description ? (
          <div className="mt-1 text-[12.5px] leading-snug text-slate-500 dark:text-zinc-500 max-w-[48ch]">
            {description}
          </div>
        ) : null}
      </div>

      {rightSlot ? <div className="pt-0.5 flex-shrink-0">{rightSlot}</div> : null}
    </div>

    <div className="px-5 py-3">{children}</div>
  </div>
);

const KeyValueRow: React.FC<{
  label: string;
  value: React.ReactNode;
  help?: string;
}> = ({ label, value, help }) => (
  <div className="grid grid-cols-[140px_1fr] gap-4 items-start py-2">
    <div>
      <div className="text-[13px] font-semibold text-slate-700 dark:text-zinc-300">
        {label}
      </div>
      {help ? (
        <div className="mt-1 text-[11.5px] text-slate-400 dark:text-zinc-600">
          {help}
        </div>
      ) : null}
    </div>
    <div className="min-w-0">{value}</div>
  </div>
);

const Divider = () => (
  <div className="h-px bg-slate-100/90 dark:bg-zinc-900/80 -mx-5 my-1" />
);

const StatusPill: React.FC<{ status: ConnectionStatus }> = ({ status }) => {
  const cfg =
    status === "connected"
      ? {
          label: "Sync OK",
          dot: "bg-emerald-500",
          bg: "bg-emerald-50/80 dark:bg-emerald-500/10",
          text: "text-emerald-700 dark:text-emerald-300",
          border: "border-emerald-200/60 dark:border-emerald-500/20",
        }
      : status === "expired"
      ? {
          label: "Action requise",
          dot: "bg-amber-500",
          bg: "bg-amber-50/80 dark:bg-amber-500/10",
          text: "text-amber-700 dark:text-amber-300",
          border: "border-amber-200/60 dark:border-amber-500/20",
        }
      : status === "error"
      ? {
          label: "Erreur",
          dot: "bg-red-500",
          bg: "bg-red-50/80 dark:bg-red-500/10",
          text: "text-red-700 dark:text-red-300",
          border: "border-red-200/60 dark:border-red-500/20",
        }
      : {
          label: "Inconnu",
          dot: "bg-slate-400",
          bg: "bg-slate-50/80 dark:bg-zinc-900/50",
          text: "text-slate-600 dark:text-zinc-300",
          border: "border-slate-200/70 dark:border-zinc-800",
        };

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border ${cfg.border} ${cfg.bg} px-3 py-1 text-[12.5px] font-semibold ${cfg.text}`}
    >
      <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

const InlineStatus: React.FC<{ status: ConnectionStatus }> = ({ status }) => {
  if (status === "connected") {
    return (
      <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-emerald-700 dark:text-emerald-300">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        Connecté
      </span>
    );
  }
  if (status === "expired") {
    return (
      <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-amber-700 dark:text-amber-300">
        <span className="h-2 w-2 rounded-full bg-amber-500" />
        Session expirée
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-red-700 dark:text-red-300">
        <span className="h-2 w-2 rounded-full bg-red-500" />
        Erreur
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-slate-600 dark:text-zinc-300">
      <span className="h-2 w-2 rounded-full bg-slate-400" />
      Inconnu
    </span>
  );
};

const InfoBanner: React.FC<{
  tone: "warning" | "danger";
  children: React.ReactNode;
}> = ({ tone, children }) => {
  const cfg =
    tone === "warning"
      ? {
          bg: "bg-amber-50/70 dark:bg-amber-500/10",
          border: "border-amber-200/60 dark:border-amber-500/20",
          text: "text-amber-800 dark:text-amber-200",
        }
      : {
          bg: "bg-red-50/70 dark:bg-red-500/10",
          border: "border-red-200/60 dark:border-red-500/20",
          text: "text-red-800 dark:text-red-200",
        };

  return (
    <div className={`mt-3 rounded-2xl border ${cfg.border} ${cfg.bg} px-3 py-2 text-[12.5px] ${cfg.text}`}>
      {children}
    </div>
  );
};

type ButtonVariant = "primary" | "secondary" | "danger";

const Button: React.FC<{
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: ButtonVariant;
  icon?: React.ReactNode;
}> = ({ children, onClick, disabled, variant = "secondary", icon }) => {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-2xl px-3.5 py-2 text-[13px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500/25 disabled:opacity-50 disabled:cursor-not-allowed";
  const styles =
    variant === "primary"
      ? "bg-violet-600 text-white hover:bg-violet-700 shadow-sm"
      : variant === "danger"
      ? "bg-red-600 text-white hover:bg-red-700 shadow-sm"
      : "border border-slate-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/30 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-900/50";

  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${styles}`}>
      {icon}
      {children}
    </button>
  );
};

const IconButton: React.FC<{
  children: React.ReactNode;
  onClick: () => void;
  ariaLabel: string;
}> = ({ children, onClick, ariaLabel }) => (
  <button
    aria-label={ariaLabel}
    onClick={onClick}
    className="inline-flex items-center justify-center h-10 w-10 rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/30 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-900/50 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500/25"
  >
    {children}
  </button>
);

const Spinner = () => (
  <motion.div
    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
    animate={{ rotate: 360 }}
    transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
  />
);

/* =========================
   Confirm modal (premium UX)
========================= */

const ConfirmModal: React.FC<{
  open: boolean;
  title: string;
  description: string;
  confirmText: string;
  cancelText: string;
  tone?: "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ open, title, description, confirmText, cancelText, tone = "default", onConfirm, onCancel }) => {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-[2px]"
            onClick={onCancel}
          />
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="fixed z-[61] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] max-w-[92vw]"
            role="dialog"
            aria-modal="true"
          >
            <div className="rounded-3xl border border-slate-200/70 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/90 shadow-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-zinc-900 flex items-start justify-between gap-3">
                <div>
                  <div className="text-[14px] font-semibold text-slate-900 dark:text-zinc-50">
                    {title}
                  </div>
                  <div className="mt-1 text-[12.5px] text-slate-500 dark:text-zinc-500">
                    {description}
                  </div>
                </div>
                <button
                  onClick={onCancel}
                  className="h-10 w-10 rounded-2xl hover:bg-slate-50 dark:hover:bg-zinc-900/60 transition-colors flex items-center justify-center text-slate-500"
                  aria-label="Fermer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="px-5 py-4 flex items-center justify-end gap-2">
                <Button variant="secondary" onClick={onCancel}>
                  {cancelText}
                </Button>
                <Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm}>
                  {confirmText}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
