"use client";

import useSWR from "swr";
import type { LookupResponse } from "@/lib/resource-finder";
import type { ResidentNeeds, ResourceFocus } from "@/lib/resident-needs";
import type { ResourceMessage } from "./useResourceChat";

export interface ResourceSearch {
  id: string;
  address: string;
  result: LookupResponse;
  anchor: string | null;
}

export interface ResourceMapSession {
  searches?: ResourceSearch[];
  allSelected?: string[];
  result: LookupResponse | null;
  address: string;
  focus: ResourceFocus;
  needs: ResidentNeeds;
  needsDraft: ResidentNeeds;
  selected: string[];
  messages: ResourceMessage[];
  showHome: boolean;
  lastQuestion?: string;
  resultAnchor?: string | null;
  optOut?: string[];
  hiddenCategories?: string[];
  dismissed?: string[];
  view?: "chat" | "table";
  tableOrigin?: "chat" | "needs";
}

export function useResourceMapSession() {
  return useSWR<ResourceMapSession | null>("bace-resident-map-session", null, {
    fallbackData: null,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });
}
