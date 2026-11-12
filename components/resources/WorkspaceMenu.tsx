"use client";

import { useRef } from "react";
import { Map as MapIcon, Menu, SlidersHorizontal, UsersRound, Share2, CircleHelp, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/components/chat/LanguageProvider";
import { useOpenResourceMap } from "./ResourceMapLink";
import type { ResourceMapSession } from "./useResourceMapSession";
import type { PanelView } from "./WorkspacePanel";

export default function WorkspaceMenu({ hasResults, shareCount, snapshot, mapDisabled, onOpen, onReset }: {
  hasResults: boolean; shareCount: number; snapshot: ResourceMapSession; mapDisabled: boolean;
  onOpen: (view: PanelView, opener: HTMLElement | null) => void; onReset?: () => void;
}) {
  const { t } = useLanguage();
  const trigger = useRef<HTMLButtonElement>(null);
  const map = useOpenResourceMap(snapshot, mapDisabled);
  const open = (view: PanelView) => onOpen(view, trigger.current);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger ref={trigger} render={<Button variant="ghost" size="icon" className="lg:hidden" aria-label={t("Workspace tools")} title={t("Workspace tools")} />}>
        <Menu aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="resource-finder min-w-52 font-sans">
        {hasResults && <DropdownMenuItem onClick={() => open("browse")}><SlidersHorizontal aria-hidden="true" />{t("Browse")}</DropdownMenuItem>}
        <DropdownMenuItem onClick={() => open("needs")}><UsersRound aria-hidden="true" />{t("Resident needs")}</DropdownMenuItem>
        <DropdownMenuItem disabled={mapDisabled} onClick={map.open}><MapIcon aria-hidden="true" />{t("Map")}{map.count > 0 && <span className="bace-menu-count">{map.count}<span className="sr-only"> {t("mapped resources")}</span></span>}</DropdownMenuItem>
        {hasResults && <DropdownMenuItem onClick={() => open("share")}><Share2 aria-hidden="true" />{t("Share")}{shareCount > 0 && <span className="bace-menu-count">{shareCount}<span className="sr-only"> {t("selected")}</span></span>}</DropdownMenuItem>}
        <DropdownMenuItem onClick={() => open("help")}><CircleHelp aria-hidden="true" />{t("Guide")}</DropdownMenuItem>
        {onReset && <DropdownMenuItem onClick={onReset}><RotateCcw aria-hidden="true" />{t("New resident")}</DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
