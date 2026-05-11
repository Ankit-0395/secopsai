from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, Any
import subprocess, tempfile, os, json, uuid, io
from datetime import datetime
import httpx
from dotenv import load_dotenv

# ReportLab imports
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, PageBreak
from reportlab.lib.enums import TA_LEFT, TA_CENTER

load_dotenv()

app = FastAPI(title="SecureOpsAI", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

scan_history = []

# ── Models ────────────────────────────────────────────────────────────────────

class PolicyConfig(BaseModel):
    max_risk_score: int = 70
    block_on_critical: bool = True

class ReportRequest(BaseModel):
    scan_id: Optional[str] = None
    filename: Optional[str] = None
    vulnerabilities: Optional[Any] = None
    risk_score: Optional[int] = 0
    policy_decision: Optional[Any] = None
    ai_analysis: Optional[str] = None
    timestamp: Optional[str] = None
    scan_type: Optional[str] = None

policy_config = PolicyConfig()

# ── Helpers ───────────────────────────────────────────────────────────────────

def run_bandit(filepath: str) -> list:
    try:
        result = subprocess.run(
            ["bandit", "-f", "json", "-q", "-ll", filepath],
            capture_output=True, text=True, timeout=60
        )
        raw = result.stdout.strip()
        if not raw:
            return []
        data = json.loads(raw)
        return data.get("results", [])
    except json.JSONDecodeError:
        try:
            result = subprocess.run(
                ["bandit", "-f", "json", filepath],
                capture_output=True, text=True, timeout=60
            )
            raw = result.stdout.strip()
            if not raw:
                return []
            data = json.loads(raw)
            return data.get("results", [])
        except:
            return []
    except Exception:
        return []


def run_safety(req_file: str) -> list:
    try:
        result = subprocess.run(
            ["pip-audit", "-r", req_file, "--format", "json", "--skip-editable"],
            capture_output=True, text=True, timeout=120
        )
        raw = result.stdout.strip()
        print(f"DEBUG pip-audit raw length: {len(raw)}")
        if not raw:
            return []
        data = json.loads(raw)
        vulns = []
        for item in data.get("dependencies", []):
            for vuln in item.get("vulns", []):
                vulns.append({
                    "package": item.get("name", "Unknown"),
                    "installed_version": item.get("version", ""),
                    "description": vuln.get("description", "")[:200],
                    "cve_id": vuln.get("id", ""),
                    "issue_severity": "HIGH",
                    "severity": "HIGH",
                    "issue_text": f"{item.get('name','Unknown')} {item.get('version','')} — {vuln.get('id','')}",
                    "more_info": f"https://osv.dev/vulnerability/{vuln.get('id','')}"
                })
        print(f"DEBUG pip-audit returning {len(vulns)} vulns")
        return vulns
    except Exception as e:
        print(f"DEBUG pip-audit exception: {e}")
        return []


def compute_risk_score(vulns: list) -> int:
    weights = {"HIGH": 15, "MEDIUM": 8, "LOW": 3, "CRITICAL": 20}
    score = 0
    for v in vulns:
        sev = (v.get("issue_severity") or v.get("severity") or "LOW").upper()
        score += weights.get(sev, 3)
    return min(score, 100)


def policy_decision(risk_score: int, vulns: list, config: PolicyConfig) -> dict:
    has_high = any(
        (v.get("issue_severity") or v.get("severity") or "").upper() in ["HIGH", "CRITICAL"]
        for v in vulns
    )
    if config.block_on_critical and has_high:
        return {"decision": "BLOCK", "reason": "High/Critical severity vulnerability detected"}
    if risk_score >= config.max_risk_score:
        return {"decision": "BLOCK", "reason": f"Risk score {risk_score} exceeds threshold {config.max_risk_score}"}
    return {"decision": "ALLOW", "reason": "Risk within acceptable limits"}


async def run_ai_analysis(code_snippet: str, vulnerabilities: list) -> str:
    groq_key = os.environ.get("GROQ_API_KEY", "")
    if not groq_key:
        return "AI analysis unavailable — set GROQ_API_KEY in .env file."
    if not vulnerabilities:
        return "No vulnerabilities found — AI analysis not needed."

    vuln_summary = "\n".join([
        f"- {v.get('test_name', v.get('package', 'Unknown'))}: {v.get('issue_text', v.get('description', ''))}"
        for v in vulnerabilities[:8]
    ])

    prompt = f"""You are a security expert reviewing Python code vulnerabilities.

Vulnerabilities found:
{vuln_summary}

Code (first 800 chars):
{code_snippet[:800]}

For each vulnerability provide:
1. Why it is dangerous
2. How an attacker could exploit it
3. A specific code fix

Be concise and actionable. Use plain text, no markdown."""

    try:
        async with httpx.AsyncClient(timeout=40) as client:
            resp = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {groq_key}"},
                json={
                    "model": "llama-3.3-70b-versatile",
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 1000
                }
            )
            data = resp.json()
            if "choices" in data:
                return data["choices"][0]["message"]["content"]
            return f"AI error: {data.get('error', {}).get('message', 'Unknown error')}"
    except Exception as e:
        return f"AI analysis error: {str(e)}"


# ── PDF Generator ─────────────────────────────────────────────────────────────

def build_pdf(scan_data: dict) -> io.BytesIO:
    buffer = io.BytesIO()

    C_BG      = colors.HexColor("#0b0d14")
    C_SURFACE = colors.HexColor("#13151c")
    C_BORDER  = colors.HexColor("#1e2030")
    C_TEXT    = colors.HexColor("#c9d1d9")
    C_MUTED   = colors.HexColor("#666677")
    C_BLUE    = colors.HexColor("#00d4ff")
    C_GREEN   = colors.HexColor("#00ff88")
    C_RED     = colors.HexColor("#ff3d5a")
    C_ORANGE  = colors.HexColor("#ff8c00")
    C_WHITE   = colors.HexColor("#ffffff")
    C_PURPLE  = colors.HexColor("#a855f7")

    SEV_COLOR = {"HIGH": C_RED, "MEDIUM": C_ORANGE, "LOW": C_BLUE, "INFO": C_MUTED, "CRITICAL": C_RED}

    def S(name, **kw):
        return ParagraphStyle(name, **kw)

    s_title    = S("t",  fontSize=26, textColor=C_WHITE,  fontName="Helvetica-Bold", spaceAfter=4, leading=32)
    s_sub      = S("su", fontSize=10, textColor=C_MUTED,  fontName="Helvetica", spaceAfter=0)
    s_section  = S("se", fontSize=13, textColor=C_WHITE,  fontName="Helvetica-Bold", spaceBefore=14, spaceAfter=6)
    s_body     = S("b",  fontSize=9,  textColor=C_TEXT,   fontName="Helvetica", leading=14)
    s_small    = S("sm", fontSize=8,  textColor=C_MUTED,  fontName="Helvetica")
    s_label    = S("lb", fontSize=8,  textColor=C_MUTED,  fontName="Helvetica-Bold")
    s_ai       = S("ai", fontSize=9,  textColor=C_TEXT,   fontName="Helvetica", leading=14, leftIndent=8)

    def draw_page(canvas, doc):
        canvas.saveState()
        w, h = A4
        canvas.setFillColor(C_BG)
        canvas.rect(0, 0, w, h, fill=1, stroke=0)
        canvas.setFillColor(C_BLUE)
        canvas.rect(0, h - 5*mm, w, 5*mm, fill=1, stroke=0)
        canvas.setStrokeColor(C_BORDER)
        canvas.setLineWidth(0.5)
        canvas.line(20*mm, 14*mm, w - 20*mm, 14*mm)
        canvas.setFillColor(C_MUTED)
        canvas.setFont("Helvetica", 7)
        canvas.drawString(20*mm, 10*mm, "SecureOpsAI — Confidential Security Report")
        canvas.drawRightString(w - 20*mm, 10*mm, f"Page {doc.page}")
        canvas.restoreState()

    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        leftMargin=20*mm, rightMargin=20*mm,
        topMargin=20*mm, bottomMargin=22*mm,
        title="SecureOpsAI Security Report"
    )

    story = []
    vulns = scan_data.get("vulnerabilities", [])
    risk = scan_data.get("risk_score", 0)
    decision = scan_data.get("policy_decision", {})
    ai_text = scan_data.get("ai_analysis", "")
    filename = scan_data.get("filename", "Unknown")
    ts = scan_data.get("timestamp", datetime.now().isoformat())

    try:
        dt = datetime.fromisoformat(ts)
        ts_readable = dt.strftime("%B %d, %Y at %H:%M")
    except:
        ts_readable = ts

    story.append(Spacer(1, 8*mm))
    story.append(Paragraph("SecureOpsAI", s_title))
    story.append(Paragraph("Automated DevSecOps Security Report", s_sub))
    story.append(Spacer(1, 2*mm))
    story.append(Paragraph(f"Generated: {ts_readable}", s_small))
    story.append(Spacer(1, 4*mm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=C_BORDER))
    story.append(Spacer(1, 5*mm))

    dec = decision.get("decision", "N/A")
    dec_color = C_RED if dec == "BLOCK" else C_GREEN

    sev_counts = {"HIGH": 0, "MEDIUM": 0, "LOW": 0}
    for v in vulns:
        s = (v.get("issue_severity") or v.get("severity") or "LOW").upper()
        if s in sev_counts:
            sev_counts[s] += 1

    summary_data = [
        ["Metric", "Value"],
        ["Scanned File", filename],
        ["Total Vulnerabilities", str(len(vulns))],
        ["High Severity", str(sev_counts["HIGH"])],
        ["Medium Severity", str(sev_counts["MEDIUM"])],
        ["Low Severity", str(sev_counts["LOW"])],
        ["Risk Score", f"{risk} / 100"],
        ["Policy Decision", dec],
        ["Decision Reason", decision.get("reason", "N/A")],
    ]

    st = Table(summary_data, colWidths=[80*mm, 88*mm], hAlign="LEFT")
    st.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0),  C_SURFACE),
        ("TEXTCOLOR",     (0, 0), (-1, 0),  C_BLUE),
        ("FONTNAME",      (0, 0), (-1, 0),  "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, 0),  9),
        ("BACKGROUND",    (0, 1), (-1, -1), C_BG),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [C_BG, C_SURFACE]),
        ("TEXTCOLOR",     (0, 1), (-1, -1), C_TEXT),
        ("FONTNAME",      (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE",      (0, 1), (-1, -1), 9),
        ("GRID",          (0, 0), (-1, -1), 0.4, C_BORDER),
        ("LEFTPADDING",   (0, 0), (-1, -1), 10),
        ("TOPPADDING",    (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("TEXTCOLOR",     (1, 7), (1, 7),   dec_color),
        ("FONTNAME",      (1, 7), (1, 7),   "Helvetica-Bold"),
        ("TEXTCOLOR",     (1, 4), (1, 4),   C_RED if sev_counts["HIGH"] > 0 else C_TEXT),
    ]))
    story.append(st)
    story.append(Spacer(1, 5*mm))

    if vulns:
        story.append(Paragraph("Severity Distribution", s_section))
        bar_data = [[
            Paragraph(f'<font color="#ff3d5a"><b>HIGH: {sev_counts["HIGH"]}</b></font>', s_body),
            Paragraph(f'<font color="#ff8c00"><b>MEDIUM: {sev_counts["MEDIUM"]}</b></font>', s_body),
            Paragraph(f'<font color="#00d4ff"><b>LOW: {sev_counts["LOW"]}</b></font>', s_body),
        ]]
        bt = Table(bar_data, colWidths=[56*mm, 56*mm, 56*mm], hAlign="LEFT")
        bt.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, -1), C_SURFACE),
            ("GRID",          (0, 0), (-1, -1), 0.4, C_BORDER),
            ("TOPPADDING",    (0, 0), (-1, -1), 10),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ("LEFTPADDING",   (0, 0), (-1, -1), 14),
        ]))
        story.append(bt)
        story.append(Spacer(1, 5*mm))

    if vulns:
        story.append(PageBreak())
        story.append(Paragraph("Vulnerability Findings", s_section))
        story.append(HRFlowable(width="100%", thickness=0.5, color=C_BORDER))
        story.append(Spacer(1, 4*mm))

        for idx, v in enumerate(vulns, 1):
            sev = (v.get("issue_severity") or v.get("severity") or "LOW").upper()
            sc = SEV_COLOR.get(sev, C_MUTED)
            sc_hex = sc.hexval()[2:] if hasattr(sc, 'hexval') else "888888"

            title_text = v.get("issue_text") or v.get("description") or v.get("test_name") or "Security Issue"
            title_text = title_text[:120]

            h_data = [[
                Paragraph(
                    f'<font color="#{sc_hex}"><b>[{sev}]</b></font> '
                    f'<font color="#e0e0e0">{title_text}</font>', s_body
                ),
                Paragraph(f'<font color="#555555">#{idx}</font>', s_small),
            ]]
            ht = Table(h_data, colWidths=[148*mm, 20*mm], hAlign="LEFT")
            ht.setStyle(TableStyle([
                ("BACKGROUND",    (0, 0), (-1, -1), C_SURFACE),
                ("TOPPADDING",    (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("LEFTPADDING",   (0, 0), (-1, -1), 12),
                ("RIGHTPADDING",  (0, 0), (-1, -1), 8),
                ("LINEBEFORE",    (0, 0), (0, -1),  3, sc),
            ]))
            story.append(ht)

            details = []
            if v.get("test_name"):    details.append(["Test", v["test_name"]])
            if v.get("filename"):     details.append(["File", str(v["filename"]).split("\\")[-1].split("/")[-1]])
            if v.get("line_number"):  details.append(["Line", str(v["line_number"])])
            if v.get("test_id"):      details.append(["ID", v["test_id"]])
            if v.get("package"):      details.append(["Package", v["package"]])
            if v.get("cve_id"):       details.append(["CVE", v["cve_id"]])
            if v.get("more_info"):    details.append(["Ref", v["more_info"][:80]])

            if details:
                dt = Table(
                    [[Paragraph(r[0], s_label), Paragraph(str(r[1]), s_body)] for r in details],
                    colWidths=[25*mm, 143*mm], hAlign="LEFT"
                )
                dt.setStyle(TableStyle([
                    ("BACKGROUND",    (0, 0), (-1, -1), C_BG),
                    ("TOPPADDING",    (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                    ("LEFTPADDING",   (0, 0), (-1, -1), 12),
                    ("LINEBELOW",     (0, -1), (-1, -1), 0.4, C_BORDER),
                ]))
                story.append(dt)
            story.append(Spacer(1, 4*mm))
    else:
        story.append(Spacer(1, 4*mm))
        nd = Table([[Paragraph("No vulnerabilities detected", s_body)]], colWidths=[168*mm])
        nd.setStyle(TableStyle([
            ("BACKGROUND",   (0, 0), (-1, -1), colors.HexColor("#0d2010")),
            ("TOPPADDING",   (0, 0), (-1, -1), 14),
            ("BOTTOMPADDING",(0, 0), (-1, -1), 14),
            ("LEFTPADDING",  (0, 0), (-1, -1), 16),
            ("LINEBEFORE",   (0, 0), (-1, -1), 3, C_GREEN),
        ]))
        story.append(nd)

    if ai_text and "unavailable" not in ai_text.lower() and "not needed" not in ai_text.lower():
        story.append(PageBreak())
        story.append(Paragraph("AI Security Analysis", s_section))
        story.append(Paragraph("Powered by Groq LLM (llama-3.3-70b-versatile)", s_small))
        story.append(HRFlowable(width="100%", thickness=0.5, color=C_BORDER))
        story.append(Spacer(1, 4*mm))

        ai_box = Table([[Paragraph(ai_text, s_ai)]], colWidths=[168*mm])
        ai_box.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, -1), colors.HexColor("#0d1117")),
            ("TOPPADDING",    (0, 0), (-1, -1), 14),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
            ("LEFTPADDING",   (0, 0), (-1, -1), 16),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 12),
            ("LINEBEFORE",    (0, 0), (-1, -1), 3, C_PURPLE),
            ("BOX",           (0, 0), (-1, -1), 0.4, C_BORDER),
        ]))
        story.append(ai_box)

    story.append(Spacer(1, 8*mm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=C_BORDER))
    story.append(Spacer(1, 3*mm))
    story.append(Paragraph("Tula's Institute, Dehradun  |  B.Tech Final Year Project  |  CSE Department", s_small))
    story.append(Paragraph("Team: Abhimanyu Kumar • Ankit Kumar • Prabha Shankar • Prabhat Ranjan", s_small))

    doc.build(story, onFirstPage=draw_page, onLaterPages=draw_page)
    buffer.seek(0)
    return buffer


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "SecureOpsAI API is running", "version": "2.0.0"}


@app.post("/scan/code")
async def scan_code(file: UploadFile = File(...)):
    if not file.filename.endswith(".py"):
        raise HTTPException(status_code=400, detail="Only .py files are supported")

    content = await file.read()
    code_text = content.decode("utf-8", errors="replace")

    with tempfile.NamedTemporaryFile(suffix=".py", delete=False, mode="w", encoding="utf-8") as tmp:
        tmp.write(code_text)
        tmp_path = tmp.name

    try:
        vulns = run_bandit(tmp_path)
        risk = compute_risk_score(vulns)
        decision = policy_decision(risk, vulns, policy_config)
        ai = await run_ai_analysis(code_text, vulns)

        result = {
            "scan_id": str(uuid.uuid4()),
            "timestamp": datetime.now().isoformat(),
            "filename": file.filename,
            "scan_type": "code",
            "vulnerabilities": vulns,
            "vulnerability_count": len(vulns),
            "risk_score": risk,
            "policy_decision": decision,
            "ai_analysis": ai,
        }
        scan_history.append(result)
        return result
    finally:
        try:
            os.unlink(tmp_path)
        except:
            pass


@app.post("/scan/dependencies")
async def scan_dependencies(file: UploadFile = File(...)):
    content = await file.read()

    with tempfile.NamedTemporaryFile(suffix=".txt", delete=False, mode="wb") as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        vulns = run_safety(tmp_path)
        risk = compute_risk_score(vulns)
        decision = policy_decision(risk, vulns, policy_config)

        ai_text = "Dependency scan complete."
        if vulns:
            ai_text = await run_ai_analysis(
                f"requirements.txt with {len(vulns)} vulnerable packages",
                vulns
            )

        result = {
            "scan_id": str(uuid.uuid4()),
            "timestamp": datetime.now().isoformat(),
            "filename": file.filename,
            "scan_type": "dependency",
            "vulnerabilities": vulns,
            "vulnerability_count": len(vulns),
            "risk_score": risk,
            "policy_decision": decision,
            "ai_analysis": ai_text,
        }
        scan_history.append(result)
        return result
    finally:
        try:
            os.unlink(tmp_path)
        except:
            pass


@app.post("/report/pdf")
async def generate_pdf(request: ReportRequest):
    scan_data = {
        "filename": request.filename or "Unknown",
        "vulnerabilities": request.vulnerabilities or [],
        "risk_score": request.risk_score or 0,
        "policy_decision": request.policy_decision or {},
        "ai_analysis": request.ai_analysis or "",
        "timestamp": request.timestamp or datetime.now().isoformat(),
    }
    buf = build_pdf(scan_data)
    fname = f"SecureOpsAI_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'}
    )


@app.get("/history")
def get_history():
    return {"scans": list(reversed(scan_history)), "total": len(scan_history)}


@app.get("/history/{scan_id}")
def get_scan(scan_id: str):
    for s in scan_history:
        if s["scan_id"] == scan_id:
            return s
    raise HTTPException(status_code=404, detail="Scan not found")


@app.get("/stats")
def get_stats():
    total = len(scan_history)
    blocked = sum(1 for s in scan_history if s["policy_decision"]["decision"] == "BLOCK")
    total_vulns = sum(s["vulnerability_count"] for s in scan_history)
    avg_risk = round(sum(s["risk_score"] for s in scan_history) / total, 1) if total > 0 else 0
    return {
        "total_scans": total,
        "blocked_builds": blocked,
        "allowed_builds": total - blocked,
        "total_vulnerabilities": total_vulns,
        "average_risk_score": avg_risk,
    }


@app.get("/policy")
def get_policy():
    return policy_config


@app.post("/policy")
def update_policy(config: PolicyConfig):
    global policy_config
    policy_config = config
    return {"message": "Policy updated", "config": config}
