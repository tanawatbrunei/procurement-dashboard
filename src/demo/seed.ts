/* Fictional seed data for the static demo build. Nothing here refers to a real
   company, person or project — names, prices and dates are generated. Dates are
   relative to "today" so the dashboards always look current. */
import { aggregateItems, aggregateVendors } from "../data/procurement";
import type { POLine } from "../data/procurement";

type Data = Record<string, unknown>;

// Deterministic RNG so every load shows the same story.
function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(20260);
const pick = <T,>(a: readonly T[]): T => a[Math.floor(rand() * a.length)];
const between = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
const chance = (p: number) => rand() < p;

const TODAY = new Date();
TODAY.setHours(12, 0, 0, 0);
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const daysAgo = (n: number) => { const d = new Date(TODAY); d.setDate(d.getDate() - n); return d; };
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

const COMPANIES = ["HEC", "HUE", "HSC", "HSP1"] as const;
const PROJECTS = ["Alpha Rooftop", "Beta Carport", "Gamma Farm", "Delta Floating", "Epsilon Factory", "Zeta Warehouse", "Eta Mall", "Theta Hospital", "Iota Campus", "Kappa Cold Storage"];

/* ---------------- PO lines → items / vendors ---------------- */

const VENDORS = [
  { code: "V1001", name: "Sunrise Solar Supply Co., Ltd.", group: "LOCAL" },
  { code: "V1002", name: "Lumen Panels Trading", group: "LOCAL" },
  { code: "V1003", name: "Orbit Inverter Systems", group: "OVERSEA" },
  { code: "V1004", name: "Gridline Electric Co., Ltd.", group: "LOCAL" },
  { code: "V1005", name: "Copperfield Cable & Wire", group: "LOCAL" },
  { code: "V1006", name: "Steelwave Mounting Solutions", group: "LOCAL" },
  { code: "V1007", name: "Voltaic Storage Technologies", group: "OVERSEA" },
  { code: "V1008", name: "Helio Transformer Works", group: "LOCAL" },
  { code: "V1009", name: "Northstar Safety Equipment", group: "LOCAL" },
  { code: "V1010", name: "Pacific Logistics & Freight", group: "LOCAL" },
  { code: "V1011", name: "Atlas Switchgear Co., Ltd.", group: "GROUP" },
  { code: "V1012", name: "Brightpath Monitoring Co.", group: "LOCAL" },
];

// [itemNumber, name, category, unit, base price THB]
const ITEMS: [string, string, string, string, number][] = [
  ["PV-550M", "PV Module 550W Mono Bifacial", "PV Module", "pcs", 4900],
  ["PV-620M", "PV Module 620W N-Type Bifacial", "PV Module", "pcs", 5600],
  ["PV-710M", "PV Module 710W N-Type Double Glass", "PV Module", "pcs", 6900],
  ["INV-50K", "String Inverter 50kW", "Inverter", "set", 78000],
  ["INV-100K", "String Inverter 100kW", "Inverter", "set", 142000],
  ["INV-330K", "String Inverter 330kW", "Inverter", "set", 395000],
  ["OPT-1300", "Power Optimizer 1300W", "Inverter", "pcs", 2450],
  ["CBL-DC4", "DC Solar Cable 4 sqmm (100m)", "Cable", "roll", 3200],
  ["CBL-DC6", "DC Solar Cable 6 sqmm (100m)", "Cable", "roll", 4600],
  ["CBL-AC95", "AC Cable CV 4x95 sqmm", "Cable", "m", 1380],
  ["CBL-AC240", "AC Cable CV 4x240 sqmm", "Cable", "m", 3150],
  ["MNT-RAIL", "Aluminium Mounting Rail 4.2m", "Mounting", "pcs", 720],
  ["MNT-CLAMP", "Mid / End Clamp Set", "Mounting", "set", 38],
  ["MNT-HOOK", "Roof Hook Stainless", "Mounting", "pcs", 95],
  ["MNT-CARPORT", "Carport Steel Structure", "Mounting", "kg", 48],
  ["TRF-1000", "Transformer 1000kVA 22kV", "Transformer", "unit", 685000],
  ["TRF-2000", "Transformer 2000kVA 22kV", "Transformer", "unit", 1180000],
  ["SWG-MV", "MV Switchgear 24kV RMU", "Switchgear", "set", 520000],
  ["SWG-ACB", "ACB 1600A 4P", "Switchgear", "pcs", 96000],
  ["SWG-MCCB", "MCCB 250A 3P", "Switchgear", "pcs", 6800],
  ["BESS-241", "BESS Cabinet 241kWh", "BESS", "unit", 2350000],
  ["BESS-257", "BESS Cabinet 257kWh", "BESS", "unit", 2590000],
  ["MON-LOG", "Data Logger + Weather Station", "Monitoring", "set", 46000],
  ["MON-SENS", "Irradiance Sensor", "Monitoring", "pcs", 9800],
  ["SAF-LIFE", "Lifeline Safety System (per m)", "Safety", "m", 560],
  ["SAF-PPE", "PPE Set (helmet, harness, gloves)", "Safety", "set", 1850],
  ["LOG-FREIGHT", "Sea Freight 40ft Container", "Logistics", "trip", 42000],
  ["LOG-CRANE", "Crane Rental (per day)", "Logistics", "day", 18500],
];
// Vendors that sell each category (first = cheapest on average).
const CATEGORY_VENDORS: Record<string, string[]> = {
  "PV Module": ["V1002", "V1001", "V1003"], Inverter: ["V1003", "V1004", "V1001"], Cable: ["V1005", "V1004"],
  Mounting: ["V1006", "V1001"], Transformer: ["V1008", "V1011"], Switchgear: ["V1011", "V1004"], BESS: ["V1007", "V1003"],
  Monitoring: ["V1012", "V1004"], Safety: ["V1009"], Logistics: ["V1010"],
};
const TERMS = ["Net 30", "Net 45", "Net 60", "50% advance / 50% on delivery", "Net 15"];

function buildPoLines(): POLine[] {
  const lines: POLine[] = [];
  const vendorBy = new Map(VENDORS.map((v) => [v.code, v]));
  let poSeq = 1000;
  for (let day = 700; day >= 1; day -= 1) {
    if (!chance(0.45)) continue;                         // a PO on roughly every other day
    const created = daysAgo(day);
    const vendorCode = pick(Object.values(CATEGORY_VENDORS).flat());
    const vendor = vendorBy.get(vendorCode)!;
    const catItems = ITEMS.filter(([, , cat]) => (CATEGORY_VENDORS[cat] ?? []).includes(vendorCode));
    if (!catItems.length) continue;
    const poNumber = `PO${String(created.getFullYear()).slice(2)}${String(++poSeq).padStart(5, "0")}`;
    const company = pick(COMPANIES);
    const project = pick(PROJECTS);
    const roll = rand();
    const status = roll < 0.06 ? "Canceled" : roll < 0.16 ? "Open order" : roll < 0.55 ? "Received" : "Invoiced";
    const terms = pick(TERMS);
    const nLines = between(1, 3);
    for (let s = 1; s <= nLines; s++) {
      const [itemNumber, productName, category, unit, base] = pick(catItems);
      const rank = (CATEGORY_VENDORS[category] ?? []).indexOf(vendorCode);
      const drift = 1 + (700 - day) / 700 * 0.03 * (itemNumber.length % 3 - 1);    // slow trend per item
      const noise = 0.97 + rand() * 0.06;
      // A couple of items have one clearly more expensive vendor, so variance badges show up.
      const premium = rank > 0 ? 1 + rank * 0.03 : 1;
      const spike = (itemNumber === "PV-620M" || itemNumber === "CBL-AC95") && rank === 2 ? 1.45 : 1;
      const unitPrice = Math.round(base * drift * noise * premium * spike * 100) / 100;
      const qty = Math.max(1, Math.round((rand() * 0.9 + 0.1) * (base < 1000 ? 600 : base < 10000 ? 120 : base < 150000 ? 20 : 3)));
      const overseas = vendor.group === "OVERSEA" && chance(0.25);
      lines.push({
        id: `${poNumber}__${s}`, poNumber, poDate: status === "Open order" ? "" : iso(addDays(created, between(5, 20))),
        createdDate: iso(created), company, status, vendorCode, vendorName: vendor.name, vendorGroup: vendor.group,
        itemNumber, productName, category, unit, currency: overseas ? "USD" : "THB", qty, unitPrice,
        amountTHB: Math.round(qty * unitPrice * (overseas ? 34 : 1)), paymentTerms: terms, project,
      });
    }
  }
  return lines;
}

/* ---------------- tracking (PR / PA / PO) ---------------- */

const BUYERS = ["Anna", "Ben", "Cara", "Dan", "Eve", "Finn"];
const DEPTS = ["Engineering", "Construction", "O&M", "Utility", "Residential"];
const DESCRIPTIONS = ["PV module", "Inverter", "DC cable", "Mounting structure", "Transformer", "MV switchgear", "BESS cabinet", "Monitoring system", "Safety equipment", "Civil materials", "Freight service", "Crane rental"];

function buildTracking(vendorNames: string[]) {
  const out: Record<string, Data> = {};
  out["meta/trackingSync"] = { lastSyncedAt: daysAgo(0).toISOString() };
  const stageWeights = [0.12, 0.13, 0.17, 0.12, 0.28, 0.04, 0.14]; // 0..4 + cancelled + spare→PO pending
  BUYERS.forEach((name, ti) => {
    const tabId = `tab-${name.toLowerCase()}`;
    out[`trackingTabs/${tabId}`] = { name, order: ti + 1 };
    for (let i = 1; i <= 34; i++) {
      // choose a stage by weights: 0 PR, 1 PA bidding, 2 PA approval, 3 PO pending, 4 done, -1 cancelled
      let r = rand(), stage = 0; const map = [0, 1, 2, 3, 4, -1, 3];
      for (let k = 0; k < stageWeights.length; k++) { if (r < stageWeights[k]) { stage = map[k]; break; } r -= stageWeights[k]; }
      const d1 = between(1, 6), d2 = between(1, 9), d3 = between(1, 6), d4 = between(1, 7);
      const wait = chance(0.2) ? between(8, 22) : between(0, 6);        // some rows sit long in their stage
      const effStage = stage === -1 ? between(0, 3) : stage;
      const total = [0, d1, d1 + d2, d1 + d2 + d3, d1 + d2 + d3 + d4][effStage] + (stage === 4 ? between(0, 40) : wait);
      const pr = daysAgo(total + (stage === 4 ? between(10, 120) : 0));
      const paSub = addDays(pr, d1), paApp = addDays(paSub, d2), poSub = addDays(paApp, d3), poApp = addDays(poSub, d4);
      const seq = String(ti * 100 + i).padStart(4, "0");
      const yy = String(pr.getFullYear()).slice(2);
      const priced = chance(0.75);
      const qty = between(1, 200), unitPrice = between(500, 90000);
      const row: Data = {
        no: i, company: pick(COMPANIES), dept: pick(DEPTS), project: pick(PROJECTS), description: pick(DESCRIPTIONS),
        prNo: `PR${yy}-${seq}`, prDate: iso(pr), vendor: pick(vendorNames), urgent: chance(0.1),
        status: stage === -1 ? "Cancelled" : stage === 4 ? "Completed" : stage === 2 ? "Pending PA Approval" : effStage === 3 && chance(0.5) ? "Pending PO Approval" : "In Progress",
        remark: "",
      };
      if (priced) Object.assign(row, { qty, unit: "unit", unitPrice, discount: chance(0.3) ? between(0, 5) * 1000 : 0, budget: Math.round(qty * unitPrice * 1.1) });
      if (effStage >= 1) row.paNo = `PA${yy}-${seq}`;
      if (effStage >= 2) row.paSubmittedDate = iso(paSub);
      if (effStage >= 3) row.paApprovedDate = iso(paApp);
      if (effStage >= 3 && (stage === 4 || chance(0.8))) { row.poNo = `PO${yy}${String(60000 + ti * 100 + i)}`; row.poSubmittedDate = iso(poSub); }
      if (stage === 4) {
        row.poApprovedDate = iso(poApp);
        const needed = addDays(pr, between(20, 45));
        row.neededDate = iso(needed);
        if (chance(0.7)) row.deliveredDate = iso(addDays(needed, between(-6, 8)));
      } else if (chance(0.7)) row.neededDate = iso(addDays(pr, between(10, 40)));
      out[`trackingTabs/${tabId}/rows/r${String(i).padStart(3, "0")}`] = row;
    }
  });
  return out;
}

/* ---------------- projects ---------------- */

function buildProjects() {
  const out: Record<string, Data> = {};
  const names = ["Alpha Rooftop", "Beta Carport", "Gamma Farm", "Delta Floating", "Epsilon Factory", "Zeta Warehouse", "Eta Mall", "Theta Hospital", "Iota Campus",
    "Kappa Cold Storage", "Lambda Resort", "Mu Logistics Park", "Nu Food Plant", "Xi Water Plant", "Omicron School", "Pi Data Center"];
  const subcons = ["Bright Install Co.", "SunCrew Engineering", "Rooftop Pros", "Voltline Contractors", "Apex Solar Works", "Greenfield Build", "-"];
  const status = ["Done", "On going", "On going", "Hold", "Cancelled", "Done", "On going"] as const;
  const roof = ["Rooftop", "Carport", "Farm", "Floating", "Reroof", "Rooftop"];
  const pv = ["JA Solar", "Jinko", "Longi", "Trina", "Longi", "JA Solar"];
  const inv = ["Huawei", "Sungrow", "SolarEdge", "Huawei", "ABB"];
  let job = 1, n = 0;
  names.forEach((name, idx) => {
    const records = idx < 4 ? 3 : idx < 8 ? 2 : 1;                 // some projects have several records → grouped rows
    for (let k = 0; k < records; k++) {
      const kwp = between(120, 3500);
      const price = kwp * between(21000, 28000);
      out[`kickoffProjects/p${++n}`] = {
        jobNo: job, name,
        roofType: pick(roof), contractType: pick(["EPC", "EPC", "PPA", "PEAESCO"]), capacityKwp: kwp, roofCount: between(1, 8), meterCount: between(1, 4),
        connectionPoint: "", safetyLevel: "", workmanship: "", counterparty: `${pick(["Orion", "Vega", "Lyra", "Nova", "Titan"])} ${pick(["Industries", "Foods", "Retail", "Logistics"])} Co., Ltd.`,
        location: pick(["Chonburi", "Rayong", "Samut Prakan", "Ayutthaya", "Khon Kaen", "Chiang Mai", "Nakhon Ratchasima"]),
        contractPrice: price, subconAwardAmount: Math.round(price * 0.12), materialThbWatt: Math.round((18 + rand() * 4) * 100) / 100, labourThbWatt: Math.round((2.5 + rand() * 1.5) * 100) / 100,
        subconName: pick(subcons), awardDate: iso(daysAgo(between(30, 900))), pvBrand: pick(pv), powerClass: pick(["550W", "620W", "710"]),
        inverterBrand: pick(inv), inverterModel: pick(["100KTL", "50KTL", "SE100K"]), optimizer: "-", bessBrand: chance(0.15) ? "Sungrow" : "", bessSize: "", om: "",
        kickoffDate: iso(daysAgo(between(10, 1000))), puPic: pick(BUYERS), pmPic: pick(["Mark", "Nina", "Oscar"]), engPic: pick(["Paul", "Quinn", "Rita"]),
        status: "Kick Off แล้ว", colorStatus: pick(status), toc: pick(["Not yet", "WIP", "Done"]), boi: "", note: "", estimateSiteMob: "", forecastSiteMob1: "", forecastSiteMob2: "",
        phases: [],
      };
    }
    job += 1;
  });
  return out;
}

/* ---------------- everything ---------------- */

export function buildSeed(): Record<string, Data> {
  const out: Record<string, Data> = {};
  const lines = buildPoLines();
  for (const l of lines) { const { id, ...rest } = l; out[`poLines/${id}`] = rest; }
  out["meta/poIndex"] = { poNumbers: [...new Set(lines.map((l) => l.poNumber))] };

  const vendorAggs = aggregateVendors(lines);
  for (const v of vendorAggs.values()) {
    const cats = Object.entries(v.categorySpend).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([c]) => c);
    out[`vendors/${v.vendorCode}`] = { ...v, categories: cats, status: "active", note: "", source: "po-import", contactPerson: "", contactPhone: "", contactEmail: "" };
  }
  for (const it of aggregateItems(lines).values()) out[`items/${it.itemNumber}`] = { ...it };

  const today = iso(TODAY);
  out["meta/companyUpdates"] = { updates: { HEC: today, HUE: iso(daysAgo(3)), HSC: iso(daysAgo(9)), HSP1: iso(daysAgo(16)) } };
  [0, 7, 14].forEach((d, i) => {
    const id = `${Date.now() - i}`;
    out[`importHistory/${id}`] = { id, timestamp: daysAgo(d).toISOString(), importedBy: "admin@example.com", fileName: `All_Purchase orders_${COMPANIES[i]}.xlsx`, companies: [COMPANIES[i]], newPOs: between(5, 40), newLines: between(10, 90), skippedExisting: between(100, 400), skippedNoPO: 0, skippedBeforeDate: 0 };
  });

  Object.assign(out, buildTracking(VENDORS.map((v) => v.name)), buildProjects());

  [
    ["Farm Alpha", "EPC", "EPC solar farm — example project", "construction", 62],
    ["Farm Beta", "EPC", "EPC solar farm — example project", "construction", 35],
    ["Farm Gamma", "PPA", "PPA solar farm (~80 MW) — O&M in-house", "cod", null],
    ["Farm Delta", "PPA", "PPA solar farm (~90 MW) — O&M in-house", "cod", null],
    ["Farm Epsilon", "EPC", "EPC solar farm (~40 MW)", "construction", 88],
    ["Farm Zeta", "PPA", "PPA rooftop portfolio", "construction", 12],
  ].forEach(([name, type, note, stage, progress], i) => { out[`homeProjects/f${i + 1}`] = { name, type, note, owners: [], stage, progress }; });

  out["allowedUsers/admin@example.com"] = { email: "admin@example.com", role: "admin", addedBy: "demo", addedAt: daysAgo(30).toISOString() };
  out["allowedUsers/member@example.com"] = { email: "member@example.com", role: "member", addedBy: "admin@example.com", addedAt: daysAgo(10).toISOString() };
  return out;
}
