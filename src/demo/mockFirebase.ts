/* In-memory stand-ins for firebase/app, firebase/auth and firebase/firestore.
   Used only by the static demo build (`npm run build:demo`, see vite.config.ts):
   the real SDK imports are aliased to this file, so the app runs with no backend,
   seeded with fictional data from ./seed.ts. Edits live in memory and reset on reload. */
type Data = Record<string, unknown>;

// ---------- store ----------
const docs = new Map<string, Data>();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => queueMicrotask(l));

// The seed imports the app's own aggregation code, which imports firebase.ts, which imports
// THIS module — so load it lazily (dynamic import) to avoid a circular-init error. Every
// read/write waits on `ready`.
const ready: Promise<void> = import("./seed").then(({ buildSeed }) => {
  for (const [path, data] of Object.entries(buildSeed())) docs.set(path, data);
});

let autoId = 0;
const newId = () => `demo${Date.now().toString(36)}${(autoId++).toString(36)}`;

// ---------- references ----------
interface CollRef { type: "collection"; path: string; id: string }
interface DocRef { type: "document"; path: string; id: string; parent: CollRef }
interface Constraint { kind: "orderBy" | "where" | "limit"; field?: string; dir?: string; op?: string; value?: unknown; n?: number }
interface QueryRef { type: "query"; coll: CollRef; constraints: Constraint[] }
type Source = CollRef | DocRef | QueryRef;

const join = (segs: string[]) => segs.filter(Boolean).join("/");
const mkColl = (path: string): CollRef => ({ type: "collection", path, id: path.split("/").pop() ?? "" });
const mkDoc = (path: string): DocRef => {
  const parts = path.split("/");
  return { type: "document", path, id: parts[parts.length - 1], parent: mkColl(parts.slice(0, -1).join("/")) };
};

export const initializeFirestore = () => ({ demo: true });
export const getFirestore = () => ({ demo: true });
export const persistentLocalCache = () => ({});
export const persistentMultipleTabManager = () => ({});

type Root = { demo?: boolean } | DocRef | CollRef;
export function collection(root: Root, ...segs: string[]): CollRef {
  const base = "path" in root ? root.path : "";
  return mkColl(join([base, ...segs]));
}
export function doc(root: Root, ...segs: string[]): DocRef {
  if ("type" in root && root.type === "collection" && segs.length === 0) return mkDoc(join([root.path, newId()]));
  const base = "path" in root ? root.path : "";
  return mkDoc(join([base, ...segs]));
}
export const orderBy = (field: string, dir = "asc"): Constraint => ({ kind: "orderBy", field, dir });
export const where = (field: string, op: string, value: unknown): Constraint => ({ kind: "where", field, op, value });
export const limit = (n: number): Constraint => ({ kind: "limit", n });
export const query = (coll: CollRef | QueryRef, ...constraints: Constraint[]): QueryRef =>
  coll.type === "query" ? { ...coll, constraints: [...coll.constraints, ...constraints] } : { type: "query", coll, constraints };

// ---------- sentinels ----------
class ArrayUnion { items: unknown[]; constructor(items: unknown[]) { this.items = items; } }
class ServerTs {}
export const arrayUnion = (...items: unknown[]) => new ArrayUnion(items);
export const serverTimestamp = () => new ServerTs();

export class Timestamp {
  seconds: number;
  nanoseconds: number;
  constructor(seconds: number, nanoseconds = 0) { this.seconds = seconds; this.nanoseconds = nanoseconds; }
  static now() { return Timestamp.fromMillis(Date.now()); }
  static fromMillis(ms: number) { return new Timestamp(Math.floor(ms / 1000), (ms % 1000) * 1e6); }
  static fromDate(d: Date) { return Timestamp.fromMillis(d.getTime()); }
  toMillis() { return this.seconds * 1000 + Math.floor(this.nanoseconds / 1e6); }
  toDate() { return new Date(this.toMillis()); }
}

const resolve = (prev: unknown, v: unknown): unknown => {
  if (v instanceof ServerTs) return Timestamp.now();
  if (v instanceof ArrayUnion) return Array.from(new Set([...(Array.isArray(prev) ? prev : []), ...v.items]));
  return v;
};
const applyFields = (base: Data, patch: Data): Data => {
  const out: Data = { ...base };
  for (const [k, v] of Object.entries(patch)) if (v !== undefined) out[k] = resolve(out[k], v);
  return out;
};

// ---------- snapshots ----------
interface DocSnap { id: string; ref: DocRef; exists: () => boolean; data: () => Data | undefined }
const snapOf = (path: string): DocSnap => {
  const data = docs.get(path);
  return { id: path.split("/").pop() ?? "", ref: mkDoc(path), exists: () => data !== undefined, data: () => (data ? structuredCloneSafe(data) : undefined) };
};
const structuredCloneSafe = (d: Data): Data => {
  try { return structuredClone(d); } catch { return { ...d }; }
};

const getField = (d: Data, field: string): unknown => field.split(".").reduce<unknown>((o, k) => (o as Data | undefined)?.[k], d);
const cmp = (a: unknown, b: unknown) => (a === b ? 0 : a === undefined || a === null ? 1 : b === undefined || b === null ? -1 : (a as number) < (b as number) ? -1 : 1);

function runQuery(src: CollRef | QueryRef): DocSnap[] {
  const coll = src.type === "query" ? src.coll : src;
  const constraints = src.type === "query" ? src.constraints : [];
  const prefix = coll.path + "/";
  let snaps = [...docs.keys()]
    .filter((p) => p.startsWith(prefix) && !p.slice(prefix.length).includes("/"))
    .map(snapOf);
  for (const c of constraints.filter((x) => x.kind === "where")) {
    snaps = snaps.filter((s) => {
      const v = getField(s.data() as Data, c.field!);
      return c.op === "==" ? v === c.value : c.op === "!=" ? v !== c.value
        : c.op === "in" ? (c.value as unknown[]).includes(v) : c.op === "array-contains" ? Array.isArray(v) && v.includes(c.value)
        : c.op === ">" ? (v as number) > (c.value as number) : c.op === ">=" ? (v as number) >= (c.value as number)
        : c.op === "<" ? (v as number) < (c.value as number) : c.op === "<=" ? (v as number) <= (c.value as number) : true;
    });
  }
  for (const c of constraints.filter((x) => x.kind === "orderBy").reverse()) {
    const sign = c.dir === "desc" ? -1 : 1;
    snaps.sort((a, b) => sign * cmp(getField(a.data() as Data, c.field!), getField(b.data() as Data, c.field!)));
  }
  const lim = constraints.find((x) => x.kind === "limit");
  return lim ? snaps.slice(0, lim.n) : snaps;
}

const querySnap = (src: CollRef | QueryRef) => {
  const list = runQuery(src);
  return { docs: list, size: list.length, empty: list.length === 0, forEach: (fn: (d: DocSnap) => void) => list.forEach(fn) };
};

// ---------- reads ----------
export const getDocs = async (src: CollRef | QueryRef) => { await ready; return querySnap(src); };
export const getDoc = async (ref: DocRef) => { await ready; return snapOf(ref.path); };

export function onSnapshot(src: Source, next: (s: never) => void, error?: (e: Error) => void): () => void {
  void error;
  const emit = () => next((src.type === "document" ? snapOf(src.path) : querySnap(src)) as never);
  listeners.add(emit);
  void ready.then(emit);
  return () => { listeners.delete(emit); };
}

// ---------- writes ----------
function put(ref: DocRef, data: Data, merge: boolean) {
  const base = merge ? docs.get(ref.path) ?? {} : {};
  docs.set(ref.path, applyFields(base, data));
}
export async function setDoc(ref: DocRef, data: Data, opts?: { merge?: boolean }) { await ready; put(ref, data, !!opts?.merge); notify(); }
export async function addDoc(coll: CollRef, data: Data) { await ready; const ref = mkDoc(join([coll.path, newId()])); put(ref, data, false); notify(); return ref; }
export async function updateDoc(ref: DocRef, data: Data) {
  await ready;
  if (!docs.has(ref.path)) throw new Error("No document to update");
  put(ref, data, true); notify();
}
export async function deleteDoc(ref: DocRef) { await ready; docs.delete(ref.path); notify(); }

export function writeBatch() {
  const ops: (() => void)[] = [];
  const batch = {
    set: (ref: DocRef, data: Data, opts?: { merge?: boolean }) => { ops.push(() => put(ref, data, !!opts?.merge)); return batch; },
    update: (ref: DocRef, data: Data) => { ops.push(() => put(ref, data, true)); return batch; },
    delete: (ref: DocRef) => { ops.push(() => { docs.delete(ref.path); }); return batch; },
    commit: async () => { await ready; ops.forEach((o) => o()); notify(); },
  };
  return batch;
}

// ---------- firebase/app ----------
export const initializeApp = () => ({ demo: true });
export const getApps = () => [{ demo: true }];
export const getApp = () => ({ demo: true });

// ---------- firebase/auth ----------
export const DEMO_USER = { uid: "demo", email: "admin@example.com", emailVerified: true, displayName: "Demo Admin" };
type AuthLike = { currentUser: typeof DEMO_USER | null };
const auth: AuthLike = { currentUser: DEMO_USER };
const authListeners = new Set<(u: typeof DEMO_USER | null) => void>();
const setUser = (u: typeof DEMO_USER | null) => { auth.currentUser = u; authListeners.forEach((l) => l(u)); };

export const getAuth = () => auth;
export function onAuthStateChanged(_auth: AuthLike, cb: (u: typeof DEMO_USER | null) => void) {
  authListeners.add(cb);
  queueMicrotask(() => cb(auth.currentUser));
  return () => { authListeners.delete(cb); };
}
export async function signOut() { setUser(null); }
export async function signInWithEmailAndPassword() { setUser(DEMO_USER); return { user: DEMO_USER }; }
export async function sendPasswordResetEmail() { /* demo: no-op */ }
export async function sendEmailVerification() { /* demo: no-op */ }
