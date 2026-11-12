"use client";

import { Fragment, useRef, useSyncExternalStore, type ReactNode } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { SlidersHorizontal, UsersRound, Share2, CircleHelp, X, PanelLeftClose } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useLanguage } from "@/components/chat/LanguageProvider";
import { cn } from "@/lib/utils";

export type PanelView = "browse" | "needs" | "share" | "help";
const views = [
  { id: "browse" as const, label: "Browse", icon: SlidersHorizontal },
  { id: "needs" as const, label: "Resident needs", icon: UsersRound },
  { id: "share" as const, label: "Share", icon: Share2 },
  { id: "help" as const, label: "Guide", icon: CircleHelp },
];
const mediaQuery = "(max-width: 1279px)";
function subscribe(callback: () => void) {
  const media = window.matchMedia(mediaQuery);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

export function ActionRail({ hasResults, count, active, onOpen, mapAction }: { hasResults: boolean; count: number; active: PanelView | null; onOpen: (view: PanelView) => void; mapAction: ReactNode }) {
  const { t } = useLanguage();
  return (
    <nav aria-label={t("Workspace tools")} className="bace-action-rail">
      {views.filter(({ id }) => hasResults || id === "needs" || id === "help").map(({ id, label, icon: Icon }) => (
        <Fragment key={id}>
        <button type="button" className="bace-rail-action" aria-label={t(label)} title={t(label)} aria-haspopup="dialog" aria-expanded={active === id} onClick={() => onOpen(id)}>
          <span className="relative flex size-6 items-center justify-center"><Icon className="size-5" aria-hidden="true" />{id === "share" && count > 0 && <span className="bace-selection-count">{count}</span>}</span>
          <span>{t(id === "needs" ? "Needs" : label)}</span>
        </button>
        {id === "needs" && mapAction}
        </Fragment>
      ))}
    </nav>
  );
}

export default function WorkspacePanel({ view, hasResults, onViewChange, onClose, opener, children }: {
  view: PanelView | null; hasResults: boolean; onViewChange: (view: PanelView) => void; onClose: () => void;
  opener: React.RefObject<HTMLElement | null>; children: ReactNode;
}) {
  const { t } = useLanguage();
  const compact = useSyncExternalStore(subscribe, () => window.matchMedia(mediaQuery).matches, () => true);
  const closeRef = useRef<HTMLButtonElement>(null);
  const isGuide = view === "help";
  const popup = (
    <Dialog.Popup className={cn("resource-finder font-sans", isGuide ? "bace-guide-dialog" : "bace-workspace-panel")} initialFocus={isGuide ? () => document.querySelector<HTMLButtonElement>(".bace-guide-dialog [data-guide-close]") : closeRef} finalFocus={opener}>
      {!isGuide && <div className="bace-panel-heading flex shrink-0 items-center justify-between border-b border-border p-5">
        <Dialog.Title className="text-lg font-semibold tracking-tight">{t(view === "needs" ? "Resident needs" : view === "share" ? "Resident's list" : "Browse resources")}</Dialog.Title>
        <Dialog.Close ref={closeRef} render={<Button size="icon" variant="ghost" />} aria-label={t("Close panel")}>
          <PanelLeftClose aria-hidden="true" className="hidden sm:block" /><X aria-hidden="true" className="sm:hidden" />
        </Dialog.Close>
      </div>}
      <Dialog.Description className="sr-only">{t(isGuide ? "Find local support and learn how to use BACE Hub." : "Browse resources, add resident needs, share selections, or learn how to use this tool.")}</Dialog.Description>
      {!isGuide && <div className="border-b border-border px-5 py-3">
        <ToggleGroup aria-label={t("Workspace tools")} value={view ? [view] : []} onValueChange={(values) => { if (values[0]) onViewChange(values[0] as PanelView); }} className="bace-panel-switcher" size="sm">
          {views.filter(({ id }) => hasResults || id === "needs" || id === "help").map(({ id, label }) => <ToggleGroupItem key={id} value={id}>{t(id === "needs" ? "Needs" : label)}</ToggleGroupItem>)}
        </ToggleGroup>
      </div>}
      <div className={isGuide ? "bace-guide-content" : "bace-panel-content"}>{children}</div>
    </Dialog.Popup>
  );
  return (
    <Dialog.Root open={view !== null} onOpenChange={(open) => { if (!open) onClose(); }} modal={isGuide || compact}>
      <Dialog.Portal>
        {(isGuide || compact) && <Dialog.Backdrop className={isGuide ? "bace-panel-backdrop" : "bace-panel-backdrop bace-workspace-backdrop"} />}
        {isGuide ? <Dialog.Viewport className="bace-guide-viewport">{popup}</Dialog.Viewport> : popup}
      </Dialog.Portal>
    </Dialog.Root>
  );
}
