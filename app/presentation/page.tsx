import type { Metadata } from "next";
import { Albert_Sans } from "next/font/google";
import { Presentation } from "@/components/presentation/presentation";
import "./editorial.css";

const albert = Albert_Sans({ subsets: ["latin"], variable: "--font-presentation", display: "swap" });

export const metadata: Metadata = {
  title: "Custom products. Expertly built. | HR&A Tech & Society Studio",
  description: "Two visual presentations of HR&A's custom digital product offering: the Clark County Digital Equity Assistant and MHM ecosystem mapping. Expertise, customization, and quality, including accessibility.",
  robots: { index: false, follow: false },
};

export default async function PresentationPage({ searchParams }: { searchParams: Promise<{ draft?: string }> }) {
  const { draft } = await searchParams;
  const version = draft === "studio" ? "studio" : "chatbot";
  return <div className={albert.variable}><Presentation key={version} version={version} /></div>;
}
