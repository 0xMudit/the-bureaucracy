import type { OptionalId, OptionalSubject, Paper, PaperId, Topic, TopicId } from "./types";

export const PAPERS: Record<PaperId, Paper> = {
  prelims: {
    id: "prelims",
    label: "Prelims & Exam Alerts",
    short: "Prelims",
    description:
      "Current events, notifications and recruitment news that can appear directly in the objective paper.",
  },
  gs1: {
    id: "gs1",
    label: "GS I · Heritage, Geography & Society",
    short: "GS I",
    description:
      "Indian culture, modern history, world geography, and the social fabric of a changing India.",
  },
  gs2: {
    id: "gs2",
    label: "GS II · Polity, Governance & IR",
    short: "GS II",
    description:
      "Constitution, institutions, welfare delivery, and India's place in the world.",
  },
  gs3: {
    id: "gs3",
    label: "GS III · Economy, Environment & Technology",
    short: "GS III",
    description:
      "Growth, fiscal policy, agriculture, climate, science, security and disaster management.",
  },
  gs4: {
    id: "gs4",
    label: "GS IV · Ethics & Integrity",
    short: "GS IV",
    description:
      "Public-service values, probity in governance, accountability and administrative ethics.",
  },
  essay: {
    id: "essay",
    label: "Essay & Interview",
    short: "Essay",
    description:
      "Big-picture arguments, governance debates and quotes worth carrying into the essay paper.",
  },
};

export const TOPICS: Record<TopicId, Topic> = {
  polity: {
    id: "polity",
    label: "Polity & Constitution",
    paper: "gs2",
    weight: 1.28,
    why: "Institutional behaviour is the spine of GS II. A bill, verdict or commission report here usually becomes a direct prelims question and a mains answer.",
    hooks: [
      "Which constitutional article, schedule or institution is actually in play?",
      "Does this shift power between the legislature, executive and judiciary?",
      "Can you connect it to a landmark judgment or an amendment?",
    ],
    cues: ["constitutional morality", "separation of powers", "judicial review", "federalism"],
    keywords: [
      "parliament", "lok sabha", "rajya sabha", "constitution", "constitutional", "amendment",
      "supreme court", "high court", "judiciary", "judicial", "chief justice", "bill", "act",
      "ordinance", "president", "governor", "cabinet", "ministry", "election commission",
      "cec", "voter", "delimitation", "federalism", "panchayat", "municipality", "rti",
      "cag", "attorney general", "speaker", "legislature", "assembly", "by-election",
      "anti-defection", "money bill", "private member", "parliamentary committee",
    ],
  },
  governance: {
    id: "governance",
    label: "Governance & Welfare",
    paper: "gs2",
    weight: 1.2,
    why: "Schemes and service delivery are where policy meets people. Examiners increasingly ask for outcome-level critique rather than scheme descriptions.",
    hooks: [
      "Who is the intended beneficiary, and what is the exclusion risk?",
      "Is the bottleneck design, funding, capacity or political economy?",
      "What would a measurable success indicator look like?",
    ],
    cues: ["last-mile delivery", "social audit", "capacity building", "cooperative federalism"],
    keywords: [
      "scheme", "yojana", "welfare", "subsidy", "ration", "public distribution", "pds",
      "ayushman", "jal jeevan", "swachh", "pmay", "mgnrega", "pension", "social justice",
      "sc/st", "obc", "transgender", "disability", "civil society", "ngo", "governance",
      "service delivery", "e-governance", "digital india", "aadhaar", "direct benefit",
      "mid-day meal", "poshan", "anganwadi", "health mission", "education policy", "nep",
      "urban mission", "smart city", "aspirational district", "grievance",
    ],
  },
  economy: {
    id: "economy",
    label: "Economy & Finance",
    paper: "gs3",
    weight: 1.22,
    why: "Macro data and policy decisions are high-yield: the same number can feed prelims, a GS III answer and an essay on growth with equity.",
    hooks: [
      "Is this a demand-side, supply-side or institutional problem?",
      "What does it do to inflation, fiscal space and employment?",
      "Which section of the economy gains, and which one pays?",
    ],
    cues: ["fiscal consolidation", "inflation targeting", "financial inclusion", "terms of trade"],
    keywords: [
      "rbi", "reserve bank", "monetary policy", "repo rate", "inflation", "cpi", "wpi", "gdp",
      "growth", "budget", "fiscal deficit", "fiscal", "tax", "gst", "customs", "rupee",
      "banking", "npa", "sebi", "capital market", "sensex", "trade", "export", "import",
      "tariff", "msme", "startup", "employment", "unemployment", "pli", "manufacturing",
      "agriculture", "msp", "food security", "disinvestment", "privatisation", "insurance",
      "credit", "liquidity", "current account", "foreign investment", "fdi", "economy",
    ],
  },
  ir: {
    id: "ir",
    label: "International Relations",
    paper: "gs2",
    weight: 1.16,
    why: "India's external posture is tested through recent developments. Link the event to a doctrine, grouping or bilateral relationship rather than memorising headlines.",
    hooks: [
      "Which bilateral relationship or multilateral grouping is being tested?",
      "What is India's stated interest, and what is the cost of alignment?",
      "Does it connect to sovereignty, trade or security?",
    ],
    cues: ["strategic autonomy", "multi-alignment", "rules-based order", "neighbourhood first"],
    keywords: [
      "external affairs", "mea", "foreign policy", "diplomacy", "diplomatic", "bilateral",
      "summit", "brics", "g20", "g7", "sco", "quad", "asean", "united nations", "unsc",
      "treaty", "agreement", "border", "china", "pakistan", "bangladesh", "sri lanka",
      "nepal", "myanmar", "bhutan", "maldives", "russia", "ukraine", "united states",
      "west asia", "gulf", "indo-pacific", "diaspora", "sanctions", "visa", "consulate",
      "peacekeeping", "wto", "imf", "world bank",
    ],
  },
  environment: {
    id: "environment",
    label: "Environment & Climate",
    paper: "gs3",
    weight: 1.12,
    why: "Climate policy sits at the intersection of ecology, federalism and finance — a reliable source of applied GS III questions.",
    hooks: [
      "What is the ecological mechanism, not just the headline?",
      "Who bears the adaptation cost — Centre, state, or the household?",
      "Can you cite an international commitment or a domestic statute?",
    ],
    cues: ["climate finance", "adaptation gap", "carbon sink", "ecological services"],
    keywords: [
      "climate", "cop30", "cop29", "emissions", "net zero", "carbon", "biodiversity",
      "wildlife", "tiger", "elephant", "wetland", "ramsar", "pollution", "air quality",
      "stubble", "glacier", "himalaya", "monsoon", "cyclone", "flood", "drought",
      "desertification", "renewable", "solar", "wind energy", "green hydrogen",
      "forest", "forestry", "ganga", "river", "groundwater", "heatwave", "e-waste",
      "plastic", "conservation", "tiger reserve", "biosphere", "ghg",
    ],
  },
  science: {
    id: "science",
    label: "Science & Technology",
    paper: "gs3",
    weight: 1.05,
    why: "Technology stories become examinable when you can explain the underlying science and the governance question around it.",
    hooks: [
      "What is the basic science or engineering breakthrough?",
      "What are the dual-use, ethical or regulatory implications?",
      "Which Indian mission, lab or regulator is involved?",
    ],
    cues: ["dual-use technology", "indigenous capability", "technology transfer", "regulation"],
    keywords: [
      "isro", "space", "satellite", "chandrayaan", "gaganyaan", "aditya", "pslv", "gslv",
      "artificial intelligence", " ai ", "semiconductor", "quantum", "biotech", "gene",
      "vaccine", "5g", "6g", "cyber", "data protection", "digital", "drone", "nuclear",
      "reactor", "supercomputer", "research", "innovation", "patent", "deep tech",
      "robotics", "nanotechnology", "genome", "malaria", "tuberculosis", "cancer",
    ],
  },
  security: {
    id: "security",
    label: "Security & Defence",
    paper: "gs3",
    weight: 1.06,
    why: "Internal and external security questions reward an understanding of mandates, doctrine and civil-military balance.",
    hooks: [
      "Is this a law-and-order, defence or intelligence issue?",
      "Which agency has the mandate, and is coordination the weak link?",
      "What does it mean for federalism or civil liberties?",
    ],
    cues: ["internal security", "civil-military relations", "border management", "strategic deterrence"],
    keywords: [
      "defence", "army", "navy", "air force", "drdo", "missile", "terror", "terrorism",
      "naxal", "insurgency", "border security", "bsf", "itbp", "crpf", "nsa", "cyberattack",
      "cyber security", "internal security", "left wing extremism", "militancy", "ceasefire",
      "security forces", "paramilitary", "coast guard", "submarine", "fighter jet",
    ],
  },
  society: {
    id: "society",
    label: "Society & Demography",
    paper: "gs1",
    weight: 1.02,
    why: "Social change questions need data and a perspective. A single report can anchor an entire answer on equity, gender or urbanisation.",
    hooks: [
      "Whose lived experience does this data describe?",
      "Is the issue structural, cultural or service-delivery related?",
      "How does it vary across region, caste, class or gender?",
    ],
    cues: ["social exclusion", "demographic dividend", "intersectionality", "capability approach"],
    keywords: [
      "caste", "census", "gender", "women", "child", "malnutrition", "migration",
      "urbanisation", "slum", "poverty", "inequality", "education", "literacy", "health",
      "mental health", "tribal", "minority", "population", "demographic", "fertility",
      "ageing", "youth", "unpaid work", "domestic violence", "human trafficking",
    ],
  },
  history: {
    id: "history",
    label: "Art, Culture & Heritage",
    paper: "gs1",
    weight: 0.9,
    why: "Heritage stories are easy marks when you can place them in a period, a school of art or a conservation debate.",
    hooks: [
      "Which dynasty, period or art tradition does it belong to?",
      "Is the issue preservation, restitution or community rights?",
      "How does it connect to national identity?",
    ],
    cues: ["cultural nationalism", "restitution", "living heritage", "conservation ethics"],
    keywords: [
      "archaeology", "archaeological", "asi", "heritage", "unesco", "temple", "manuscript",
      "ancient", "medieval", "art", "dance", "music", "festival", "classical", "museum",
      "excavation", "inscription", "sculpture", "painting", "monument", "restoration",
      "repatriation", "antiquity", "tribal art", "folk",
    ],
  },
  ethics: {
    id: "ethics",
    label: "Ethics & Accountability",
    paper: "gs4",
    weight: 0.92,
    why: "Accountability stories supply concrete case studies for GS IV and interview answers on probity and public trust.",
    hooks: [
      "What competing values are in tension?",
      "Where does individual discretion end and institutional accountability begin?",
      "What would a proportionate, transparent response look like?",
    ],
    cues: ["probity in public life", "conflict of interest", "whistleblower protection", "public trust"],
    keywords: [
      "integrity", "transparency", "accountability", "corruption", "cvc", "lokpal",
      "whistleblower", "ethics", "conflict of interest", "probity", "bureaucracy",
      "bureaucrat", "administrative reform", "misconduct", "disciplinary", "vigilance",
      "asset declaration", "lobbying", "public trust",
    ],
  },
  reports: {
    id: "reports",
    label: "Reports, Indices & Data",
    paper: "prelims",
    weight: 1.08,
    why: "Reports and indices are direct prelims material and provide the evidence base for mains arguments.",
    hooks: [
      "Who publishes it, and how often?",
      "What is India's rank or value, and what moved it?",
      "Which indicators does it use, and what are its limitations?",
    ],
    cues: ["data literacy", "methodology", "comparable indicators", "evidence-based policy"],
    keywords: [
      "report", "index", "ranking", "survey", "census", "nso", "mospi", "nfhs",
      "committee", "commission", "task force", "recommendation", "study", "assessment",
      "world bank report", "undp", "niti aayog", "economic survey", "annual report",
      "data", "statistics", "indicator",
    ],
  },
  exam: {
    id: "exam",
    label: "Exam & Recruitment",
    paper: "prelims",
    weight: 0.9,
    why: "Deadlines and pattern changes are time-sensitive. Verify every detail on the official commission website before acting.",
    hooks: [
      "Is the source the commission itself or a coaching aggregator?",
      "What changed versus the previous cycle?",
      "Which stage of the exam does this affect?",
    ],
    cues: ["official notification", "eligibility", "application window", "exam calendar"],
    keywords: [
      "upsc", "state psc", "public service commission", "ssc", "notification", "recruitment",
      "vacancy", "vacancies", "admit card", "answer key", "result", "eligibility",
      "apply online", "last date", "exam date", "prelims", "mains", "interview",
      "cut-off", "cutoff", "merit list", "reservation roster", "exam pattern", "syllabus",
    ],
  },
};

export const TOPIC_ORDER: TopicId[] = [
  "exam",
  "polity",
  "economy",
  "governance",
  "ir",
  "environment",
  "science",
  "security",
  "society",
  "reports",
  "ethics",
  "history",
];

export const TOPIC_LIST: Topic[] = TOPIC_ORDER.map((id) => TOPICS[id]);

export function topicById(id: string | undefined | null): Topic | null {
  if (!id) return null;
  return (TOPICS as Record<string, Topic>)[id] ?? null;
}

export function topicsForPaper(paper: PaperId): Topic[] {
  return TOPIC_LIST.filter((t) => t.paper === paper);
}


/**
 * The six popular UPSC optional subjects. These are a second lens on the same
 * 24-hour wire: a story can be general current affairs and also an optional
 * subject story. Nothing here changes the general ranking; it powers the
 * optional filters, the optional page and the "optional fit" note on a story.
 */
export const OPTIONALS: Record<OptionalId, OptionalSubject> = {
  psir: {
    id: "psir",
    label: "Political Science & International Relations",
    short: "PSIR",
    description:
      "Political theory, comparative politics, Indian government and the whole of international relations.",
    why: "PSIR rewards the ability to move from an event to a concept: sovereignty, federalism, balance of power, strategic autonomy. Use the story as evidence, not as the argument.",
    cues: ["sovereignty", "strategic autonomy", "balance of power", "federalism", "democratic legitimacy"],
    hooks: [
      "Which concept from political theory does this event illustrate?",
      "What does it reveal about the distribution of power between institutions or states?",
      "Can you state India's interest and the cost of the position it has taken?",
    ],
    topicIds: ["polity", "ir", "governance"],
    keywords: [
      "political science", "international relations", "foreign policy", "diplomacy", "diplomatic",
      "geopolitics", "strategic autonomy", "non-alignment", "united nations", "unsc",
      "security council", "general assembly", "brics", "g20", "quad", "asean", "saarc", "sco",
      "nato", "european union", "wto", "imf", "world bank", "treaty", "bilateral",
      "multilateral", "sanctions", "ceasefire", "sovereignty", "nationalism", "federalism",
      "secularism", "constitutionalism", "separation of powers", "judicial review",
      "electoral system", "coalition", "parliamentary", "presidential", "political party",
      "civil society", "globalisation", "hegemony", "balance of power", "liberalism",
      "realism", "constructivism", "marxism", "postcolonial", "public opinion", "election",
      "referendum", "coup", "regime", "democracy", "authoritarianism", "indo-pacific",
      "neighbourhood first", "act east", "look west", "diaspora", "soft power",
      "nuclear doctrine", "no first use", "peacekeeping", "climate diplomacy", "trade war",
      "tariff war", "multipolar", "unipolar", "collective security", "world order",
    ],
  },
  geography: {
    id: "geography",
    label: "Geography",
    short: "Geography",
    description:
      "Physical geography, Indian geography, resources, population and the spatial logic behind the news.",
    why: "Geography turns a disaster or a resource dispute into a process question: which landform, which climate mechanism, which pattern of human use? Name the process before the place.",
    cues: ["process and pattern", "hazard vulnerability", "resource geography", "regional development"],
    hooks: [
      "Which physical or climatic process explains the event?",
      "Why this place and not another? What does the map show?",
      "Who is exposed, and how does land use or planning shape the risk?",
    ],
    topicIds: ["environment", "society", "economy"],
    keywords: [
      "physical geography", "geomorphology", "climatology", "oceanography", "biogeography",
      "population geography", "settlement", "regional planning", "resource", "gis",
      "remote sensing", "latitude", "longitude", "tropic", "monsoon", "jet stream",
      "el nino", "la nina", "indian ocean", "himalaya", "western ghats", "deccan",
      "indo-gangetic", "delta", "estuary", "lagoon", "coral", "mangrove", "glacier",
      "avalanche", "cloudburst", "landslide", "earthquake", "tsunami", "volcano",
      "plate tectonics", "soil erosion", "desertification", "salinisation", "water table",
      "watershed", "river basin", "interlinking", "crop pattern", "cropping", "horticulture",
      "livestock", "fisheries", "mining", "industrial location", "transport", "urban sprawl",
      "smart city", "migration", "demographic", "census", "land use", "landform",
      "peninsula", "plateau", "floodplain", "glacial lake", "cyclone", "heatwave",
      "rainfall", "groundwater", "coastal erosion", "sea level", "biodiversity hotspot",
      "geoheritage", "geospatial", "cartography", "topography", "drainage", "climate change",
    ],
  },
  sociology: {
    id: "sociology",
    label: "Sociology",
    short: "Sociology",
    description:
      "Social structure, caste, family, gender, religion, social change and the sociology of contemporary India.",
    why: "Sociology asks who benefits, who is excluded and how structures reproduce themselves. A policy story is also a story about caste, class, gender or kinship.",
    cues: ["social structure", "stratification", "social change", "agency and structure"],
    hooks: [
      "Which structure ? caste, class, gender, family, religion ? is doing the work here?",
      "Is the change behavioural, institutional or structural?",
      "Whose voice is missing from the official account?",
    ],
    topicIds: ["society", "governance", "history"],
    keywords: [
      "sociology", "sociological", "social structure", "social stratification", "caste", "varna",
      "jati", "untouchability", "dalit", "adivasi", "tribe", "kinship", "family", "marriage",
      "gender", "patriarchy", "feminism", "masculinity", "religion", "secularisation",
      "communalism", "sect", "ritual", "social change", "modernisation", "westernisation",
      "sanskritisation", "globalisation", "urbanisation", "industrialisation", "migration",
      "diaspora", "social movement", "civil society", "ngo", "social capital", "inequality",
      "poverty", "exclusion", "mobility", "education", "health", "welfare", "population",
      "demography", "fertility", "ageing", "youth", "unpaid work", "domestic violence",
      "trafficking", "subaltern", "identity", "ethnicity", "nationalism", "consumerism",
      "risk society", "network society", "postmodern", "urban sociology", "rural sociology",
      "caste census", "socio-economic", "social justice", "social exclusion",
      "inter-caste", "women empowerment", "gender gap", "social audit",
    ],
  },
  pubadmin: {
    id: "pubadmin",
    label: "Public Administration",
    short: "Public Admin",
    description:
      "Administrative theory, Indian administration, governance, public policy and the machinery of the state.",
    why: "Public Administration is examined through the gap between design and delivery. Identify the institution, the incentive and the accountability chain.",
    cues: ["state capacity", "accountability chain", "policy implementation", "new public management"],
    hooks: [
      "Which organisation owns the decision, and who is accountable for the outcome?",
      "Is the failure one of design, capacity, incentive or political will?",
      "What reform would you propose, and what would it cost politically?",
    ],
    topicIds: ["governance", "polity", "ethics"],
    keywords: [
      "public administration", "administration", "bureaucracy", "civil service", "civil servant",
      "administrative reform", "administrative culture", "new public management",
      "public management", "governance", "good governance", "e-governance",
      "digital governance", "accountability", "transparency", "rti", "right to information",
      "citizen charter", "grievance redress", "lokpal", "lokayukta", "cvc", "cag", "audit",
      "budget", "fiscal administration", "personnel administration", "recruitment",
      "training", "mission karmayogi", "capacity building", "decentralisation",
      "decentralization", "panchayati raj", "73rd amendment", "74th amendment", "municipal",
      "urban local body", "district administration", "collector", "chief secretary",
      "secretariat", "public policy", "policy implementation", "service delivery",
      "welfare administration", "privatisation", "public sector", "disinvestment",
      "regulation", "regulatory", "state capacity", "civil service reform",
      "administrative tribunal", "upsc", "state psc", "training academy",
      "lal bahadur shastri", "mussoorie", "governance reform", "red tape", "single window",
    ],
  },
  history: {
    id: "history",
    label: "History",
    short: "History",
    description:
      "Ancient, medieval and modern India, the freedom struggle, art and culture, and the uses of the past.",
    why: "History optional is not a list of dates. Place the story in a period, a debate and a source tradition; then show how the past is being used in the present.",
    cues: ["periodisation", "source criticism", "continuity and change", "uses of the past"],
    hooks: [
      "Which period and polity does this belong to?",
      "What kind of source would a historian use, and what would it miss?",
      "How is this version of the past being mobilised today?",
    ],
    topicIds: ["history", "society", "polity"],
    keywords: [
      "ancient india", "medieval india", "modern india", "colonial",
      "colonialism", "imperialism", "british raj", "east india company", "freedom struggle",
      "national movement", "independence", "partition", "revolt of 1857", "gandhi", "nehru",
      "ambedkar", "tilak", "gokhale", "bose", "jinnah", "maurya", "gupta", "mughal",
      "sultanate", "harappan", "indus valley", "vedic", "buddhism", "jainism", "bhakti",
      "sufi", "ashoka", "akbar", "shivaji", "dynasty", "empire", "kingdom", "inscription",
      "numismatics", "archaeology", "excavation", "monument", "unesco world heritage",
      "heritage", "art and culture", "temple architecture", "sculpture", "painting",
      "manuscript", "chronicle", "historiography", "subaltern studies", "peasant movement",
      "tribal revolt", "social reform", "renaissance", "press", "republic",
      "integration of princely states", "decolonisation", "nationalist", "swadeshi",
      "non-cooperation", "civil disobedience", "quit india", "constituent assembly",
    ],
  },
  anthropology: {
    id: "anthropology",
    label: "Anthropology",
    short: "Anthropology",
    description:
      "Physical and socio-cultural anthropology, tribal studies, kinship, religion, material culture and human evolution.",
    why: "Anthropology asks you to see a community on its own terms and then compare. Watch for evolution, kinship, ritual, ecology and the ethics of studying people.",
    cues: ["cultural relativism", "ethnographic method", "kinship and descent", "tribal ecology"],
    hooks: [
      "What is the emic account, and how does it differ from the official one?",
      "Which kinship, ritual or ecological pattern does this illustrate?",
      "What are the ethical issues in studying or governing this community?",
    ],
    topicIds: ["society", "history", "environment"],
    keywords: [
      "anthropology", "anthropological", "ethnography", "ethnology", "tribal", "tribe",
      "scheduled tribe", "adivasi", "pvtg", "particularly vulnerable tribal group",
      "birsa munda", "janjati", "kinship", "lineage", "clan", "totem", "exogamy", "endogamy",
      "marriage", "family", "ritual", "magic", "religion", "belief system", "myth", "folklore",
      "culture", "cultural relativism", "ethnocentrism", "acculturation", "assimilation",
      "enculturation", "diffusion", "material culture", "archaeological anthropology",
      "biological anthropology", "physical anthropology", "forensic anthropology",
      "human evolution", "hominin", "race", "ethnicity", "nomadic", "pastoral",
      "hunter-gatherer", "shifting cultivation", "jhum", "displacement", "resettlement",
      "forest rights", "frag", "village study", "museum", "anthropological survey of india",
      "indigenous knowledge", "traditional knowledge", "oral history", "taboo",
    ],
  },
};

export const OPTIONAL_ORDER: OptionalId[] = [
  "psir",
  "geography",
  "sociology",
  "pubadmin",
  "history",
  "anthropology",
];

export const OPTIONAL_LIST: OptionalSubject[] = OPTIONAL_ORDER.map((id) => OPTIONALS[id]);

export function optionalById(id: string | undefined | null): OptionalSubject | null {
  if (!id) return null;
  return (OPTIONALS as Record<string, OptionalSubject>)[id] ?? null;
}

/** Signals that a story is a policy event rather than background noise. */
export const SIGNAL_TERMS = [
  "bill", "act", "amendment", "judgment", "verdict", "ruling", "policy", "scheme",
  "notification", "rules", "guidelines", "budget", "report", "index", "survey",
  "committee", "commission", "summit", "agreement", "treaty", "mission", "initiative",
  "launch", "approval", "cabinet", "gazette", "regulation", "reform", "crisis",
  "shortage", "protest", "strike", "ban", "order", "directive", "allocation",
];

/** Content that is about preparing for the exam rather than the news itself. */
export const PREP_NOISE = [
  "test series", "mock test", "mock interview", "daily quiz", "answer writing",
  "topper", "air 1", "air 2", "air 3", "prelims current affairs",
  "mains current affairs", "current affairs for", "daily current affairs",
  "editorial analysis", "upsc essentials", "study material", "coaching",
  "upsc notes", "upsc syllabus", "notes for upsc", "ias notes",
];

/** Non-examinable lifestyle/sport/entertainment noise. */
export const LOW_SIGNAL = [
  "bollywood", "box office", "celebrity", "big boss", "cricket", "ipl", "parasports",
  "paralympic", "medal", "film review", "movie review", "fashion", "recipe", "horoscope",
  "astrology", "travel guide", "tourist", "viral video", "web series", "ott release",
];

export const DEVANAGARI = /[\u0900-\u097F]/;

/** Coaching, test-prep and job-spam publishers that add noise, not news. */
export const BLOCKED_SOURCE_DOMAINS = [
  "vajiramias.com", "drishtiias.com", "visionias.in", "insightsonindia.com",
  "iasbaba.com", "add247.com", "adda247.com", "pw.live", "careers360.com",
  "jagranjosh.com", "testbook.com", "byjus.com", "unacademy.com", "sscadda.com",
  "guidely.in", "oliveboard.in", "practicemock.com", "ixambee.com", "studyiq.com",
  "onlyias.com", "sleepyclasses.com", "forumias.com", "civilsdaily.com",
  "edukemy.com", "lawtext.in", "lawchakra.in", "lawbeat.in", "lawtrend.in",
  "organiser.org", "indiaherald.com", "latestly.com",
];

/** Non-civil-services recruitment noise that rides on the UPSC query. */
export const EXAM_NOISE = /\b(nda|cds|ese|afcat|capf|ssc|bank po|ibps|rrb|beo|aee|ae|je|junior engineer|assistant professor|reporter|clerk|stenographer|apprentice|constable|agniveer|agnipath|police recruitment)\b/i;

