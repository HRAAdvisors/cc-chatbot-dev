"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/chat/LanguageProvider";
import { mapFeatures, type MapEntry } from "@/lib/resource-map";

export default function ResourceMapCanvas({ entries, selected, activeId, onActive, fitVersion }: {
  entries: MapEntry[]; selected: Set<string>; activeId: string | null; onActive: (id: string) => void; fitVersion: number;
}) {
  const { t, locale } = useLanguage();
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const latest = useRef({ entries, selected, onActive });
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [retry, setRetry] = useState(0);
  const [readyVersion, setReadyVersion] = useState(0);
  useEffect(() => { latest.current = { entries, selected, onActive }; }, [entries, selected, onActive]);

  useEffect(() => {
    if (!container.current) return;
    const token = process.env.NEXT_PUBLIC_MAPBOX_API_KEY;
    let map: mapboxgl.Map;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const colors = getComputedStyle(container.current);
      // Mapbox paint properties only accept hex/rgb, so fall back when a token resolves to oklch or is missing.
      const hex = (name: string, fallback: string) => { const value = colors.getPropertyValue(name).trim(); return /^#[0-9a-f]{3,8}$/i.test(value) ? value : fallback; };
      const primary = hex("--primary", "#1f4e9c");
      const white = hex("--card", "#ffffff");
      const device = hex("--devices", "#1f4e9c");
      const skills = hex("--skills", "#8a4a16");
      map = new mapboxgl.Map({ container: container.current, accessToken: token, style: "mapbox://styles/mapbox/light-v11", center: [-115.14, 36.17], zoom: 8.3, attributionControl: false, locale: { "NavigationControl.ZoomIn": t("Zoom in"), "NavigationControl.ZoomOut": t("Zoom out"), "NavigationControl.ResetBearing": t("Reset bearing") } });
      mapRef.current = map;
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
      map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");
      map.getCanvas().setAttribute("aria-label", t("Interactive resource map. Use the resource list for accessible location details."));
      timer = setTimeout(() => setStatus((current) => current === "loading" ? "error" : current), 20000);
      map.on("error", () => setStatus("error"));
      map.on("load", () => {
        if (timer) clearTimeout(timer);
        map.addSource("resources", { type: "geojson", data: mapFeatures(latest.current.entries, latest.current.selected), cluster: true, clusterMaxZoom: 14, clusterRadius: 42 });
        map.addLayer({ id: "resource-clusters", type: "circle", source: "resources", filter: ["has", "point_count"], paint: { "circle-color": primary, "circle-radius": ["step", ["get", "point_count"], 20, 10, 25, 30, 30], "circle-stroke-width": 2, "circle-stroke-color": white } });
        map.addLayer({ id: "resource-counts", type: "symbol", source: "resources", filter: ["has", "point_count"], layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": 14 }, paint: { "text-color": white } });
        map.addLayer({ id: "resource-selections", type: "circle", source: "resources", filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "selected"], true]], paint: { "circle-radius": 13, "circle-color": white, "circle-stroke-color": primary, "circle-stroke-width": 3 } });
        map.addLayer({ id: "resource-points", type: "circle", source: "resources", filter: ["!", ["has", "point_count"]], paint: { "circle-radius": 8, "circle-color": ["match", ["get", "category"], "devices", device, "skills", skills, primary], "circle-stroke-width": 2, "circle-stroke-color": white } });
        map.addLayer({ id: "resource-active", type: "circle", source: "resources", filter: ["==", ["get", "entryId"], ""], paint: { "circle-radius": 17, "circle-color": "transparent", "circle-stroke-color": primary, "circle-stroke-width": 3 } });
        map.on("click", "resource-clusters", (event) => {
          const feature = event.features?.[0];
          if (!feature || feature.geometry.type !== "Point") return;
          const coordinates = feature.geometry.coordinates as [number, number];
          (map.getSource("resources") as mapboxgl.GeoJSONSource).getClusterExpansionZoom(Number(feature.properties?.cluster_id), (error, zoom) => { if (!error && zoom !== null && zoom !== undefined) map.easeTo({ center: coordinates, zoom, duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 300 }); });
        });
        map.on("click", "resource-points", (event) => { const id = event.features?.[0]?.properties?.entryId; if (typeof id === "string") latest.current.onActive(id); });
        for (const layer of ["resource-clusters", "resource-points"]) {
          map.on("mouseenter", layer, () => { map.getCanvas().style.cursor = "pointer"; });
          map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; });
        }
        setStatus("ready");
        setReadyVersion((value) => value + 1);
      });
    } catch {
      mapRef.current?.remove();
      mapRef.current = null;
      queueMicrotask(() => setStatus("error"));
      return;
    }
    const observer = new ResizeObserver(() => map.resize());
    observer.observe(container.current);
    return () => { if (timer) clearTimeout(timer); observer.disconnect(); map.remove(); mapRef.current = null; };
  }, [retry, locale, t]);

  useEffect(() => {
    const map = mapRef.current;
    const source = map?.getSource("resources") as mapboxgl.GeoJSONSource | undefined;
    if (!map || !source || !readyVersion) return;
    const data = mapFeatures(entries, selected);
    source.setData(data);
    if (data.features.length) {
      const bounds = new mapboxgl.LngLatBounds();
      data.features.forEach((feature) => bounds.extend(feature.geometry.coordinates as [number, number]));
      map.fitBounds(bounds, { padding: 56, maxZoom: 13, duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 350 });
    }
  }, [entries, selected, readyVersion, fitVersion]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getLayer("resource-active")) return;
    map.setFilter("resource-active", ["==", ["get", "entryId"], activeId ?? ""]);
    const entry = entries.find((item) => item.id === activeId && item.hasLocation);
    if (!entry) return;
    map.flyTo({ center: [entry.long!, entry.lat!], zoom: Math.max(map.getZoom(), 14), duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 350 });
    const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false }).setLngLat([entry.long!, entry.lat!]).setText(entry.name).addTo(map);
    return () => { popup.remove(); };
  }, [activeId, entries, readyVersion]);

  return <div className="bace-resource-map" data-map-state={status} data-point-count={entries.filter((entry) => entry.hasLocation).length}>
    <div ref={container} className="bace-map-canvas" />
    {status === "loading" && <div role="status" className="bace-map-status">{t("Loading resource map…")}</div>}
    {status === "error" && <div role="alert" className="bace-map-status"><p>{t("The map is unavailable. The resource list still works.")}</p><Button variant="outline" onClick={() => { setStatus("loading"); setRetry((value) => value + 1); }}>{t("Retry map")}</Button></div>}
    {status === "ready" && !entries.some((entry) => entry.hasLocation) && <div className="bace-map-status"><p>{t("No mapped locations in this view. Online resources and entries without coordinates are listed separately.")}</p></div>}
  </div>;
}
