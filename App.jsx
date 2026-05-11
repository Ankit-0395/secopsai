import { useState, useEffect, useRef } from "react";

const API = "https://determined-cooperation-production-655d.up.railway.app";

const SEVERITY_COLORS = {
  HIGH: "#ff4d4d",
  MEDIUM: "#ffaa00",
  LOW: "#4daaff",
  INFO: "#aaaaaa",
};

const SEVERITY_BG = {
  HIGH: "rgba(255,77,77,0.12)",
  MEDIUM: "rgba(255,170,0,0.12)",
  LOW: "rgba(77,170,255,0.12)",
  INFO: "rgba(170,170,170,0.08)",
};

function Badge({ severity }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 1,
        background: SEVERITY_BG[severity] || SEVERITY_BG.INFO,
        color: SEVERITY_COLORS[severity] || SEVERITY_COLORS.INFO,
        border: `1px solid ${SEVERITY_COLORS[severity] || SEVERITY_COLORS.INFO}44`,
        textTransform: "uppercase",
      }}
    >
      {severity}
    </span>
  );
}

function StatCard({ label, value, color, icon }) {
  return (
    <div
      style={{
        background: "#13151c",
        border: `1px solid ${color}33`,
        borderRadius: 12,
        padding: "20px 24px",
        minWidth: 120,
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        boxShadow: `0 0 24px ${color}11`,
      }}
    >
      <div style={{ fontSize: 24 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color, fontFamily: "'JetBrains Mono', monospace" }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: "#666", letterSpacing: 0.5, textTransform: "uppercase" }}>
        {label}
      </div>
    </div>
  );
}

function SeverityBar({ counts }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  const bars = [
    { key: "HIGH", label: "High", color: SEVERITY_COLORS.HIGH },
    { key: "MEDIUM", label: "Medium", color: SEVERITY_COLORS.MEDIUM },
    { key: "LOW", label: "Low", color: SEVERITY_COLORS.LOW },
    { key: "INFO", label: "Info", color: SEVERITY_COLORS.INFO },
  ];
  return (
    <div style={{ marginTop: 8 }}>
      <div
        style={{
          display: "flex",
          borderRadius: 6,
          overflow: "hidden",
          height: 14,
          background: "#1a1c25",
          marginBottom: 10,
        }}
      >
        {bars.map(({ key, color }) =>
          counts[key] ? (
            <div
              key={key}
              title={`${key}: ${counts[key]}`}
              style={{
                width: `${(counts[key] / total) * 100}%`,
                background: color,
                transition: "width 0.5s",
              }}
            />
          ) : null
        )}
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {bars.map(({ key, label, color }) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#aaa" }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
            {label}: <span style={{ color, fontWeight: 700 }}>{counts[key] || 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function IssueCard({ issue, index }) {
  const [open, setOpen] = useState(false);
  const sev = issue.issue_severity || issue.severity || "INFO";
  return (
    <div
      style={{
        background: "#13151c",
        border: `1px solid ${SEVERITY_COLORS[sev]}33`,
        borderRadius: 8,
        marginBottom: 8,
        overflow: "hidden",
        transition: "box-shadow 0.2s",
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 0 16px ${SEVERITY_COLORS[sev]}22`)}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
    >
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 16px",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <Badge severity={sev} />
        <span style={{ flex: 1, color: "#e0e0e0", fontSize: 13 }}>
          {issue.issue_text || issue.vulnerability || issue.description || "Issue"}
        </span>
        <span style={{ color: "#555", fontSize: 12 }}>
          {open ? "▲" : "▼"}
        </span>
      </div>
      {open && (
        <div
          style={{
            padding: "0 16px 14px",
            borderTop: `1px solid #1e2030`,
            fontSize: 12,
            color: "#888",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {issue.filename && <div>📄 File: <span style={{ color: "#ccc" }}>{issue.filename}</span></div>}
          {issue.line_number && <div>📍 Line: <span style={{ color: "#ccc" }}>{issue.line_number}</span></div>}
          {issue.test_id && <div>🔎 Test ID: <span style={{ color: "#ccc" }}>{issue.test_id}</span></div>}
          {issue.more_info && (
            <div>
              🔗 More info:{" "}
              <a href={issue.more_info} target="_blank" rel="noreferrer" style={{ color: "#4daaff" }}>
                {issue.more_info}
              </a>
            </div>
          )}
          {issue.package && <div>📦 Package: <span style={{ color: "#ccc" }}>{issue.package}</span></div>}
          {issue.advisory && <div>📋 Advisory: <span style={{ color: "#ccc" }}>{issue.advisory}</span></div>}
          {issue.cve && <div>🛡️ CVE: <span style={{ color: "#ffaa00" }}>{issue.cve}</span></div>}
          {issue.ai_analysis && (
            <div
              style={{
                marginTop: 8,
                padding: "10px 14px",
                background: "#0d1117",
                borderRadius: 6,
                borderLeft: `3px solid #4daaff`,
                color: "#c9d1d9",
                lineHeight: 1.6,
              }}
            >
              <div style={{ color: "#4daaff", fontWeight: 700, marginBottom: 4, fontSize: 11, letterSpacing: 0.5 }}>
                🤖 AI ANALYSIS
              </div>
              {issue.ai_analysis}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ScanSection({ title, results, scanType }) {
  if (!results) return null;

  const issues =
    results.issues ||
    results.vulnerabilities ||
    results.results ||
    [];

  const countsBySev = {};
  issues.forEach((i) => {
    const s = (i.issue_severity || i.severity || "INFO").toUpperCase();
    countsBySev[s] = (countsBySev[s] || 0) + 1;
  });

  return (
    <div style={{ marginBottom: 32 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#e0e0e0" }}>
          {title}
        </h2>
        <span
          style={{
            fontSize: 12,
            color: "#555",
            background: "#1a1c25",
            padding: "2px 10px",
            borderRadius: 20,
          }}
        >
          {issues.length} issue{issues.length !== 1 ? "s" : ""}
        </span>
      </div>
      {issues.length > 0 && <SeverityBar counts={countsBySev} />}
      <div style={{ marginTop: 16 }}>
        {issues.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: 32,
              color: "#3a3",
              background: "#0d1a0d",
              borderRadius: 8,
              border: "1px solid #2a4a2a",
            }}
          >
            ✅ No issues found
          </div>
        ) : (
          issues.map((issue, i) => <IssueCard key={i} issue={issue} index={i} />)
        )}
      </div>
      {results.ai_summary && (
        <div
          style={{
            marginTop: 16,
            padding: "16px 20px",
            background: "#0d1117",
            borderRadius: 8,
            borderLeft: "3px solid #4daaff",
            color: "#c9d1d9",
            lineHeight: 1.7,
          }}
        >
          <div
            style={{
              color: "#4daaff",
              fontWeight: 700,
              marginBottom: 8,
              fontSize: 12,
              letterSpacing: 0.5,
            }}
          >
            🤖 AI SUMMARY
          </div>
          {results.ai_summary}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("scanner");
  const [codeFile, setCodeFile] = useState(null);
  const [depsFile, setDepsFile] = useState(null);
  const [loading, setLoading] = useState({ code: false, deps: false });
  const [results, setResults] = useState({ code: null, deps: null });
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchHistory();
  }, []);

  async function fetchStats() {
    try {
      const r = await fetch(`${API}/stats`);
      if (r.ok) setStats(await r.json());
    } catch {}
  }

  async function fetchHistory() {
    try {
      const r = await fetch(`${API}/history`);
      if (r.ok) setHistory(await r.json());
    } catch {}
  }

  async function scanCode() {
    if (!codeFile) return;
    setLoading((l) => ({ ...l, code: true }));
    setError("");
    const fd = new FormData();
    fd.append("file", codeFile);
    try {
      const r = await fetch(`${API}/scan/code`, { method: "POST", body: fd });
      const data = await r.json();
      setResults((prev) => ({ ...prev, code: data }));
      fetchStats();
      fetchHistory();
    } catch (e) {
      setError("Failed to connect to backend. Is it running?");
    }
    setLoading((l) => ({ ...l, code: false }));
  }

  async function scanDeps() {
    if (!depsFile) return;
    setLoading((l) => ({ ...l, deps: true }));
    setError("");
    const fd = new FormData();
    fd.append("file", depsFile);
    try {
      const r = await fetch(`${API}/scan/dependencies`, { method: "POST", body: fd });
      const data = await r.json();
      setResults((prev) => ({ ...prev, deps: data }));
      fetchStats();
      fetchHistory();
    } catch (e) {
      setError("Failed to connect to backend. Is it running?");
    }
    setLoading((l) => ({ ...l, deps: false }));
  }

  async function downloadPDF() {
    if (!results.code && !results.deps) return;
    setPdfLoading(true);
    try {
      const payload = {
        code_results: results.code || null,
        deps_results: results.deps || null,
        generated_at: new Date().toISOString(),
      };
      const r = await fetch(`${API}/report/pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error("PDF generation failed");
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `SecureOpsAI_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError("PDF generation failed. Make sure backend supports /report/pdf");
    }
    setPdfLoading(false);
  }

  const hasResults = results.code || results.deps;

  const allIssues = [
    ...((results.code?.issues) || []),
    ...((results.deps?.vulnerabilities) || []),
  ];

  const overallCounts = {};
  allIssues.forEach((i) => {
    const s = (i.issue_severity || i.severity || "INFO").toUpperCase();
    overallCounts[s] = (overallCounts[s] || 0) + 1;
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b0d14",
        color: "#c9d1d9",
        fontFamily: "'Sora', 'Segoe UI', sans-serif",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap"
        rel="stylesheet"
      />

      {/* TOP NAV */}
      <nav
        style={{
          background: "#0f111a",
          borderBottom: "1px solid #1e2030",
          padding: "0 32px",
          display: "flex",
          alignItems: "center",
          height: 60,
          gap: 24,
          position: "sticky",
          top: 0,
          zIndex: 100,
          boxShadow: "0 2px 20px #00000066",
        }}
      >
        <div
          style={{
            fontWeight: 800,
            fontSize: 18,
            color: "#fff",
            letterSpacing: 0.5,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 22 }}>🛡️</span>
          <span>
            SecureOps<span style={{ color: "#4daaff" }}>AI</span>
          </span>
        </div>
        <div style={{ flex: 1 }} />
        {["scanner", "dashboard", "history"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: tab === t ? "#1a1c2e" : "transparent",
              border: tab === t ? "1px solid #2a2d45" : "1px solid transparent",
              color: tab === t ? "#fff" : "#666",
              padding: "6px 18px",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              textTransform: "capitalize",
              transition: "all 0.2s",
            }}
          >
            {t === "scanner" ? "🔍 Scanner" : t === "dashboard" ? "📊 Dashboard" : "🕓 History"}
          </button>
        ))}
      </nav>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px" }}>
        {error && (
          <div
            style={{
              background: "#1a0d0d",
              border: "1px solid #ff4d4d44",
              borderRadius: 8,
              padding: "12px 18px",
              marginBottom: 20,
              color: "#ff8080",
              fontSize: 13,
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* SCANNER TAB */}
        {tab === "scanner" && (
          <div>
            <div style={{ marginBottom: 28 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 6px", color: "#fff" }}>
                Security Scanner
              </h1>
              <p style={{ margin: 0, color: "#555", fontSize: 13 }}>
                Upload your Python source files or requirements.txt to detect vulnerabilities
              </p>
            </div>

            {/* Upload cards */}
            <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
              {/* Code scan */}
              <div
                style={{
                  flex: 1,
                  minWidth: 260,
                  background: "#13151c",
                  border: "1px solid #1e2030",
                  borderRadius: 12,
                  padding: 24,
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 14, color: "#e0e0e0" }}>
                  🐍 Code Scan (SAST)
                </div>
                <div style={{ fontSize: 12, color: "#555", marginBottom: 16 }}>
                  Upload a Python (.py) file. Bandit will scan for security issues.
                </div>
                <label
                  style={{
                    display: "block",
                    border: "1.5px dashed #2a2d45",
                    borderRadius: 8,
                    padding: "18px 12px",
                    textAlign: "center",
                    cursor: "pointer",
                    color: "#4daaff",
                    fontSize: 12,
                    marginBottom: 14,
                    transition: "border-color 0.2s",
                  }}
                >
                  <input
                    type="file"
                    accept=".py"
                    style={{ display: "none" }}
                    onChange={(e) => setCodeFile(e.target.files[0])}
                  />
                  {codeFile ? `📄 ${codeFile.name}` : "Click to upload .py file"}
                </label>
                <button
                  onClick={scanCode}
                  disabled={!codeFile || loading.code}
                  style={{
                    width: "100%",
                    background: codeFile ? "#1a3a5c" : "#1a1c25",
                    border: `1px solid ${codeFile ? "#4daaff44" : "#1e2030"}`,
                    color: codeFile ? "#4daaff" : "#444",
                    borderRadius: 7,
                    padding: "10px 0",
                    cursor: codeFile ? "pointer" : "not-allowed",
                    fontWeight: 700,
                    fontSize: 13,
                    transition: "all 0.2s",
                  }}
                >
                  {loading.code ? "⏳ Scanning..." : "Run Code Scan"}
                </button>
              </div>

              {/* Deps scan */}
              <div
                style={{
                  flex: 1,
                  minWidth: 260,
                  background: "#13151c",
                  border: "1px solid #1e2030",
                  borderRadius: 12,
                  padding: 24,
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 14, color: "#e0e0e0" }}>
                  📦 Dependency Scan
                </div>
                <div style={{ fontSize: 12, color: "#555", marginBottom: 16 }}>
                  Upload requirements.txt. Safety checks CVE database for vulnerable packages.
                </div>
                <label
                  style={{
                    display: "block",
                    border: "1.5px dashed #2a2d45",
                    borderRadius: 8,
                    padding: "18px 12px",
                    textAlign: "center",
                    cursor: "pointer",
                    color: "#ffaa00",
                    fontSize: 12,
                    marginBottom: 14,
                  }}
                >
                  <input
                    type="file"
                    accept=".txt"
                    style={{ display: "none" }}
                    onChange={(e) => setDepsFile(e.target.files[0])}
                  />
                  {depsFile ? `📄 ${depsFile.name}` : "Click to upload requirements.txt"}
                </label>
                <button
                  onClick={scanDeps}
                  disabled={!depsFile || loading.deps}
                  style={{
                    width: "100%",
                    background: depsFile ? "#2e1f00" : "#1a1c25",
                    border: `1px solid ${depsFile ? "#ffaa0044" : "#1e2030"}`,
                    color: depsFile ? "#ffaa00" : "#444",
                    borderRadius: 7,
                    padding: "10px 0",
                    cursor: depsFile ? "pointer" : "not-allowed",
                    fontWeight: 700,
                    fontSize: 13,
                    transition: "all 0.2s",
                  }}
                >
                  {loading.deps ? "⏳ Scanning..." : "Run Dependency Scan"}
                </button>
              </div>
            </div>

            {/* Results */}
            {hasResults && (
              <div>
                {/* Summary stats */}
                <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
                  <StatCard label="Total Issues" value={allIssues.length} color="#4daaff" icon="🔎" />
                  <StatCard label="High" value={overallCounts.HIGH || 0} color="#ff4d4d" icon="🔴" />
                  <StatCard label="Medium" value={overallCounts.MEDIUM || 0} color="#ffaa00" icon="🟡" />
                  <StatCard label="Low" value={overallCounts.LOW || 0} color="#4daaff" icon="🔵" />
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 20,
                  }}
                >
                  <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#e0e0e0" }}>
                    Scan Results
                  </h2>
                  <button
                    onClick={downloadPDF}
                    disabled={pdfLoading}
                    style={{
                      background: pdfLoading ? "#1a1c25" : "#1a2a1a",
                      border: "1px solid #3a6a3a",
                      color: pdfLoading ? "#555" : "#4dcc4d",
                      borderRadius: 7,
                      padding: "8px 18px",
                      cursor: pdfLoading ? "not-allowed" : "pointer",
                      fontWeight: 700,
                      fontSize: 13,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {pdfLoading ? "⏳ Generating..." : "⬇️ Download PDF Report"}
                  </button>
                </div>

                <ScanSection title="Code Security Issues (SAST)" results={results.code} scanType="code" />
                <ScanSection title="Dependency Vulnerabilities" results={results.deps} scanType="deps" />
              </div>
            )}
          </div>
        )}

        {/* DASHBOARD TAB */}
        {tab === "dashboard" && (
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 24px", color: "#fff" }}>
              📊 Security Dashboard
            </h1>

            <div style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
              <StatCard label="Total Scans" value={stats?.total_scans ?? "—"} color="#4daaff" icon="🔬" />
              <StatCard label="Total Issues" value={stats?.total_issues ?? "—"} color="#ff8c00" icon="⚠️" />
              <StatCard label="High Severity" value={stats?.high_severity ?? "—"} color="#ff4d4d" icon="🔴" />
              <StatCard label="Medium Severity" value={stats?.medium_severity ?? "—"} color="#ffaa00" icon="🟡" />
            </div>

            {stats && (
              <div
                style={{
                  background: "#13151c",
                  border: "1px solid #1e2030",
                  borderRadius: 12,
                  padding: 24,
                  marginBottom: 24,
                }}
              >
                <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: "#e0e0e0" }}>
                  Severity Distribution
                </h3>
                <SeverityBar
                  counts={{
                    HIGH: stats.high_severity || 0,
                    MEDIUM: stats.medium_severity || 0,
                    LOW: stats.low_severity || 0,
                    INFO: stats.info_severity || 0,
                  }}
                />
              </div>
            )}

            {!stats && (
              <div
                style={{
                  textAlign: "center",
                  padding: 64,
                  color: "#444",
                  fontSize: 14,
                }}
              >
                Run some scans to see dashboard metrics
              </div>
            )}
          </div>
        )}

        {/* HISTORY TAB */}
        {tab === "history" && (
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 24px", color: "#fff" }}>
              🕓 Scan History
            </h1>

            {history.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: 64,
                  color: "#444",
                  fontSize: 14,
                }}
              >
                No scans yet. Head to the Scanner tab to run your first scan.
              </div>
            ) : (
              <div>
                {history.map((entry, i) => (
                  <div
                    key={i}
                    style={{
                      background: "#13151c",
                      border: "1px solid #1e2030",
                      borderRadius: 8,
                      padding: "14px 18px",
                      marginBottom: 10,
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                    }}
                  >
                    <div style={{ fontSize: 20 }}>
                      {entry.scan_type === "code" ? "🐍" : "📦"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: "#e0e0e0", fontSize: 13 }}>
                        {entry.filename || entry.scan_type}
                      </div>
                      <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>
                        {entry.timestamp || entry.created_at}
                      </div>
                    </div>
                    <Badge severity={entry.max_severity || "INFO"} />
                    <div style={{ fontSize: 12, color: "#888" }}>
                      {entry.issue_count || 0} issues
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
