import { useState, useEffect } from "react";

const API = "http://localhost:8000";

const C = {
  bg: "#0a0e1a", surface: "#0f1629", card: "#131d35", cardHover: "#1a2540",
  border: "#1e2d4a", borderBright: "#2a3f6a", accent: "#00d4ff", accentDim: "#0099bb",
  green: "#00ff88", greenDim: "#00cc6a", red: "#ff3d5a", orange: "#ff8c00",
  yellow: "#ffd700", purple: "#a855f7", textPrimary: "#e8f0fe",
  textSecondary: "#7a8fb5", textMuted: "#4a5a7a",
};
const SEV = { HIGH: "#ff3d5a", MEDIUM: "#ff8c00", LOW: "#ffd700", CRITICAL: "#ff0040" };

const G = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Rajdhani:wght@600;700&family=Inter:wght@300;400;500;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#0a0e1a;color:#e8f0fe;font-family:'Inter',sans-serif}
  ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:#0f1629}::-webkit-scrollbar-thumb{background:#2a3f6a;border-radius:3px}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
  @keyframes slideIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
  @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
  .card{background:#131d35;border:1px solid #1e2d4a;border-radius:12px;padding:24px;transition:border-color .2s}
  .card:hover{border-color:#2a3f6a}
  .ai{animation:slideIn .4s ease forwards}
`;

function injectStyle() {
  if (!document.getElementById("sops")) {
    const s = document.createElement("style"); s.id = "sops"; s.textContent = G; document.head.appendChild(s);
  }
}

function Badge({ level }) {
  const c = SEV[level?.toUpperCase()] || C.textMuted;
  return <span style={{ background: c + "22", color: c, border: `1px solid ${c}55`, borderRadius: 4, padding: "2px 8px", fontSize: 10, fontWeight: 700, fontFamily: "JetBrains Mono" }}>{level}</span>;
}

function RiskGauge({ score }) {
  const color = score >= 70 ? C.red : score >= 40 ? C.orange : C.green;
  const r = 48, cx = 60, cy = 60, circ = Math.PI * r;
  return (
    <div style={{ textAlign: "center" }}>
      <svg width="120" height="78" viewBox="0 0 120 78">
        <path d={`M 12 60 A 48 48 0 0 1 108 60`} fill="none" stroke="#1e2d4a" strokeWidth="9" strokeLinecap="round" />
        <path d={`M 12 60 A 48 48 0 0 1 108 60`} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={`${(score / 100) * circ} ${circ}`} style={{ filter: `drop-shadow(0 0 5px ${color})` }} />
        <text x="60" y="55" textAnchor="middle" fontSize="20" fontWeight="700" fill={color} fontFamily="JetBrains Mono">{score}</text>
        <text x="60" y="68" textAnchor="middle" fontSize="8" fill="#4a5a7a" fontFamily="Inter">RISK</text>
      </svg>
    </div>
  );
}

function StatCard({ label, value, color, icon }) {
  return (
    <div className="card" style={{ flex: 1, minWidth: 130, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: color }} />
      <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color, fontFamily: "JetBrains Mono", textShadow: `0 0 15px ${color}50` }}>{value}</div>
      <div style={{ fontSize: 11, color: C.textSecondary, marginTop: 3, fontWeight: 500 }}>{label}</div>
    </div>
  );
}

function SeverityBar({ vulns }) {
  const counts = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  vulns.forEach(v => { const s = (v.issue_severity || v.severity || "LOW").toUpperCase(); if (counts[s] !== undefined) counts[s]++; });
  const total = vulns.length || 1;
  return (
    <div>
      <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 10, fontWeight: 700, letterSpacing: 1 }}>SEVERITY BREAKDOWN</div>
      {Object.entries(counts).map(([sev, cnt]) => (
        <div key={sev} style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
            <span style={{ fontSize: 10, color: SEV[sev], fontFamily: "JetBrains Mono", fontWeight: 700 }}>{sev}</span>
            <span style={{ fontSize: 10, color: C.textMuted, fontFamily: "JetBrains Mono" }}>{cnt}</span>
          </div>
          <div style={{ background: C.border, borderRadius: 4, height: 5 }}>
            <div style={{ width: `${(cnt / total) * 100}%`, height: "100%", background: SEV[sev], borderRadius: 4, boxShadow: `0 0 6px ${SEV[sev]}80`, transition: "width .8s ease" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ vulns }) {
  const counts = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  vulns.forEach(v => { const s = (v.issue_severity || v.severity || "LOW").toUpperCase(); if (counts[s] !== undefined) counts[s]++; });
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  const colors = [C.red, C.orange, C.yellow];
  const labels = Object.keys(counts), values = Object.values(counts);
  let cum = 0;
  const segs = values.map((v, i) => { const p = v / total, s = cum; cum += p; return { p, s, color: colors[i], label: labels[i], v }; });
  const r = 36, cx = 50, cy = 50, circ = 2 * Math.PI * r;
  return (
    <div>
      <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 10, fontWeight: 700, letterSpacing: 1 }}>DISTRIBUTION</div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <svg width="100" height="100" viewBox="0 0 100 100">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.border} strokeWidth="12" />
          {segs.map((seg, i) => seg.p > 0 && (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color} strokeWidth="12"
              strokeDasharray={`${seg.p * circ} ${circ}`} strokeDashoffset={-seg.s * circ}
              transform={`rotate(-90 ${cx} ${cy})`} style={{ filter: `drop-shadow(0 0 3px ${seg.color}80)` }} />
          ))}
          <text x={cx} y={cy + 5} textAnchor="middle" fontSize="14" fontWeight="700" fill={C.textPrimary} fontFamily="JetBrains Mono">{total}</text>
        </svg>
        <div>
          {segs.map((seg, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: seg.color, boxShadow: `0 0 5px ${seg.color}` }} />
              <span style={{ fontSize: 11, color: C.textSecondary }}>{seg.label}</span>
              <span style={{ fontSize: 11, color: seg.color, fontFamily: "JetBrains Mono", marginLeft: "auto", fontWeight: 700 }}>{seg.v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function generatePDF(scanResult) {
  if (!window.jspdf) { alert("PDF library loading, try again in a moment."); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210, H = 297, margin = 18;
  let y = 0;
  const rgb = h => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
  const fill = h => doc.setFillColor(...rgb(h));
  const draw = h => doc.setDrawColor(...rgb(h));
  const txt = h => doc.setTextColor(...rgb(h));
  const rect = (x, ry, w, h, col, rad=3) => { fill(col); doc.roundedRect(x, ry, w, h, rad, rad, "F"); };
  const newPage = () => { doc.addPage(); fill("#0a0e1a"); doc.rect(0,0,W,H,"F"); fill("#00d4ff"); doc.rect(0,0,W,1.5,"F"); y=22; };
  const checkY = (n=20) => { if (y+n > H-18) newPage(); };

  fill("#0a0e1a"); doc.rect(0,0,W,H,"F");
  fill("#00d4ff"); doc.rect(0,0,W,2,"F");
  fill("#0f1629"); doc.roundedRect(margin,30,W-margin*2,90,8,8,"F");
  draw("#00d4ff"); doc.setLineWidth(.5); doc.roundedRect(margin,30,W-margin*2,90,8,8,"S");
  fill("#00d4ff"); doc.rect(margin,30,3,90,"F");
  txt("#00d4ff"); doc.setFont("helvetica","bold"); doc.setFontSize(30);
  doc.text("SECUREOPSAI", W/2, 62, {align:"center"});
  txt("#7a8fb5"); doc.setFontSize(9); doc.setFont("helvetica","normal");
  doc.text("DEVSECOPS SECURITY AUTOMATION PLATFORM", W/2, 71, {align:"center"});
  fill("#00d4ff"); doc.rect(W/2-25,76,50,0.8,"F");
  txt("#e8f0fe"); doc.setFontSize(13); doc.setFont("helvetica","bold");
  doc.text("SECURITY VULNERABILITY REPORT", W/2, 88, {align:"center"});
  txt("#7a8fb5"); doc.setFontSize(8); doc.setFont("helvetica","normal");
  doc.text(`Generated: ${new Date(scanResult.timestamp).toLocaleString()}`, W/2, 97, {align:"center"});
  const dec = scanResult.policy_decision.decision;
  const dc = dec==="BLOCK"?"#ff3d5a":"#00ff88";
  rect(W/2-22,112,44,14,dc+"22",4);
  draw(dc); doc.setLineWidth(.5); doc.roundedRect(W/2-22,112,44,14,4,4,"S");
  txt(dc); doc.setFont("helvetica","bold"); doc.setFontSize(13);
  doc.text(dec, W/2, 122, {align:"center"});
  const info=[["FILE",scanResult.filename.substring(0,30)],["RISK SCORE",`${scanResult.risk_score}/100`],["VULNERABILITIES",`${scanResult.vulnerability_count}`],["SCAN TYPE",scanResult.scan_type.toUpperCase()]];
  const bw=(W-margin*2-8)/2;
  info.forEach((item,i)=>{
    const bx=margin+(i%2)*(bw+8),by=140+Math.floor(i/2)*22;
    rect(bx,by,bw,16,"#131d35",3);
    draw("#1e2d4a"); doc.setLineWidth(.2); doc.roundedRect(bx,by,bw,16,3,3,"S");
    txt("#7a8fb5"); doc.setFont("helvetica","normal"); doc.setFontSize(6.5); doc.text(item[0],bx+5,by+6);
    txt("#e8f0fe"); doc.setFont("helvetica","bold"); doc.setFontSize(8.5); doc.text(item[1],bx+5,by+13);
  });
  fill("#131d35"); doc.rect(0,H-24,W,24,"F");
  fill("#00d4ff"); doc.rect(0,H-24,W,.5,"F");
  txt("#4a5a7a"); doc.setFont("helvetica","normal"); doc.setFontSize(7);
  doc.text("Tula's Institute Dehradun  |  B.Tech Final Year Project  |  Abhimanyu • Ankit • Prabha • Prabhat", W/2, H-10, {align:"center"});

  newPage();
  rect(margin,y,W-margin*2,13,"#0f1629",4);
  draw("#00d4ff"); doc.setLineWidth(.4); doc.roundedRect(margin,y,W-margin*2,13,4,4,"S");
  fill("#00d4ff"); doc.rect(margin,y,3,13,"F");
  txt("#00d4ff"); doc.setFont("helvetica","bold"); doc.setFontSize(10);
  doc.text("VULNERABILITY FINDINGS", margin+7, y+9);
  y+=20;
  const sc={HIGH:0,MEDIUM:0,LOW:0};
  scanResult.vulnerabilities.forEach(v=>{const s=(v.issue_severity||v.severity||"LOW").toUpperCase();if(sc[s]!==undefined)sc[s]++;});
  const scols={HIGH:"#ff3d5a",MEDIUM:"#ff8c00",LOW:"#ffd700"};
  const sw=(W-margin*2-6)/3;
  Object.entries(sc).forEach(([sev,cnt],i)=>{
    const sx=margin+i*(sw+3);
    rect(sx,y,sw,18,scols[sev]+"15",3);
    draw(scols[sev]); doc.setLineWidth(.3); doc.roundedRect(sx,y,sw,18,3,3,"S");
    txt(scols[sev]); doc.setFontSize(14); doc.setFont("helvetica","bold");
    doc.text(String(cnt),sx+sw/2,y+10,{align:"center"});
    txt("#7a8fb5"); doc.setFontSize(6.5); doc.setFont("helvetica","normal");
    doc.text(sev,sx+sw/2,y+16,{align:"center"});
  });
  y+=26;
  if(scanResult.vulnerabilities.length===0){
    rect(margin,y,W-margin*2,16,"#00ff8815",4);
    txt("#00ff88"); doc.setFont("helvetica","bold"); doc.setFontSize(10);
    doc.text("No vulnerabilities detected",W/2,y+10,{align:"center"});
    y+=24;
  } else {
    scanResult.vulnerabilities.forEach((v,idx)=>{
      checkY(36);
      const sc=scols[(v.issue_severity||v.severity||"LOW").toUpperCase()]||"#7a8fb5";
      rect(margin,y,W-margin*2,30,"#0f1629",3);
      draw(sc); doc.setLineWidth(.35); doc.roundedRect(margin,y,W-margin*2,30,3,3,"S");
      fill(sc); doc.rect(margin,y,2.5,30,"F");
      txt("#e8f0fe"); doc.setFontSize(8.5); doc.setFont("helvetica","bold");
      doc.text((v.test_name||v.package||"Vulnerability").substring(0,50),margin+7,y+10);
      rect(W-margin-18,y+4,16,7,sc+"22",2);
      txt(sc); doc.setFontSize(6.5);
      doc.text((v.issue_severity||v.severity||"LOW").toUpperCase(),W-margin-10,y+9,{align:"center"});
      txt("#7a8fb5"); doc.setFont("helvetica","normal"); doc.setFontSize(7.5);
      doc.text((v.issue_text||v.description||"").substring(0,95),margin+7,y+19);
      if(v.filename){txt("#4a5a7a");doc.setFontSize(6.5);doc.text(`${v.filename.split(/[\\/]/).pop()} : Line ${v.line_number||"-"}`,margin+7,y+26);}
      if(v.cve_id){txt("#4a5a7a");doc.setFontSize(6.5);doc.text(`CVE: ${v.cve_id}`,margin+7,y+26);}
      y+=36;
    });
  }

  newPage();
  rect(margin,y,W-margin*2,13,"#0f1629",4);
  draw("#a855f7"); doc.setLineWidth(.4); doc.roundedRect(margin,y,W-margin*2,13,4,4,"S");
  fill("#a855f7"); doc.rect(margin,y,3,13,"F");
  txt("#a855f7"); doc.setFont("helvetica","bold"); doc.setFontSize(10);
  doc.text("AI SECURITY ANALYSIS",margin+7,y+9);
  txt("#7a8fb5"); doc.setFontSize(7.5); doc.setFont("helvetica","normal");
  doc.text("Powered by Groq LLM",W-margin-2,y+9,{align:"right"});
  y+=20;
  const lines=doc.splitTextToSize(scanResult.ai_analysis||"No AI analysis available.",W-margin*2-12);
  lines.forEach(line=>{
    checkY(6);
    const bold=/^\d+\./.test(line)||line.startsWith("**");
    txt(bold?"#e8f0fe":"#7a8fb5");
    doc.setFont("helvetica",bold?"bold":"normal"); doc.setFontSize(8);
    doc.text(line.replace(/\*\*/g,"").replace(/^#+\s/,""),margin+5,y);
    y+=5;
  });
  fill("#131d35"); doc.rect(0,H-18,W,18,"F");
  fill("#00d4ff"); doc.rect(0,H-18,W,.5,"F");
  txt("#4a5a7a"); doc.setFontSize(7);
  doc.text(`SecureOpsAI Confidential Report  |  ${new Date().toLocaleDateString()}`,W/2,H-7,{align:"center"});
  doc.save(`SecureOpsAI_${scanResult.filename}_${Date.now()}.pdf`);
}

export default function App() {
  injectStyle();
  const [tab, setTab] = useState("dashboard");
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [scanResult, setScanResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [policy, setPolicy] = useState({ max_risk_score: 70, block_on_critical: true });
  const [selectedScan, setSelectedScan] = useState(null);

  useEffect(() => {
    if (!window.jspdf) {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      document.head.appendChild(s);
    }
    fetchAll();
  }, []);

  const fetchAll = () => {
    fetch(`${API}/stats`).then(r=>r.json()).then(setStats).catch(()=>{});
    fetch(`${API}/history`).then(r=>r.json()).then(d=>setHistory(d.scans||[])).catch(()=>{});
    fetch(`${API}/policy`).then(r=>r.json()).then(setPolicy).catch(()=>{});
  };

  const handleScan = async (type) => {
    const input = document.getElementById(`file-${type}`);
    if (!input?.files?.[0]) return alert("Please select a file first.");
    setScanning(true); setScanResult(null);
    const form = new FormData(); form.append("file", input.files[0]);
    try {
      const res = await fetch(`${API}/scan/${type}`, { method: "POST", body: form });
      const data = await res.json();
      setScanResult(data); fetchAll();
    } catch { alert("Scan failed. Is the backend running?"); }
    finally { setScanning(false); }
  };

  const nav = [["dashboard","⬡","Dashboard"],["scan","⟁","Scan"],["history","◷","History"],["policy","⚙","Policy"]];

  return (
    <div style={{ minHeight:"100vh", background:C.bg }}>
      <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, padding:"0 32px", display:"flex", alignItems:"center", gap:20, position:"sticky", top:0, zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 0" }}>
          <div style={{ width:36, height:36, background:`linear-gradient(135deg,${C.accent},${C.purple})`, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, boxShadow:`0 0 18px ${C.accent}40` }}>🛡️</div>
          <div>
            <div style={{ fontSize:18, fontWeight:700, fontFamily:"Rajdhani", letterSpacing:2, color:C.textPrimary }}>SECUREOPS<span style={{color:C.accent}}>AI</span></div>
            <div style={{ fontSize:8, color:C.textMuted, letterSpacing:1.5 }}>DEVSECOPS AUTOMATION</div>
          </div>
        </div>
        <div style={{ marginLeft:"auto", display:"flex", gap:4 }}>
          {nav.map(([id,icon,label]) => (
            <button key={id} onClick={()=>setTab(id)} style={{ padding:"8px 18px", border:"none", borderRadius:6, cursor:"pointer", fontWeight:600, fontSize:13, background:tab===id?`${C.accent}20`:"transparent", color:tab===id?C.accent:C.textSecondary, borderBottom:tab===id?`2px solid ${C.accent}`:"2px solid transparent", transition:"all .2s" }}>{icon} {label}</button>
          ))}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <div style={{ width:7, height:7, borderRadius:"50%", background:C.green, boxShadow:`0 0 8px ${C.green}`, animation:"pulse 2s infinite" }} />
          <span style={{ fontSize:10, color:C.textMuted }}>ONLINE</span>
        </div>
      </div>

      <div style={{ padding:"28px 32px", maxWidth:1200, margin:"0 auto" }}>

        {tab==="dashboard" && (
          <div className="ai">
            <div style={{ marginBottom:22 }}>
              <h2 style={{ fontSize:22, fontWeight:700, fontFamily:"Rajdhani", letterSpacing:1 }}>THREAT OVERVIEW</h2>
              <div style={{ fontSize:12, color:C.textMuted }}>Real-time security intelligence</div>
            </div>
            {stats ? (
              <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:24 }}>
                <StatCard label="Total Scans" value={stats.total_scans} color={C.accent} icon="⬡" />
                <StatCard label="Blocked Builds" value={stats.blocked_builds} color={C.red} icon="🚫" />
                <StatCard label="Allowed Builds" value={stats.allowed_builds} color={C.green} icon="✓" />
                <StatCard label="Vulnerabilities" value={stats.total_vulnerabilities} color={C.orange} icon="⚠" />
                <StatCard label="Avg Risk Score" value={stats.average_risk_score} color={C.purple} icon="◎" />
              </div>
            ) : (
              <div className="card" style={{ marginBottom:24, textAlign:"center", padding:40, color:C.textMuted }}>
                <div style={{ fontSize:32, marginBottom:12 }}>🛡️</div>No scan data yet. Run your first scan!
              </div>
            )}
            <div className="card">
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <div style={{ fontSize:11, fontWeight:700, color:C.textMuted, letterSpacing:1.5 }}>RECENT SCANS</div>
                <div style={{ fontSize:11, color:C.textMuted }}>{history.length} total</div>
              </div>
              {history.length===0 ? (
                <div style={{ textAlign:"center", padding:32, color:C.textMuted }}>No scans yet. Go to <b style={{color:C.accent}}>Scan</b> tab.</div>
              ) : (
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead>
                    <tr>{["File","Type","Vulns","Risk","Decision","Time"].map(h=>(
                      <th key={h} style={{ textAlign:"left", padding:"8px 10px", fontSize:9, color:C.textMuted, fontWeight:700, letterSpacing:1.5, borderBottom:`1px solid ${C.border}` }}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {history.slice(0,8).map(s=>(
                      <tr key={s.scan_id} onClick={()=>{setSelectedScan(s);setTab("history");}} style={{ cursor:"pointer" }}
                        onMouseEnter={e=>e.currentTarget.style.background=C.cardHover}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        <td style={{ padding:"11px 10px", fontSize:11, color:C.textPrimary, fontFamily:"JetBrains Mono", borderBottom:`1px solid ${C.border}30` }}>{s.filename}</td>
                        <td style={{ padding:"11px 10px", borderBottom:`1px solid ${C.border}30` }}><span style={{ fontSize:9, color:C.accent, background:`${C.accent}15`, padding:"2px 7px", borderRadius:3, fontWeight:700 }}>{s.scan_type.toUpperCase()}</span></td>
                        <td style={{ padding:"11px 10px", fontSize:13, color:s.vulnerability_count>0?C.orange:C.green, fontFamily:"JetBrains Mono", fontWeight:700, borderBottom:`1px solid ${C.border}30` }}>{s.vulnerability_count}</td>
                        <td style={{ padding:"11px 10px", borderBottom:`1px solid ${C.border}30` }}><RiskGauge score={s.risk_score}/></td>
                        <td style={{ padding:"11px 10px", borderBottom:`1px solid ${C.border}30` }}>
                          <span style={{ background:s.policy_decision.decision==="BLOCK"?`${C.red}22`:`${C.green}22`, color:s.policy_decision.decision==="BLOCK"?C.red:C.green, border:`1px solid ${s.policy_decision.decision==="BLOCK"?C.red:C.green}44`, borderRadius:4, padding:"2px 8px", fontSize:9, fontWeight:700, fontFamily:"JetBrains Mono" }}>{s.policy_decision.decision}</span>
                        </td>
                        <td style={{ padding:"11px 10px", fontSize:10, color:C.textMuted, fontFamily:"JetBrains Mono", borderBottom:`1px solid ${C.border}30` }}>{new Date(s.timestamp).toLocaleTimeString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {tab==="scan" && (
          <div className="ai">
            <div style={{ marginBottom:22 }}>
              <h2 style={{ fontSize:22, fontWeight:700, fontFamily:"Rajdhani", letterSpacing:1 }}>SECURITY SCANNER</h2>
              <div style={{ fontSize:12, color:C.textMuted }}>Upload files to detect vulnerabilities</div>
            </div>
            <div style={{ display:"flex", gap:16, flexWrap:"wrap", marginBottom:24 }}>
              {[
                { type:"code", icon:"🐍", title:"CODE VULNERABILITY SCANNER", desc:"Python (.py) → Bandit SAST + Groq AI", color:C.accent, accept:".py", hint:"Choose .py file" },
                { type:"dependencies", icon:"📦", title:"DEPENDENCY SCANNER", desc:"requirements.txt → CVE database check", color:C.orange, accept:".txt", hint:"Choose requirements.txt" }
              ].map(sc=>(
                <div key={sc.type} className="card" style={{ flex:1, minWidth:270, position:"relative", overflow:"hidden" }}>
                  <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:sc.color }} />
                  <div style={{ fontSize:22, marginBottom:10 }}>{sc.icon}</div>
                  <div style={{ fontSize:14, fontWeight:700, fontFamily:"Rajdhani", color:C.textPrimary, letterSpacing:1, marginBottom:5 }}>{sc.title}</div>
                  <div style={{ fontSize:12, color:C.textMuted, marginBottom:16 }}>{sc.desc}</div>
                  <label style={{ display:"block", border:`1px dashed ${C.borderBright}`, borderRadius:8, padding:"14px", textAlign:"center", cursor:"pointer", marginBottom:12, color:C.textMuted, fontSize:12, transition:"all .2s" }}
                    onMouseEnter={e=>{e.target.style.borderColor=sc.color;e.target.style.background=sc.color+"0a";}}
                    onMouseLeave={e=>{e.target.style.borderColor=C.borderBright;e.target.style.background="transparent";}}>
                    <input id={`file-${sc.type}`} type="file" accept={sc.accept} style={{ display:"none" }}
                      onChange={e=>e.target.parentElement.querySelector("span").textContent=e.target.files[0]?.name||sc.hint}/>
                    <span>{sc.hint}</span>
                  </label>
                  <button onClick={()=>handleScan(sc.type)} disabled={scanning} style={{ background:scanning?C.border:sc.color, color:scanning?C.textMuted:"#0a0e1a", border:"none", borderRadius:8, padding:"11px 20px", fontWeight:700, cursor:scanning?"not-allowed":"pointer", width:"100%", fontSize:12, letterSpacing:1, boxShadow:scanning?"none":`0 4px 16px ${sc.color}40` }}>{scanning?"⟳ SCANNING...":"▶ RUN SCAN"}</button>
                </div>
              ))}
            </div>

            {scanResult && (
              <div className="card ai" style={{ position:"relative", overflow:"hidden" }}>
                <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:scanResult.policy_decision.decision==="BLOCK"?`linear-gradient(90deg,${C.red},${C.orange})`:`linear-gradient(90deg,${C.green},${C.accent})` }} />
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24, flexWrap:"wrap", gap:16 }}>
                  <div>
                    <div style={{ fontSize:18, fontWeight:700, fontFamily:"Rajdhani", letterSpacing:1 }}>SCAN RESULTS</div>
                    <div style={{ fontSize:12, color:C.accent, fontFamily:"JetBrains Mono", marginTop:4 }}>{scanResult.filename}</div>
                    <div style={{ fontSize:10, color:C.textMuted, marginTop:2 }}>{new Date(scanResult.timestamp).toLocaleString()}</div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
                    <RiskGauge score={scanResult.risk_score}/>
                    <div style={{ background:scanResult.policy_decision.decision==="BLOCK"?`${C.red}22`:`${C.green}22`, border:`1px solid ${scanResult.policy_decision.decision==="BLOCK"?C.red:C.green}`, borderRadius:10, padding:"14px 20px", textAlign:"center", boxShadow:`0 0 18px ${scanResult.policy_decision.decision==="BLOCK"?C.red:C.green}40` }}>
                      <div style={{ fontSize:24, fontWeight:900, fontFamily:"Rajdhani", color:scanResult.policy_decision.decision==="BLOCK"?C.red:C.green, letterSpacing:2 }}>{scanResult.policy_decision.decision}</div>
                      <div style={{ fontSize:9, color:C.textMuted, marginTop:2 }}>{scanResult.policy_decision.reason}</div>
                    </div>
                    <button onClick={()=>generatePDF(scanResult)} style={{ background:`linear-gradient(135deg,${C.purple},#7c3aed)`, color:"#fff", border:"none", borderRadius:8, padding:"12px 16px", fontWeight:700, cursor:"pointer", fontSize:11, letterSpacing:1, boxShadow:`0 4px 16px ${C.purple}40` }}>⬇ PDF REPORT</button>
                  </div>
                </div>
                {scanResult.vulnerabilities.length>0 && (
                  <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
                    <div style={{ flex:1, minWidth:180, background:C.surface, borderRadius:8, padding:16, border:`1px solid ${C.border}` }}><SeverityBar vulns={scanResult.vulnerabilities}/></div>
                    <div style={{ flex:1, minWidth:180, background:C.surface, borderRadius:8, padding:16, border:`1px solid ${C.border}` }}><DonutChart vulns={scanResult.vulnerabilities}/></div>
                  </div>
                )}
                {scanResult.vulnerabilities.length===0 ? (
                  <div style={{ background:`${C.green}15`, border:`1px solid ${C.green}44`, borderRadius:8, padding:18, textAlign:"center", color:C.green, fontWeight:700, marginBottom:16 }}>✓ No vulnerabilities detected</div>
                ) : (
                  <div style={{ marginBottom:20 }}>
                    <div style={{ fontSize:10, color:C.textMuted, fontWeight:700, letterSpacing:1.5, marginBottom:10 }}>VULNERABILITIES ({scanResult.vulnerability_count})</div>
                    {scanResult.vulnerabilities.map((v,i)=>{
                      const sev=(v.issue_severity||v.severity||"LOW").toUpperCase(), sc=SEV[sev]||C.textMuted;
                      return (
                        <div key={i} style={{ background:C.surface, border:`1px solid ${C.border}`, borderLeft:`3px solid ${sc}`, borderRadius:"0 8px 8px 0", padding:"12px 16px", marginBottom:7 }}>
                          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                            <span style={{ fontSize:12, fontWeight:700, color:C.textPrimary }}>{v.test_name||v.package||"Vulnerability"}</span>
                            <Badge level={sev}/>
                          </div>
                          <div style={{ fontSize:12, color:C.textSecondary }}>{v.issue_text||v.description||""}</div>
                          {v.filename && <div style={{ fontSize:10, color:C.textMuted, marginTop:5, fontFamily:"JetBrains Mono" }}>📄 {v.filename.split(/[\\/]/).pop()} — Line {v.line_number}</div>}
                          {v.cve_id && <div style={{ fontSize:10, color:C.textMuted, marginTop:4, fontFamily:"JetBrains Mono" }}>CVE: {v.cve_id}</div>}
                        </div>
                      );
                    })}
                  </div>
                )}
                {scanResult.ai_analysis && (
                  <div>
                    <div style={{ fontSize:10, color:C.purple, fontWeight:700, letterSpacing:1.5, marginBottom:10, display:"flex", alignItems:"center", gap:8 }}>
                      🤖 AI SECURITY ANALYSIS <span style={{ fontSize:9, color:C.textMuted, fontWeight:400 }}>— Groq LLM</span>
                    </div>
                    <div style={{ background:C.surface, border:`1px solid ${C.purple}33`, borderRadius:8, padding:18, fontSize:12, color:C.textSecondary, whiteSpace:"pre-wrap", lineHeight:1.8, fontFamily:"JetBrains Mono" }}>
                      {scanResult.ai_analysis}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {tab==="history" && (
          <div className="ai">
            <div style={{ marginBottom:22 }}>
              <h2 style={{ fontSize:22, fontWeight:700, fontFamily:"Rajdhani", letterSpacing:1 }}>SCAN HISTORY</h2>
              <div style={{ fontSize:12, color:C.textMuted }}>Audit trail of all security scans</div>
            </div>
            {selectedScan ? (
              <div>
                <button onClick={()=>setSelectedScan(null)} style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:6, padding:"6px 14px", cursor:"pointer", marginBottom:16, color:C.textSecondary, fontSize:12 }}>← Back</button>
                <div className="card">
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:12 }}>
                    <div>
                      <div style={{ fontSize:15, fontWeight:700, fontFamily:"Rajdhani", color:C.textPrimary }}>{selectedScan.filename}</div>
                      <div style={{ fontSize:10, color:C.textMuted, fontFamily:"JetBrains Mono" }}>{new Date(selectedScan.timestamp).toLocaleString()}</div>
                    </div>
                    <button onClick={()=>generatePDF(selectedScan)} style={{ background:`linear-gradient(135deg,${C.purple},#7c3aed)`, color:"#fff", border:"none", borderRadius:8, padding:"10px 16px", fontWeight:700, cursor:"pointer", fontSize:12 }}>⬇ PDF REPORT</button>
                  </div>
                  <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
                    <StatCard label="Vulnerabilities" value={selectedScan.vulnerability_count} color={C.orange} icon="⚠"/>
                    <StatCard label="Risk Score" value={selectedScan.risk_score} color={C.accent} icon="◎"/>
                    <StatCard label="Decision" value={selectedScan.policy_decision.decision} color={selectedScan.policy_decision.decision==="BLOCK"?C.red:C.green} icon="⚡"/>
                  </div>
                  {selectedScan.vulnerabilities?.length>0 && (
                    <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
                      <div style={{ flex:1, background:C.surface, borderRadius:8, padding:16, border:`1px solid ${C.border}` }}><SeverityBar vulns={selectedScan.vulnerabilities}/></div>
                      <div style={{ flex:1, background:C.surface, borderRadius:8, padding:16, border:`1px solid ${C.border}` }}><DonutChart vulns={selectedScan.vulnerabilities}/></div>
                    </div>
                  )}
                  {selectedScan.ai_analysis && (
                    <div style={{ background:C.surface, border:`1px solid ${C.purple}33`, borderRadius:8, padding:16, fontSize:12, color:C.textSecondary, whiteSpace:"pre-wrap", lineHeight:1.8, fontFamily:"JetBrains Mono" }}>{selectedScan.ai_analysis}</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="card">
                {history.length===0 ? (
                  <div style={{ textAlign:"center", padding:40, color:C.textMuted }}>No scan history yet.</div>
                ) : history.map(s=>(
                  <div key={s.scan_id} onClick={()=>setSelectedScan(s)} style={{ border:`1px solid ${C.border}`, borderRadius:8, padding:14, marginBottom:7, cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", transition:"all .2s" }}
                    onMouseEnter={e=>{e.currentTarget.style.background=C.cardHover;e.currentTarget.style.borderColor=C.borderBright;}}
                    onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.borderColor=C.border;}}>
                    <div>
                      <div style={{ fontWeight:600, color:C.textPrimary, fontFamily:"JetBrains Mono", fontSize:12 }}>{s.filename}</div>
                      <div style={{ fontSize:10, color:C.textMuted, marginTop:3 }}>{new Date(s.timestamp).toLocaleString()} · {s.scan_type}</div>
                    </div>
                    <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                      <span style={{ fontSize:11, color:C.textSecondary }}>{s.vulnerability_count} vulns</span>
                      <span style={{ fontSize:11, color:C.accent, fontFamily:"JetBrains Mono" }}>Score: {s.risk_score}</span>
                      <span style={{ background:s.policy_decision.decision==="BLOCK"?`${C.red}22`:`${C.green}22`, color:s.policy_decision.decision==="BLOCK"?C.red:C.green, border:`1px solid ${s.policy_decision.decision==="BLOCK"?C.red:C.green}44`, borderRadius:4, padding:"2px 8px", fontSize:9, fontWeight:700, fontFamily:"JetBrains Mono" }}>{s.policy_decision.decision}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab==="policy" && (
          <div className="ai">
            <div style={{ marginBottom:22 }}>
              <h2 style={{ fontSize:22, fontWeight:700, fontFamily:"Rajdhani", letterSpacing:1 }}>POLICY ENGINE</h2>
              <div style={{ fontSize:12, color:C.textMuted }}>Configure security thresholds and build gating</div>
            </div>
            <div className="card" style={{ maxWidth:480, position:"relative" }}>
              <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${C.orange},${C.red})`, borderRadius:"12px 12px 0 0" }} />
              <div style={{ marginBottom:24 }}>
                <label style={{ fontWeight:600, display:"block", marginBottom:10, color:C.textPrimary, fontSize:12, letterSpacing:0.5 }}>MAXIMUM RISK SCORE THRESHOLD</label>
                <input type="range" min="0" max="100" value={policy.max_risk_score} onChange={e=>setPolicy({...policy,max_risk_score:+e.target.value})} style={{ width:"100%", accentColor:C.accent }}/>
                <div style={{ display:"flex", justifyContent:"space-between", marginTop:8 }}>
                  <span style={{ fontSize:10, color:C.green }}>SAFE (0)</span>
                  <span style={{ fontSize:26, fontWeight:800, color:C.accent, fontFamily:"JetBrains Mono" }}>{policy.max_risk_score}</span>
                  <span style={{ fontSize:10, color:C.red }}>DANGER (100)</span>
                </div>
                <div style={{ fontSize:11, color:C.textMuted }}>Builds scoring above this will be blocked.</div>
              </div>
              <div style={{ marginBottom:24, background:C.surface, borderRadius:8, padding:14, border:`1px solid ${C.border}` }}>
                <label style={{ fontWeight:600, display:"flex", alignItems:"center", gap:12, cursor:"pointer" }}>
                  <input type="checkbox" checked={policy.block_on_critical} onChange={e=>setPolicy({...policy,block_on_critical:e.target.checked})} style={{ accentColor:C.red, width:15, height:15 }}/>
                  <div>
                    <div style={{ color:C.textPrimary, fontSize:12 }}>Block on HIGH / CRITICAL severity</div>
                    <div style={{ fontSize:10, color:C.textMuted, marginTop:2 }}>Any High/Critical vulnerability auto-blocks regardless of score.</div>
                  </div>
                </label>
              </div>
              <button onClick={async()=>{await fetch(`${API}/policy`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(policy)});alert("Policy saved!");}} style={{ background:`linear-gradient(135deg,${C.accent},${C.accentDim})`, color:"#0a0e1a", border:"none", borderRadius:8, padding:"12px 24px", fontWeight:700, cursor:"pointer", width:"100%", fontSize:12, letterSpacing:1, boxShadow:`0 4px 16px ${C.accent}40` }}>
                SAVE POLICY
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}