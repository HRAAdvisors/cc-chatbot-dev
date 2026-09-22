"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Check, Grid2X2, Maximize2, NotebookPen, Printer, X } from "lucide-react";
import { decks, type DeckVersion } from "./content";
import { Slide } from "./slides";

export function Presentation({ version = "chatbot" }: { version?: DeckVersion }) {
  const slides = decks[version];
  const [index, setIndex] = useState(0);
  const [notes, setNotes] = useState(false);
  const [overview, setOverview] = useState(false);
  const [status, setStatus] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const go = useCallback((next: number) => {
    const target = Math.max(0, Math.min(slides.length - 1, next));
    setIndex(target);
    window.history.replaceState(null, "", `#slide-${target + 1}`);
  }, [slides]);

  useEffect(() => {
    const restore = () => {
      const match = window.location.hash.match(/^#slide-(\d+)$/);
      if (match) setIndex(Math.max(0, Math.min(slides.length - 1, Number(match[1]) - 1)));
    };
    restore();
    window.addEventListener("hashchange", restore);
    return () => window.removeEventListener("hashchange", restore);
  }, [slides]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.isComposing || event.keyCode === 229 || event.altKey || event.ctrlKey || event.metaKey) return;
      if ((event.target as HTMLElement).closest("input,textarea,select,[contenteditable=true]")) return;
      if (event.key === "Escape") { setOverview(false); setNotes(false); }
      if (overview) return;
      if (event.key === "ArrowRight" || event.key === "PageDown") { event.preventDefault(); go(index + 1); }
      if (event.key === "ArrowLeft" || event.key === "PageUp") { event.preventDefault(); go(index - 1); }
      if (event.key === "Home") { event.preventDefault(); go(0); }
      if (event.key === "End") { event.preventDefault(); go(slides.length - 1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index, overview, slides.length]);

  useEffect(() => {
    if (overview) return;
    window.scrollTo({ top: 0, behavior: "instant" });
    root.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [index, overview]);

  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (root.current?.requestFullscreen) await root.current.requestFullscreen();
      else setStatus("Fullscreen is unavailable in this browser. Open the presentation in a separate tab.");
    } catch {
      setStatus("Fullscreen is blocked in this preview. Open the presentation in a separate tab to present.");
    }
  }

  return <div className="presentation font-sans" ref={root}>
    <header className="deck-header"><a href="/presentation" className="deck-brand" aria-label="HR&A presentation home"><Image src="/presentation/hra-logo.svg" width={84} height={32} alt="HR&A" unoptimized /><span>Tech & Society<span className="header-subtitle">Digital product practice</span></span></a><div className="deck-tools"><nav className="edition-switch" aria-label="Presentation edition"><a href="/presentation" aria-current={version === "chatbot" ? "page" : undefined}>Chatbot <span>{decks.chatbot.length}</span></a><a href="/presentation?draft=studio" aria-current={version === "studio" ? "page" : undefined}>Studio + tools <span>{decks.studio.length}</span></a></nav><button onClick={() => { setOverview(!overview); setNotes(false); }} aria-label={overview ? "Close slide overview" : "Open slide overview"} aria-pressed={overview} title="Slide overview">{overview ? <X /> : <Grid2X2 />}</button><button onClick={() => { setNotes(!notes); setOverview(false); }} aria-pressed={notes} aria-controls="presenter-notes" title="Presenter notes and sources" aria-label="Presenter notes and sources"><NotebookPen /></button><button onClick={() => window.print()} title="Print or save as PDF" aria-label="Print or save as PDF"><Printer /></button><button onClick={fullscreen} title="Present fullscreen" aria-label="Present fullscreen"><Maximize2 /></button></div></header>
    <main className="deck-workspace">
      {overview ? <section className="slide-overview" aria-label="Slide overview"><div className="overview-heading"><h1>The story, at a glance.</h1><p>Select a slide to present.</p></div><div className="overview-grid">{slides.map((slide,i)=><button className={index === i ? "overview-item is-current" : "overview-item"} key={slide.kind} onClick={() => { go(i); setOverview(false); }}><span className="overview-number">{String(i+1).padStart(2,"0")}{index===i && <Check size={16} />}</span><span className="overview-chapter">{slide.chapter}</span><strong>{slide.title}</strong></button>)}</div></section> : <div className="slide-stage" key={index}><Slide slide={slides[index]} index={index} version={version} /></div>}
      <div className="sr-only" aria-live="polite">Slide {index+1} of {slides.length}: {slides[index].title}</div>
      {notes && <aside id="presenter-notes" className="presenter-notes"><div><h2>Presenter notes</h2><span>Slide {String(index+1).padStart(2,"0")}</span></div><p>{slides[index].notes}</p><div className="source-links">{slides[index].sources.length > 0 ? slides[index].sources.map(source=><a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.label} ↗</a>) : <span>{slides[index].kind === "custom" ? "Proposed applications, not existing deployments. Requires client-specific discovery and validation." : "Evidence: current application code and captured interface. No deployment or outcome claim."}</span>}</div></aside>}
      {status && <p className="deck-status" role="status">{status}<button onClick={()=>setStatus("")} aria-label="Dismiss notice"><X size={16} /></button></p>}
    </main>
    <footer className="deck-controls"><div className="deck-current"><span className="current-number">{String(index+1).padStart(2,"0")}<span> / {slides.length}</span></span><span>{slides[index].chapter}</span></div><nav className="slide-progress" aria-label="Choose slide">{slides.map((slide,i)=><button key={slide.kind} onClick={()=>{go(i);setOverview(false);}} aria-label={`Slide ${i+1}: ${slide.title}`} aria-current={index===i ? "step" : undefined} title={slide.title} />)}</nav><div className="deck-arrows"><span>Use arrow keys</span><button aria-label="Previous slide" onClick={()=>go(index-1)} disabled={index===0}><ArrowLeft /></button><button aria-label="Next slide" onClick={()=>go(index+1)} disabled={index===slides.length-1}><ArrowRight /></button></div></footer>
    <div className="print-deck" aria-hidden="true">{slides.map((slide,i)=><Slide key={slide.kind} slide={slide} index={i} version={version} />)}</div>
  </div>;
}
