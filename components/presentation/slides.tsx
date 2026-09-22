import Image from "next/image";
import { ArrowRight, ArrowUpRight, Check } from "lucide-react";
import { caseRationales, expertiseMetrics, sources, type DeckVersion, type SlideContent } from "./content";

function Photo({ name = "people-working", className = "" }: { name?: string; className?: string }) {
  return <Image className={`human-photo ${className}`} src={`/presentation/${name}.jpg`} width={1800} height={1200} loading="eager" alt={name === "people-assistance" ? "Colleagues helping one another at computers, illustrative stock photography" : "People collaborating around laptops, illustrative stock photography"} unoptimized />;
}

export function Device({ type = "desktop", image }: { type?: "desktop" | "tablet" | "phone"; image?: string }) {
  const label = type === "desktop" ? "Desktop monitor" : type === "tablet" ? "Tablet" : "Phone";
  return <div className={`device device-${type}`}><div className="device-hardware"><div className="device-screen"><Image src={image || `/presentation/clark-${type}.png`} alt={image?.includes("mhm-") ? `Actual MHM ecosystem interface in an illustrative ${label.toLowerCase()}` : `Actual Clark County assistant in an illustrative ${label.toLowerCase()}`} width={type === "desktop" ? 1440 : type === "tablet" ? 820 : 390} height={type === "desktop" ? 1000 : type === "tablet" ? 1100 : 844} loading="eager" unoptimized /></div>{type === "desktop" && <div className="monitor-stand" aria-hidden="true"><div /><span /></div>}</div><p className="device-label">{label}</p></div>;
}

function BrowserCapture({ image, label }: { image: string; label: string }) {
  return <figure className="browser-capture"><figcaption><span>{label}</span><span>Web application</span></figcaption><Image src={image} width={1440} height={1000} alt={`${label}, actual application screenshot`} loading="eager" unoptimized /></figure>;
}

function Title({ label, children, description }: { label: string; children: React.ReactNode; description?: string }) {
  return <div className="editorial-heading"><p className="eyebrow">{label}</p><h2>{children}</h2>{description && <p className="editorial-description">{description}</p>}</div>;
}

function TrackRecord({ compact = false }: { compact?: boolean }) {
  return <div className={compact ? "track-record compact" : "track-record"}><p className="track-record-label">HR&A advisory + data experience</p><div className="metric-grid">{expertiseMetrics.slice(0, compact ? 2 : 3).map(metric => <div key={metric.value}><strong>{metric.value}</strong><h3>{metric.label}</h3><p>{metric.detail}</p></div>)}</div><p className="metric-source">Program scale, not product impact. Sources: <a href={sources.studio.url} target="_blank" rel="noreferrer">HR&A Tech & Society</a> · <a href={sources.labs.url} target="_blank" rel="noreferrer">Labs</a> · Sep 2026</p></div>;
}

function Tags({ items }: { items: string[] }) {
  return <div className="editorial-tags">{items.map(item => <span key={item}>{item}</span>)}</div>;
}

function HumanProduct({ mhm = false }: { mhm?: boolean }) {
  return <div className={`human-product ${mhm ? "human-product-monitor" : "human-product-phone"}`}><Photo name={mhm ? "people-working" : "people-assistance"} /><div className="human-product-device"><Device type={mhm ? "desktop" : "phone"} image={mhm ? "/presentation/mhm-network.png" : undefined} /></div><span className="photo-disclosure">Stock-photo mockup · actual interface</span></div>;
}

function CaseRationale({ kind }: { kind: keyof typeof caseRationales }) {
  const content = caseRationales[kind];
  return <><Title label={content.label}>{content.title}<br /><span>{content.emphasis}</span></Title><div className="case-rationale-layout"><div className="case-rationale-copy"><section><h3>The problem</h3><p>{content.problem}</p></section><section><h3>Why this solution</h3><p>{content.solution}</p></section></div><Device image={kind === "mhm-rationale" ? "/presentation/mhm-network.png" : undefined} /></div><p className="case-rationale-boundary">{content.boundary}</p></>;
}

export function Slide({ slide, index, version }: { slide: SlideContent; index: number; version: DeckVersion }) {
  const dual = version === "studio";
  return <article className={`deck-slide editorial editorial-${slide.kind}`} aria-label={`Slide ${index + 1}: ${slide.title}`}>
    <div className="slide-top"><span>HR&A <span className="brand-divider">/</span> Tech & Society Studio</span><span>{slide.chapter}</span></div>

    {slide.kind === "cover" && <div className="studio-cover"><div className="studio-cover-copy"><p className="eyebrow">Custom digital products</p><h1>Tech &<br />Society<br /><span>Studio.</span></h1><p>We turn public-interest expertise into custom digital tools for the people who put it to work.</p></div><div className="studio-cover-photo"><Photo /><div className="cover-label">Built around people.<ArrowUpRight aria-hidden="true" /></div></div></div>}

    {slide.kind === "mission" && <div className="mission-composition"><div><Title label="Our mission">Make expertise<br /><span>useful.</span></Title><p className="mission-line">We pair policy and program expertise with data and design to build tools around your decisions, users, and operating realities.</p><div className="mission-promises"><span>Custom fit. Not off the shelf.</span><span>Expert-led. From discovery onward.</span><span>Quality. Tested against agreed criteria.</span></div></div><div className="mission-evidence"><Photo name="people-assistance" /><TrackRecord compact /></div></div>}

    {slide.kind === "expertise" && <><Title label="The HR&A advantage" description="Our product approach draws on HR&A’s work in broadband delivery, public policy, and shared data systems.">Expertise <span>before code.</span></Title><TrackRecord /></>}

    {slide.kind === "method" && <><Title label="An expert-led delivery approach" description="A proposed engagement model: agree the problem, build with domain experts, and validate before handoff.">Understand. Build. <span>Prove.</span></Title><div className="method-sequence">{[{ title: "Understand", text: "People + purpose", sub: "Map user tasks, source data, and constraints." }, { title: "Build", text: "Data + design", sub: "Prototype a workflow around your program." }, { title: "Prove", text: "Experts + users", sub: "Test priority tasks; assign update ownership." }].map((step, i) => <div key={step.title}><span className="method-number">0{i + 1}</span><h3>{step.title}</h3><p>{step.text}</p><span>{step.sub}</span></div>)}</div><div className="qa-ribbon"><strong>QA throughout</strong><span>Accuracy</span><span>Accessibility</span><span>Privacy</span><span>Usability</span></div></>}

    {slide.kind === "quality" && <div className="quality-composition"><Title label="Quality assurance">Quality is a<br /><span>design decision.</span></Title><div className="quality-checks">{[{ title: "Accurate", text: "Source checks. Expert review." }, { title: "Accessible", text: "Keyboard. Screen reader. Contrast." }, { title: "Responsible", text: "Privacy. Security. Clear limits." }, { title: "Useful", text: "Real tasks. User testing." }].map(item => <div key={item.title}><Check aria-hidden="true" /><div><h3>{item.title}</h3><p>{item.text}</p></div></div>)}</div><p className="quality-caption">Our proposed QA scope: agree acceptance criteria, document gaps, and retest fixes. Accessibility is tested, not assumed; no certification is claimed.</p></div>}

    {slide.kind === "evidence" && <><Title label="Expert-led data design" description="Before designing the interface, establish what the data means, who validates it, and how it stays current.">Useful answers<br /><span>start here.</span></Title><div className="evidence-pipeline">{[{ title: "Source", text: "The right evidence" }, { title: "Structure", text: "A usable model" }, { title: "Validate", text: "Expert judgment" }, { title: "Steward", text: "Named ownership" }].map((item, i) => <div key={item.title}><div className="evidence-sheets" aria-hidden="true">{i === 0 ? "Records" : i === 1 ? "Definitions" : i === 2 ? "Checks" : "Updates"}</div><h3>{item.title}</h3><p>{item.text}</p></div>)}</div></>}

    {slide.kind === "clark-intro" && <div className="case-intro"><div className="case-intro-copy"><p className="eyebrow">Clark County, Nevada</p><h2>A clearer<br />way to<br /><span>connect.</span></h2><p>The Digital Equity Assistant helps county staff and partners find internet, training, and device resources for residents.</p><Tags items={["Internet", "Skills", "Devices"]} /></div><div className="case-intro-visual"><Photo name="people-assistance" /><div className="case-intro-screen"><Device type="tablet" /></div></div></div>}

    {(slide.kind === "clark-rationale" || slide.kind === "mhm-rationale") && <CaseRationale kind={slide.kind} />}

    {slide.kind === "clark-features" && <><Title label="Clark County / The experience" description="Choose a need, confirm a location, and review resources. Providers confirm availability and eligibility.">A task. A place. <span>A next step.</span></Title><div className="product-feature-stage"><div className="paired-devices"><BrowserCapture image="/presentation/clark-desktop.png" label="Clark County / Assistant" /><div className="paired-phone"><Device type="phone" /></div></div><div className="feature-rail"><div><h3>Start simply.</h3><p>Choose internet, skills, or devices.</p></div><div><h3>Make it local.</h3><p>Use an address to guide the search.</p></div><div><h3>Move forward.</h3><p>Review options and provider contacts.</p></div><span className="language-label">English / Español interface</span></div></div></>}

    {slide.kind === "clark-people" && <><div className="context-heading"><Title label="Clark County / The human context" description="Staff can guide a resident through questions and discuss relevant options. The tool supports human judgment, not an eligibility decision.">Support the <span>conversation.</span></Title></div><HumanProduct /><Tags items={["Local programs", "Guided questions", "Human judgment"]} /></>}

    {slide.kind === "devices" && <><Title label="One responsive web product" description="Actual desktop, tablet, and phone browser captures in generic device frames. Not native apps or physical-device certification.">Where the <span>work happens.</span></Title><div className="device-lineup"><figure><Device /><figcaption>At the desk</figcaption></figure><figure><Device type="tablet" /><figcaption>Side by side</figcaption></figure><figure><Device type="phone" /><figcaption>In the community</figcaption></figure></div></>}

    {slide.kind === "custom" && <><Title label="Customization is the offering" description="We scope the data model, interface, and operating workflow around your organization, rather than asking your team to adapt to a generic product.">Your context.<br /><span>Not a template.</span></Title><div className="custom-grid">{[{ title: "Your people", text: "Tasks · language · access" }, { title: "Your evidence", text: "Data · geography · rules" }, { title: "Your operation", text: "Workflow · ownership · updates" }].map(item => <div key={item.title}><h3>{item.title}</h3><p>{item.text}</p></div>)}</div></>}

    {slide.kind === "mhm-intro" && <div className="mhm-intro-layout"><div><p className="eyebrow">MHM / Regional ecosystem mapping</p><h2>See the network.<br /><span>See the<br />opportunity.</span></h2><p>MHM’s ecosystem tool helps program teams explore digital-equity organizations and relationships across its Texas service regions.</p></div><div className="network-hero"><Device image="/presentation/mhm-network.png" /><p className="capture-context">Bexar County / San Antonio<br />Actual network view · Sep 2026</p></div></div>}

    {slide.kind === "mhm-detail" && <><Title label="MHM / The experience" description="Filter the network, then open an organization to review funding, reporting periods, and connections. Figures reflect available reporting, not audited impact.">From the ecosystem<br /><span>to the organization.</span></Title><div className="mhm-detail-layout"><BrowserCapture image="/presentation/mhm-detail.png" label="MHM / Organization detail" /><div className="feature-rail"><div><h3>Explore.</h3><p>Compare regional relationships.</p></div><div><h3>Focus.</h3><p>Filter by service and grantee status.</p></div><div><h3>Understand.</h3><p>Review funding and reported reach.</p></div></div></div></>}

    {slide.kind === "mhm-people" && <><div className="context-heading"><Title label="MHM / The human context" description="Program teams and partners can use a shared view of organizations, funding, and connections to inform discussion, not automate funding decisions.">A shared picture. <span>A better discussion.</span></Title></div><HumanProduct mhm /><Tags items={["Regional context", "Connected organizations", "Reported evidence"]} /></>}

    {slide.kind === "closing" && <div className="editorial-closing"><p className="eyebrow">Custom products. Expertly built.</p><h2>What should<br />your expertise<br /><span>make possible?</span></h2><div className="closing-links"><a href="/" target="_blank" rel="noreferrer">Explore the chatbot <ArrowUpRight size={20} /></a>{dual && <a href="https://mhm-ecosystem-mapping.vercel.app" target="_blank" rel="noreferrer">Explore MHM <ArrowUpRight size={20} /></a>}</div><p>Bring a user need and a decision. Together, we scope the data, product, and quality criteria.<ArrowRight aria-hidden="true" /></p></div>}

    <div className="slide-bottom"><span>{slide.kind === "cover" ? dual ? "Studio + two product stories" : "Studio + Clark County" : "Expertise × Customization × Quality"}</span><span>{String(index + 1).padStart(2, "0")}</span></div>
  </article>;
}
