import type { Metadata } from "next";
import { cookies } from "next/headers";
import { LanguageProvider } from "@/components/chat/LanguageProvider";
import ResourceMapExplorer from "@/components/resources/ResourceMapExplorer";
import { SERVICES } from "@/lib/services";
import { toMapEntries } from "@/lib/resource-map";

export const metadata: Metadata = {
  title: "Resource map | BACE Hub",
  description: "Explore listed device-access and digital skills training locations in Clark County. Filter the directory, current search, or selected resources without confusing locations with service coverage.",
};

export default async function MapPage() {
  const locale = (await cookies()).get("cc-language")?.value === "es" ? "es" : "en";
  return <LanguageProvider initialLocale={locale} pageTitle="Resource map | BACE Hub"><ResourceMapExplorer entries={toMapEntries(SERVICES)} /></LanguageProvider>;
}
