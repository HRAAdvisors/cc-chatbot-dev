// Decides whether a typed address and a matched address are "the same place"
// for the purposes of skipping the "we matched this to the closest address" note.
// Case, punctuation, street-type abbreviations, and a missing city/state/ZIP don't count as differences.
const WORDS: Record<string, string> = {
  street: "st", avenue: "ave", av: "ave", drive: "dr", road: "rd", lane: "ln", boulevard: "blvd", court: "ct", place: "pl", circle: "cir",
  terrace: "ter", parkway: "pkwy", highway: "hwy", trail: "trl", way: "way", square: "sq", alley: "aly", loop: "loop",
  north: "n", south: "s", east: "e", west: "w", northeast: "ne", northwest: "nw", southeast: "se", southwest: "sw",
  apartment: "apt", suite: "ste", unit: "unit", nevada: "nv", saint: "st",
};
const DROP = new Set(["usa", "us", "united", "states", "america"]);

function tokens(address: string) {
  return address
    .toLowerCase()
    .replace(/(\d)(st|nd|rd|th)\b/g, "$1")
    .replace(/#/g, " unit ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token && !DROP.has(token) && !/^\d{5}$/.test(token))
    .map((token) => WORDS[token] ?? token);
}

export function sameAddress(typed: string, matched: string) {
  const a = tokens(typed);
  const b = new Set(tokens(matched));
  return a.length > 0 && a.every((token) => b.has(token));
}
