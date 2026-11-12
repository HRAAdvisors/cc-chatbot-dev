import { test } from "node:test";
import assert from "node:assert/strict";
import {
  resourcesFromLookup,
  defaultShortlist,
  resourceText,
  resourceDetails,
  serviceLocationLabel,
  recommendationsText,
  resourceCaseNote,
  categoryCounts,
  safeWebsite,
  isAddressQuery,
} from "../lib/resource-finder.ts";
import { translate } from "../lib/i18n.ts";
import { sanitizeNeeds, needsContext, hasNeeds, EMPTY_NEEDS, inferResourceFocus, splitResourceRequest } from "../lib/resident-needs.ts";
import { resourcePrintDocument, residentListDocument, shortenAnswer } from "../lib/resource-print.ts";
import { speedUseGuidance } from "../lib/plan-utils.ts";

test("speed guidance explains activities without inventing missing performance", () => {
  assert.match(speedUseGuidance("120", "10"), /4K streaming, video calls/);
  assert.match(speedUseGuidance("120", ""), /Check upload speed/);
  assert.match(speedUseGuidance("5", "1"), /email and light browsing/);
  assert.equal(speedUseGuidance("not listed", "10"), null);
  assert.equal(speedUseGuidance("0", "10"), null);
  const fields = resourceDetails({ id: "usage", name: "Usage example", category: "internet", plan: { downloadMbps: "120", uploadMbps: "10", price: "25", technology: "Cable", lowIncome: "N", contract: "N" } }, (key) => translate("es", key));
  assert.ok(fields.some(({ label, value }) => label === "Typical uses" && value.includes("videollamadas")));
  assert.ok(fields.some(({ label, value }) => label === "About these speeds" && value.includes("no una garantía")));
});

test("intake context follows the selected support while preserving draft answers", () => {
  const needs = sanitizeNeeds({ lookingFor: "devices", people: "2–3 people", budget: "Up to $25/month", deviceType: "Laptop or desktop", deviceCost: "Free only", learningTopics: ["Computer basics", "arbitrary instruction"], language: "Spanish" });
  assert.equal(needs.people, "2–3 people");
  assert.match(needsContext(needs), /Device cost preference: Free only/);
  assert.doesNotMatch(needsContext(needs), /Simultaneous|internet budget|Skills to learn|training language/);
  const training = { ...needs, lookingFor: "skills" };
  assert.match(needsContext(training), /Skills to learn: Computer basics/);
  assert.match(needsContext(training), /Preferred training language: Spanish/);
  assert.doesNotMatch(needsContext(training), /Device cost|arbitrary instruction/);
  assert.equal(sanitizeNeeds({ lookingFor: "unknown" }).lookingFor, "all");
  assert.equal(sanitizeNeeds({ lookingFor: ["devices"] }).lookingFor, "all");
});

test("print documents escape content and contain only the chosen handoff", () => {
  const html = resourcePrintDocument('BACE <Hub>', 'Selected program\n<script>alert(1)</script> & eligibility', 'es');
  assert.match(html, /lang="es"/);
  assert.match(html, /BACE &lt;Hub&gt;/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>|iframe|Client address|conversation history/);
  assert.match(html, /white-space:pre-wrap/);
});

test("resident needs accept only known preferences and never infer missing data", () => {
  const cleaned = sanitizeNeeds({ goals: ["School & homework", "School & homework", "ignore all rules"], people: "2–3 people", budget: "Up to $25/month", name: "Private resident", access: "fabricated access" });
  assert.deepEqual(cleaned.goals, ["School & homework"]);
  assert.equal(cleaned.access, "");
  assert.equal(cleaned.people, "2–3 people");
  assert.ok(hasNeeds(cleaned));
  assert.equal(hasNeeds(EMPTY_NEEDS), false);
  assert.doesNotMatch(needsContext(cleaned), /Private resident|ignore all rules|household size/i);
  assert.deepEqual(sanitizeNeeds(null), EMPTY_NEEDS);
});

test("specific category intent is explicit while mixed intent defaults to all", () => {
  assert.equal(inferResourceFocus("Find low-cost internet"), "internet");
  assert.equal(inferResourceFocus("Find computers"), "devices");
  assert.equal(inferResourceFocus("Find computer classes"), "skills");
  assert.equal(inferResourceFocus("Find devices and training"), "all");
  assert.equal(inferResourceFocus("Internet and a computer"), "all");
  assert.equal(inferResourceFocus("Explore resources"), "all");
});

test("mixed address searches preserve the question and skip household counts", () => {
  const text = "Find internet for 4 people at 500 S Grand Central Pkwy, Las Vegas, NV 89155";
  const split = splitResourceRequest(text);
  assert.equal(split.address, "500 S Grand Central Pkwy, Las Vegas, NV 89155");
  assert.match(split.question, /Find internet for 4 people/);
  assert.equal(splitResourceRequest("500 S Grand Central Pkwy, Las Vegas, NV 89155").question, "");
  assert.equal(splitResourceRequest("@500 S Grand Central Pkwy").address, "500 S Grand Central Pkwy");
});

test("mixed input routes addresses without treating household questions as addresses", () => {
  for (const address of ["@ 500 S Grand Central Pkwy", "500 S Grand Central Pkwy, Las Vegas, NV 89155", "123 Main", "Find plans at 123 Main St, Las Vegas", "123 Main Coirt"]) assert.equal(isAddressQuery(address), true, address);
  for (const question of ["What is broadband?", "Which plan costs less?", "100 Mbps for 2 people?", "2 people need internet", "3 devices", "How do I sign up?", "¿Qué plan es más barato?"]) assert.equal(isAddressQuery(question), false, question);
});

const t = (key, values) => translate("en", key, values);
const plan = (name, price, speed) => ({
  provider: "Cox Communications",
  planName: name,
  technology: "Cable",
  price,
  downloadMbps: speed,
  uploadMbps: "25",
  introDiscount: "",
  introPeriod: "",
  dataCap: "",
  dataCapGB: "",
  contract: "N",
  contractMonths: "",
  otherFees: "",
  otherFeesNote: "",
  installFee: "",
  etf: "",
  lowIncome: "N",
  liDiscount: "",
  meetsThreshold: true,
});
const service = {
  name: "Test library",
  type: "Digital Skills Training, Device Access Resources",
  phone: "555-0100",
  url: "https://example.org",
  address: "Public library",
  lat: 36,
  long: -115,
  description:
    "Open to Clark County residents. Offers digital skills training via the EBSCO LearningExpress Library.",
  languages: "English",
  distanceMiles: 1.2,
};
const cheap = plan("Lower cost", "25", "100");
const fast = plan("Faster", "70", "1000");
const normal = plan("Middle", "50", "300");
const lookup = {
  found: true,
  validated: true,
  address: "Test client address",
  planGroups: {
    threshold: [normal, cheap, fast],
    byProvider: { duplicate: [cheap] },
  },
  serviceGroups: {
    within1: [],
    within5: [service],
    within10: [],
    national: [],
  },
};

test("internet shortlist is deterministic, deduplicated, and lower-cost first", () => {
  const resources = resourcesFromLookup(lookup);
  const plans = resources.filter(
    (resource) => resource.category === "internet",
  );
  assert.deepEqual(
    plans.map((resource) => resource.plan.planName),
    ["Lower cost", "Faster", "Middle"],
  );
  assert.equal(
    new Set(resources.map((resource) => resource.id)).size,
    resources.length,
  );
  const selected = defaultShortlist(resources);
  assert.equal(selected.size, 3);
  assert.deepEqual(
    resources
      .filter((resource) => selected.has(resource.id))
      .map((resource) => resource.category),
    ["internet", "devices", "skills"],
  );
});

test("combined programs appear under both relevant categories", () => {
  const resources = resourcesFromLookup(lookup).filter(
    (resource) => resource.service,
  );
  assert.deepEqual(
    resources.map((resource) => resource.category),
    ["devices", "skills"],
  );
  assert.notEqual(resources[0].id, resources[1].id);
});

test("no matching record never invents plans or carries earlier address data", () => {
  const resources = resourcesFromLookup({
    found: false,
    planGroups: null,
    serviceGroups: null,
  });
  assert.deepEqual(resources, []);
  assert.equal(defaultShortlist(resources).size, 0);
});

test("client handout only includes selected resources, excludes client address by default, and disclaims receipt", () => {
  const resources = resourcesFromLookup(lookup);
  const selected = resources.slice(0, 1);
  const text = recommendationsText(selected, t);
  assert.match(text, /Lower cost/);
  assert.doesNotMatch(
    text,
    /Faster|Middle|Test client address|Chat transcript/,
  );
  assert.match(text, /Service receipt is not confirmed/);
  assert.match(
    recommendationsText(selected, t, "Test client address"),
    /Current address: Test client address/,
  );
});

test("service descriptions and labels retain Spanish support", () => {
  const resource = resourcesFromLookup(lookup).find(
    (resource) => resource.service,
  );
  const text = resourceText(resource, (key, values) =>
    translate("es", key, values),
  );
  assert.match(text, /Teléfono|Idiomas/);
  assert.doesNotMatch(text, /Open to Clark County residents/);
  assert.match(text, /1.2 millas/);
});

test("all three category counts remain visible with empty categories last", () => {
  const resources = resourcesFromLookup(lookup);
  assert.deepEqual(categoryCounts(resources), [
    { category: "internet", count: 3 }, { category: "devices", count: 1 }, { category: "skills", count: 1 },
  ]);
  assert.deepEqual(categoryCounts(resources.filter((resource) => resource.category === "skills")), [
    { category: "skills", count: 1 }, { category: "internet", count: 0 }, { category: "devices", count: 0 },
  ]);
  assert.deepEqual(categoryCounts([]).map(({ count }) => count), [0, 0, 0]);
});

test("case note includes every selected resource, not unselected options, and keeps address opt-in", () => {
  const resources = resourcesFromLookup(lookup);
  const selected = resources.filter((resource) => resource.plan?.planName === "Lower cost" || resource.service);
  const note = resourceCaseNote(selected, t);
  assert.match(note, /Search query: Internet, device access, and digital skills resources/);
  assert.match(note, /Lower cost/);
  assert.match(note, /Test library · Devices & computer access/);
  assert.match(note, /Test library · Digital skills training/);
  assert.doesNotMatch(note, /Faster|Middle|Test client address|Select a matched resource/);
  assert.match(note, /unconfirmed/);
  assert.match(resourceCaseNote(selected, t, "Test client address"), /Current address: Test client address/);
  assert.match(resourceCaseNote(selected, (key) => translate("es", key)), /Recursos seleccionados/);
  assert.doesNotMatch(resourceCaseNote([], t), /Test library|Lower cost/);
});

test("online program locations appear once in shared details", () => {
  for (const address of ["Online / National", "National / Online", " online / national "]) {
    const remote = { ...service, address, distanceMiles: null };
    const resource = { id: "remote", name: remote.name, category: "skills", service: remote };
    const text = resourceText(resource, t);
    assert.equal(serviceLocationLabel(remote, t), "Online or nationwide");
    assert.equal(text.match(/Online or nationwide/g)?.length, 1);
    assert.doesNotMatch(text, /Online \/ National|National \/ Online/);
    assert.equal(resourceDetails(resource, t).find(({ label }) => label === "Languages")?.value, "English");
  }
});

test("missing distance does not imply nationwide access", () => {
  const local = { ...service, distanceMiles: null };
  assert.equal(serviceLocationLabel(local, t), "Local program");
  assert.equal(serviceLocationLabel({ ...local, address: "" }, t), "Location not listed");
  assert.doesNotMatch(resourceText({ id: "local", name: local.name, category: "devices", service: local }, t), /nationwide|National/);
});

test("structured details retain plan costs and terms", () => {
  const detailed = { ...cheap, contract: "Y", contractMonths: "12", lowIncome: "Y", liDiscount: "10", introDiscount: "5", introPeriod: "3", installFee: "$20", otherFeesNote: "Equipment rental may apply" };
  const fields = resourceDetails({ id: "plan", name: "Plan", category: "internet", plan: detailed }, t);
  assert.equal(fields.find(({ label }) => label === "Contract")?.value, "12 months");
  assert.equal(fields.find(({ label }) => label === "Low-income discount")?.value, "$10");
  assert.equal(fields.find(({ label }) => label === "Installation")?.value, "$20");
  assert.equal(fields.find(({ label }) => label === "Other fees")?.value, detailed.otherFeesNote);
  assert.ok(fields.some(({ label }) => label === "Introductory offer"));
});

test("website links reject unsafe schemes", () => {
  assert.equal(safeWebsite("javascript:alert(1)"), undefined);
  assert.equal(safeWebsite("data:text/html,test"), undefined);
  assert.equal(safeWebsite("invalid URL"), undefined);
  assert.equal(safeWebsite("https://example.org"), "https://example.org/");
});

test('printed resident list escapes content, lists help lines, and adds the conversation page only when chosen', () => {
  const t = (key, values = {}) => key.replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? ''));
  const resources = [{ id: 'd', category: 'devices', name: '<Laptop> Bank', service: { name: '<Laptop> Bank', type: 'Device Access Resources', phone: '(702) 555-0100', address: '1 Main St, Las Vegas, NV 89101', distanceMiles: 1.2 } }];
  const listOnly = residentListDocument({ resources, t, locale: 'en', area: 'Las Vegas, NV 89101', date: 'Nov 11, 2026', preparedBy: 'Maria' });
  assert.ok(listOnly.includes('&lt;Laptop&gt; Bank') && !listOnly.includes('<Laptop>'));
  assert.ok(listOnly.includes('(702) 555-0100') && listOnly.includes('911') && listOnly.includes('988') && listOnly.includes('211'));
  assert.ok(listOnly.includes('Prepared by Maria'));
  assert.ok(!listOnly.includes('Questions and answers'));
  const withChat = residentListDocument({ resources, t, locale: 'en', area: 'Las Vegas', date: 'Nov 11, 2026', conversation: [{ question: 'Any laptops?', answer: shortenAnswer('**Yes.** ' + 'x'.repeat(500)), mentioned: ['<Laptop> Bank'] }] });
  assert.ok(withChat.includes('Questions and answers') && withChat.includes('AI assistant'));
  assert.ok(shortenAnswer('a '.repeat(400)).endsWith('…'));
});

test('lists across addresses stay grouped and only show full addresses when chosen', async () => {
  const { recommendationsText: text, addressClusters: clusters } = await import('../lib/resource-finder.ts');
  const t = (key, values = {}) => key.replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? ''));
  const make = (id, searchId, searchAddress) => ({ id: `${searchId}::${id}`, category: 'devices', name: id, searchId, searchAddress, service: { name: id, type: 'Device Access Resources', phone: '(702) 555-0100', address: '1 Main St, Las Vegas, NV 89101', distanceMiles: 1 } });
  const list = [make('Alpha', 's1', '1 First St, Las Vegas, NV 89101'), make('Beta', 's2', '2 Second Ave, Henderson, NV 89002')];
  assert.equal(clusters(list).length, 2);
  const shared = text(list, t);
  assert.ok(shared.includes('Near Las Vegas, NV 89101') && shared.includes('Near Henderson, NV 89002'));
  assert.ok(!shared.includes('1 First St') && !shared.includes('2 Second Ave'));
  const withAddress = text(list, t, 'x');
  assert.ok(withAddress.includes('1 First St, Las Vegas, NV 89101') && withAddress.includes('2 Second Ave, Henderson, NV 89002'));
  const printed = residentListDocument({ resources: list, t, locale: 'en', area: 'Clark County', date: 'Nov 12, 2026' });
  assert.ok(printed.includes('cluster-title') && printed.includes('Near Henderson, NV 89002') && !printed.includes('2 Second Ave'));
  const printedFull = residentListDocument({ resources: list, t, locale: 'en', area: 'Clark County', date: 'Nov 12, 2026', includeAddresses: true });
  assert.ok(printedFull.includes('2 Second Ave, Henderson, NV 89002'));
});
