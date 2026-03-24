import { useState, useEffect } from "react";

// ─── COORDINATE GRID SYSTEM ──────────────────────────────────────────────────
// Each room = (x, y) grid coordinate, like a game map
// (0,0) = top-left of building, x = right, y = down
// Backend uses these SAME coordinates for Dijkstra

const LOCATIONS = {
  entrance: { name: "Main Entrance", x: 2, y: 4, type: "entrance" },

  reception: { name: "Reception", x: 1, y: 4, type: "office" },
  washroom: { name: "Girls Washroom", x: 2, y: 3, type: "hall" },

  corridor: { name: "Main Corridor", x: 3, y: 4, type: "corridor" },

  auditorium: { name: "Auditorium", x: 4, y: 4, type: "hall" },
  principal: { name: "Principal Office", x: 3, y: 3, type: "office" },

  lift: { name: "Lift", x: 1, y: 3, type: "stairs" }
};
const GRAPH = {
  entrance: { reception: 1, washroom: 1, corridor: 1, lift: 1 },

  reception: { entrance: 1 },
  washroom: { entrance: 1 },

  corridor: { entrance: 1, auditorium: 1, principal: 1 },

  auditorium: { corridor: 1 },
  principal: { corridor: 1 },

  lift: { entrance: 1 }
};



const DEST_LIST = [
  { key: "reception", label: "Reception" },
  { key: "washroom", label: "Girls Washroom" },
  { key: "auditorium", label: "Auditorium" },
  { key: "principal", label: "Principal Office" },
  { key: "lift", label: "Lift" }
];

const ROOM_STYLE = {
  lab:     { bg: "#EEF2FF", border: "#C7D2FE", text: "#3730A3", dot: "#4F46E5", icon: "⚡" },
  library: { bg: "#F0FDF4", border: "#BBF7D0", text: "#166534", dot: "#16A34A", icon: "📚" },
  canteen: { bg: "#FFF7ED", border: "#FED7AA", text: "#9A3412", dot: "#EA580C", icon: "🍽" },
  hall:    { bg: "#FDF4FF", border: "#E9D5FF", text: "#6B21A8", dot: "#9333EA", icon: "🎤" },
  office:  { bg: "#FEF3C7", border: "#FDE68A", text: "#92400E", dot: "#D97706", icon: "🏛" },
  entrance:{ bg: "#F0F9FF", border: "#BAE6FD", text: "#075985", dot: "#0284C7", icon: "🚪" },
  stairs:  { bg: "#F8F8F8", border: "#E2E8F0", text: "#475569", dot: "#94A3B8", icon: "🪜" },
  corridor:{ bg: "transparent", border: "transparent", text: "#94A3B8", dot: "#CBD5E1", icon: "—" },
};

// ─── MOCK BACKEND ─────────────────────────────────────────────────────────────
// DELETE this section and replace with real fetch() when backend is ready
function dijkstra(graph, start, end) {
  const dist = {}, prev = {}, unvisited = new Set(Object.keys(graph));
  for (const n of unvisited) dist[n] = Infinity;
  dist[start] = 0;
  while (unvisited.size > 0) {
    const curr = [...unvisited].reduce((a, b) => dist[a] < dist[b] ? a : b);
    if (curr === end || dist[curr] === Infinity) break;
    unvisited.delete(curr);
    for (const [nb, w] of Object.entries(graph[curr] || {})) {
      const alt = dist[curr] + w;
      if (alt < dist[nb]) { dist[nb] = alt; prev[nb] = curr; }
    }
  }
  const path = []; let c = end;
  while (c) { path.unshift(c); c = prev[c]; }
  return path[0] === start ? path : [];
}

function buildSteps(path) {
  return path.slice(0, -1).map((nodeId, i) => {
    const a = LOCATIONS[nodeId], b = LOCATIONS[path[i + 1]];
    const dx = b.x - a.x, dy = b.y - a.y;
    let arrow = "↑", instruction = "Walk straight ahead";
    if      (dx > 0) { arrow = "→"; instruction = "Turn right"; }
    else if (dx < 0) { arrow = "←"; instruction = "Turn left"; }
    else if (dy > 0) { arrow = "↓"; instruction = "Continue forward"; }
    if (b.type === "stairs") instruction = "Head to staircase";
    return { arrow, instruction, toRoom: b.name, nodeId: path[i + 1], grid_from: { x: a.x, y: a.y }, grid_to: { x: b.x, y: b.y } };
  });
}

// SWAP THIS for real API when backend is ready:
// const res = await fetch("http://BACKEND_IP:5000/api/navigate", {
//   method: "POST", headers: {"Content-Type":"application/json"},
//   body: JSON.stringify({ from: currentNode, to: destKey })
// });
// const { path, steps } = await res.json();
async function mockApiCall(from, to) {
  await new Promise(r => setTimeout(r, 900));
  const path = dijkstra(GRAPH, from, to);
  return { path, steps: buildSteps(path) };
}
// ─── END MOCK ─────────────────────────────────────────────────────────────────

export default function CampusNav() {
  const [screen, setScreen]       = useState("home");
  const [query, setQuery]         = useState("");
  const [destKey, setDestKey]     = useState(null);
  const [path, setPath]           = useState([]);
  const [steps, setSteps]         = useState([]);
  const [stepIdx, setStepIdx]     = useState(0);
  const [loadPct, setLoadPct]     = useState(0);
  const [micOn, setMicOn]         = useState(false);
  const [micBig, setMicBig]       = useState(false);
  const [showSug, setShowSug]     = useState(false);

  const currentNode = "entrance";

  const filtered = DEST_LIST.filter(d =>
    !query || d.label.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (!micOn) return;
    const iv = setInterval(() => setMicBig(b => !b), 500);
    return () => clearInterval(iv);
  }, [micOn]);

  async function startNav(key) {
    setDestKey(key);
    setQuery(LOCATIONS[key]?.name || "");
    setShowSug(false);
    setScreen("scanning");
    setLoadPct(0);
    let p = 0;
    const iv = setInterval(() => { p += 18; setLoadPct(Math.min(p, 88)); if (p >= 88) clearInterval(iv); }, 130);
    const result = await mockApiCall(currentNode, key);
    clearInterval(iv);
    setLoadPct(100);
    setPath(result.path);
    setSteps(result.steps);
    setStepIdx(0);
    setTimeout(() => setScreen("navigate"), 350);
  }

  function nextStep() {
    if (stepIdx >= steps.length - 1) setScreen("arrived");
    else setStepIdx(i => i + 1);
  }

  function reset() {
    setScreen("home"); setQuery(""); setDestKey(null);
    setPath([]); setSteps([]); setStepIdx(0); setMicOn(false); setLoadPct(0);
  }

  // HOME
  if (screen === "home") return (
    <Wrap>
      <div style={S.header}>
        <div style={S.badge}>🎓 VPPCOEVA · Mumbai</div>
        <h1 style={S.title}>Vasantdada Patil Pratishthan's<br />College of Engineering<br />and Visual Arts</h1>
        <div style={S.locChip}>
          <div style={S.bleDot} />
          <span style={{ fontSize: 12, color: "#BAC8FF" }}>YOU ARE AT  </span>
          <span style={{ fontSize: 13, color: "#fff", fontWeight: 700 }}>Main Entrance</span>
          <span style={{ fontSize: 11, fontFamily: "monospace", color: "#93C5FD", marginLeft: "auto" }}>(2,4)</span>
        </div>
      </div>

      <div style={S.card}>
        <div style={{ fontSize: 13, color: "#64748B", marginBottom: 8 }}>How may I assist you?</div>
        <div style={S.searchRow}>
          <span style={{ fontSize: 16 }}>🔍</span>
          <input value={query}
            onChange={e => { setQuery(e.target.value); setShowSug(true); }}
            onFocus={() => setShowSug(true)}
            onBlur={() => setTimeout(() => setShowSug(false), 160)}
            placeholder="Where do you want to go?"
            style={S.input} />
          <button onClick={() => setMicOn(m => !m)} style={{ ...S.mic, background: micOn ? "#EF4444" : "#4F6EF7", transform: micBig && micOn ? "scale(1.18)" : "scale(1)" }}>🎤</button>
        </div>
        {micOn && <div style={{ fontSize: 12, color: "#EF4444", marginTop: 6, textAlign: "center" }}>Listening… say a room name</div>}
        {showSug && filtered.length > 0 && (
          <div style={S.dropdown}>
            {filtered.map(d => {
              const st = ROOM_STYLE[LOCATIONS[d.key]?.type] || ROOM_STYLE.lab;
              return (
                <div key={d.key} style={S.dropItem} onMouseDown={() => startNav(d.key)}>
                  <span style={{ fontSize: 18 }}>{st.icon}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: "#1E293B" }}>{d.label}</div>
                    <div style={{ fontSize: 11, color: "#94A3B8" }}>({LOCATIONS[d.key].x},{LOCATIONS[d.key].y}) · {LOCATIONS[d.key].floor} Floor</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ padding: "0 14px 24px" }}>
        <Label>Quick Navigate</Label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {DEST_LIST.map(d => {
            const st = ROOM_STYLE[LOCATIONS[d.key]?.type] || ROOM_STYLE.lab;
            return (
              <button key={d.key} onClick={() => startNav(d.key)}
                style={{ ...S.chip, background: st.bg, border: `1px solid ${st.border}`, color: st.text }}>
                {st.icon} {d.label}
              </button>
            );
          })}
        </div>
      </div>
    </Wrap>
  );

  // SCANNING
  if (screen === "scanning") return (
    <Wrap center>
      <div style={S.scanBox}>
        <div style={S.scanRing}>
          {[0, 0.45, 0.9].map((d, i) => <div key={i} style={{ ...S.pulse, animationDelay: `${d}s` }} />)}
          <span style={{ fontSize: 28, position: "relative", zIndex: 2 }}>📡</span>
        </div>
        <div style={{ fontWeight: 700, fontSize: 16, color: "#1E293B", marginBottom: 4 }}>Calculating route…</div>
        <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 18 }}>Dijkstra running · Finding shortest path</div>
        <div style={S.track}><div style={{ ...S.fill, width: `${loadPct}%` }} /></div>
        <div style={{ fontSize: 11, color: "#4F6EF7", marginTop: 8, fontWeight: 600 }}>
          {loadPct < 40 ? "Detecting your position…" : loadPct < 80 ? "Finding shortest path…" : loadPct < 100 ? "Preparing instructions…" : "✓ Route ready!"}
        </div>
      </div>
    </Wrap>
  );

  // NAVIGATE
  if (screen === "navigate") {
    const step = steps[stepIdx] || {};
    const dest = LOCATIONS[destKey] || {};
    const pct = Math.round((stepIdx / steps.length) * 100);
    return (
      <Wrap>
        <div style={S.navBar}>
          <button onClick={reset} style={S.back}>‹</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: "#fff", lineHeight: 1 }}>{step.arrow}  {step.instruction}</div>
            <div style={{ fontSize: 13, color: "#BAC8FF", marginTop: 3 }}>towards {step.toRoom}</div>
          </div>
          <div style={S.gridTag}>{step.grid_to ? `(${step.grid_to.x},${step.grid_to.y})` : ""}</div>
        </div>
        <div style={{ background: "#E2E8F0", height: 3 }}>
          <div style={{ background: "#4F6EF7", height: 3, width: `${pct}%`, transition: "width .5s ease" }} />
        </div>
        <div style={{ padding: "10px 14px 0", flex: 1, minHeight: 0 }}>
          <Label>Campus Grid Map · Step {stepIdx + 1} of {steps.length}</Label>
          <GridMap path={path} activeNodeId={step.nodeId || path[0]} destKey={destKey} />
        </div>
        <div style={S.bottom}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <div><Label>Destination</Label><div style={{ fontWeight: 700, fontSize: 15, color: "#1E293B" }}>{dest.name}</div></div>
            <div style={{ textAlign: "right" }}><Label>ETA</Label><div style={{ fontSize: 13, color: "#4F6EF7", fontWeight: 700 }}>~{steps.length - stepIdx} min</div></div>
          </div>
          <div style={{ display: "flex", gap: 4, justifyContent: "center", marginBottom: 12 }}>
            {steps.map((_, i) => <div key={i} style={{ height: 6, borderRadius: 3, width: i === stepIdx ? 22 : 8, background: i <= stepIdx ? "#4F6EF7" : "#E2E8F0", transition: "all .3s" }} />)}
          </div>
          <button onClick={nextStep} style={S.btn}>{stepIdx >= steps.length - 1 ? "🏁  I have arrived" : "Next Step  →"}</button>
        </div>
      </Wrap>
    );
  }

  // ARRIVED
  if (screen === "arrived") {
    const dest = LOCATIONS[destKey] || {};
    const st = ROOM_STYLE[dest.type] || ROOM_STYLE.lab;
    return (
      <Wrap>
        <div style={{ ...S.navBar, background: "#15803D" }}>
          <button onClick={reset} style={S.back}>‹</button>
          <div><div style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>✓ You have arrived!</div>
          <div style={{ fontSize: 12, color: "#BBF7D0" }}>{dest.name}</div></div>
        </div>
        <div style={{ background: st.bg, borderBottom: `1px solid ${st.border}`, padding: "20px 16px" }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <div style={{ width: 54, height: 54, borderRadius: 12, background: st.dot, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>{st.icon}</div>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: st.text }}>{dest.name}</h2>
              <div style={{ fontSize: 11, color: st.text, opacity: 0.65, marginTop: 2 }}>{dest.floor} Floor · Grid ({dest.x},{dest.y})</div>
              <div style={{ display: "flex", gap: 5, marginTop: 8, flexWrap: "wrap" }}>
                {(dest.tags || []).map(t => <span key={t} style={{ background: st.border, color: st.text, fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 20 }}>{t}</span>)}
              </div>
            </div>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          <p style={{ color: "#334155", fontSize: 14, lineHeight: 1.65, margin: "0 0 16px" }}>{dest.desc}</p>
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E2E8F0", padding: "0 14px", marginBottom: 16 }}>
            {[["📍","Grid position",`(${dest.x}, ${dest.y})`],["🏢","Floor",`${dest.floor} Floor`],["♿","Accessibility","Wheelchair accessible"],["🔑","Access","Open to students"]].map(([icon,lbl,val]) => (
              <div key={lbl} style={{ display: "flex", gap: 10, padding: "9px 0", borderBottom: "1px solid #F1F5F9", alignItems: "center" }}>
                <span style={{ fontSize: 14 }}>{icon}</span>
                <span style={{ fontSize: 12, color: "#94A3B8", width: 110 }}>{lbl}</span>
                <span style={{ fontSize: 13, color: "#334155", fontWeight: 500 }}>{val}</span>
              </div>
            ))}
          </div>
          <Label>Route taken</Label>
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E2E8F0", padding: "12px 14px" }}>
            {steps.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "center" }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#4F6EF7", fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                <div style={{ fontSize: 13, color: "#475569", flex: 1 }}>{s.arrow} {s.instruction}</div>
                <div style={{ fontSize: 11, color: "#94A3B8", fontFamily: "monospace" }}>({s.grid_to.x},{s.grid_to.y})</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: "0 14px 22px" }}>
          <button onClick={reset} style={S.btn}>🧭  Navigate somewhere else</button>
        </div>
      </Wrap>
    );
  }
  return null;
}

// ─── GRID MAP ─────────────────────────────────────────────────────────────────
function GridMap({ path, activeNodeId, destKey }) {
  const CELL = 70, COLS = 6, ROWS = 5, PAD = 26;
  const W = COLS * CELL + PAD * 2, H = ROWS * CELL + PAD * 2;
  const cx = id => LOCATIONS[id] ? PAD + LOCATIONS[id].x * CELL : 0;
  const cy = id => LOCATIONS[id] ? PAD + LOCATIONS[id].y * CELL : 0;

  const pathSet = new Set();
  for (let i = 0; i < path.length - 1; i++) {
    pathSet.add(`${path[i]}|${path[i+1]}`); pathSet.add(`${path[i+1]}|${path[i]}`);
  }
  const drawn = new Set();
  const edges = Object.entries(GRAPH).flatMap(([from, nbrs]) =>
    Object.keys(nbrs).map(to => {
      const k = [from, to].sort().join("|");
      if (drawn.has(k) || !LOCATIONS[from] || !LOCATIONS[to]) return null;
      drawn.add(k);
      return <line key={k} x1={cx(from)} y1={cy(from)} x2={cx(to)} y2={cy(to)}
        stroke={pathSet.has(`${from}|${to}`) ? "#4F6EF7" : "#E2E8F0"}
        strokeWidth={pathSet.has(`${from}|${to}`) ? 5 : 1.5} strokeLinecap="round" />;
    }).filter(Boolean)
  );

  const nodes = Object.entries(LOCATIONS).map(([id, loc]) => {
    const isCurrent = id === activeNodeId;
    const isDest = id === destKey;
    const inPath = path.includes(id);
    const st = ROOM_STYLE[loc.type] || ROOM_STYLE.lab;
    if (loc.type === "corridor") return (
      <circle key={id} cx={cx(id)} cy={cy(id)} r={5}
        fill={inPath ? "#BFDBFE" : "#F1F5F9"}
        stroke={inPath ? "#4F6EF7" : "#CBD5E1"} strokeWidth={1.5} />
    );
    return (
      <g key={id}>
        {(isCurrent || isDest) && <circle cx={cx(id)} cy={cy(id)} r={24} fill={isDest ? "#FEE2E2" : "#DBEAFE"} opacity={0.5} />}
        <rect x={cx(id)-24} y={cy(id)-18} width={48} height={36} rx={6}
          fill={isDest ? "#FEE2E2" : inPath ? "#DBEAFE" : st.bg}
          stroke={isDest ? "#EF4444" : isCurrent ? "#4F6EF7" : st.border}
          strokeWidth={isDest || isCurrent ? 2 : 1} />
        <text x={cx(id)} y={cy(id)-4} textAnchor="middle" fontSize="9" fontWeight="700" fontFamily="sans-serif"
          fill={isDest ? "#991B1B" : isCurrent ? "#1D4ED8" : st.text}>
          {loc.name.replace("Principal's ","").replace(" Hall","").replace(" Corridor","").slice(0,9)}
        </text>
        <text x={cx(id)} y={cy(id)+7} textAnchor="middle" fontSize="8" fontFamily="monospace"
          fill={isDest ? "#DC2626" : isCurrent ? "#3B82F6" : "#94A3B8"}>({loc.x},{loc.y})</text>
        {isCurrent && <text x={cx(id)} y={cy(id)-28} textAnchor="middle" fontSize="9" fontWeight="700" fontFamily="sans-serif" fill="#2563EB">● YOU</text>}
        {isDest && !isCurrent && <text x={cx(id)} y={cy(id)-28} textAnchor="middle" fontSize="9" fontWeight="700" fontFamily="sans-serif" fill="#DC2626">● DEST</text>}
      </g>
    );
  });

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}
      style={{ background: "#F8FAFC", borderRadius: 12, border: "1px solid #E2E8F0", display: "block" }}>
      {Array.from({length:ROWS},(_,r)=>Array.from({length:COLS},(_,c)=>(
        <circle key={`${c}-${r}`} cx={PAD+c*CELL} cy={PAD+r*CELL} r={2} fill="#E2E8F0"/>
      )))}
      {Array.from({length:COLS},(_,i)=>(
        <text key={`x${i}`} x={PAD+i*CELL} y={14} textAnchor="middle" fontSize="9" fontFamily="monospace" fill="#CBD5E1">x={i}</text>
      ))}
      {Array.from({length:ROWS},(_,i)=>(
        <text key={`y${i}`} x={12} y={PAD+i*CELL+3} textAnchor="middle" fontSize="9" fontFamily="monospace" fill="#CBD5E1">y={i}</text>
      ))}
      {edges}{nodes}
    </svg>
  );
}

// ─── TINY HELPERS ─────────────────────────────────────────────────────────────
function Wrap({ children, center }) {
  return (
    <div style={{ fontFamily:"'DM Sans','Segoe UI',sans-serif", maxWidth:420, minHeight:"100vh", margin:"0 auto", background:"#F8FAFC", display:"flex", flexDirection:"column", ...(center ? { alignItems:"center", justifyContent:"center" } : {}) }}>
      {children}
    </div>
  );
}
function Label({ children }) {
  return <div style={{ fontSize:11, color:"#94A3B8", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>{children}</div>;
}

const S = {
  header: { background:"linear-gradient(145deg,#1E3A8A 0%,#3B5FCC 60%,#6D28D9 100%)", padding:"26px 18px 20px" },
  badge: { display:"inline-block", background:"rgba(255,255,255,0.15)", borderRadius:20, padding:"3px 12px", fontSize:11, fontWeight:700, color:"#BAC8FF", marginBottom:10, letterSpacing:"0.04em" },
  title: { margin:0, fontSize:17, fontWeight:800, lineHeight:1.4, color:"#fff" },
  locChip: { display:"flex", alignItems:"center", gap:8, marginTop:13, background:"rgba(255,255,255,0.12)", borderRadius:10, padding:"7px 12px", border:"1px solid rgba(255,255,255,0.15)" },
  bleDot: { width:8, height:8, borderRadius:"50%", background:"#22C55E", boxShadow:"0 0 0 3px rgba(34,197,94,0.25)", flexShrink:0 },
  card: { background:"#fff", margin:"13px 14px 10px", padding:"15px", borderRadius:14, border:"1px solid #E2E8F0", position:"relative" },
  searchRow: { display:"flex", alignItems:"center", background:"#F8FAFC", border:"1.5px solid #C7D2FE", borderRadius:10, padding:"7px 10px", gap:6 },
  input: { flex:1, border:"none", background:"transparent", fontSize:14, outline:"none", color:"#1E293B", fontFamily:"inherit" },
  mic: { width:32, height:32, borderRadius:"50%", border:"none", fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all .2s ease" },
  dropdown: { position:"absolute", left:0, right:0, top:"100%", background:"#fff", border:"1px solid #E2E8F0", borderTop:"none", borderRadius:"0 0 14px 14px", zIndex:100, boxShadow:"0 8px 24px rgba(0,0,0,0.08)", overflow:"hidden" },
  dropItem: { display:"flex", alignItems:"center", gap:10, padding:"9px 16px", cursor:"pointer", borderBottom:"1px solid #F1F5F9" },
  chip: { borderRadius:20, padding:"6px 12px", fontSize:12, cursor:"pointer", fontFamily:"inherit", fontWeight:600 },
  scanBox: { background:"#fff", borderRadius:20, padding:"34px 26px", textAlign:"center", border:"1px solid #E2E8F0", width:"78%" },
  scanRing: { width:70, height:70, borderRadius:"50%", background:"#EEF2FF", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 18px", position:"relative" },
  pulse: { position:"absolute", width:70, height:70, borderRadius:"50%", border:"2px solid #4F6EF7", animation:"pulse 1.6s ease-out infinite", opacity:0 },
  track: { height:6, background:"#EEF2FF", borderRadius:3, overflow:"hidden" },
  fill: { height:"100%", background:"linear-gradient(90deg,#4F6EF7,#7C3AED)", borderRadius:3, transition:"width .18s ease" },
  navBar: { background:"linear-gradient(135deg,#1E3A8A,#4F6EF7)", padding:"16px 14px", display:"flex", alignItems:"center", gap:10, flexShrink:0 },
  back: { background:"rgba(255,255,255,0.18)", border:"none", color:"#fff", fontSize:22, width:34, height:34, borderRadius:8, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"inherit", flexShrink:0 },
  gridTag: { background:"rgba(255,255,255,0.2)", borderRadius:8, padding:"4px 8px", color:"#fff", fontWeight:700, fontSize:13, fontFamily:"monospace", flexShrink:0 },
  bottom: { background:"#fff", borderTop:"1px solid #E2E8F0", padding:"12px 14px", flexShrink:0 },
  btn: { width:"100%", background:"linear-gradient(135deg,#4F6EF7,#6D28D9)", border:"none", borderRadius:12, color:"#fff", fontSize:15, fontWeight:700, padding:"13px", cursor:"pointer", fontFamily:"inherit" },
};

const _s = document.createElement("style");
_s.textContent = `@keyframes pulse{0%{transform:scale(1);opacity:.6}100%{transform:scale(2.4);opacity:0}}@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800;900&display=swap');*{box-sizing:border-box}body{margin:0}`;
if (!document.head.querySelector("[data-cn]")) { _s.setAttribute("data-cn","1"); document.head.appendChild(_s); }
