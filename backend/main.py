from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, Any
import subprocess
import tempfile
import os
import json
import uuid
import io
from datetime import datetime
import httpx
from dotenv import load_dotenv

# PDF imports
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

load_dotenv()

app = FastAPI(title="SecureOpsAI", version="2.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Railway deployment ke liye
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

scan_history = []

# ─────────────────────────────────────────────────────────────
# Models
# ─────────────────────────────────────────────────────────────

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

# ─────────────────────────────────────────────────────────────
# Helper Functions
# ─────────────────────────────────────────────────────────────

def run_bandit(filepath: str):
    try:
        result = subprocess.run(
            ["bandit", "-f", "json", filepath],
            capture_output=True,
            text=True,
            timeout=60
        )

        if not result.stdout:
            return []

        data = json.loads(result.stdout)
        return data.get("results", [])

    except Exception as e:
        print("Bandit Error:", e)
        return []


def run_pip_audit(req_file: str):
    try:
        result = subprocess.run(
            ["pip-audit", "-r", req_file, "--format", "json"],
            capture_output=True,
            text=True,
            timeout=120
        )

        if not result.stdout:
            return []

        data = json.loads(result.stdout)

        vulnerabilities = []

        for dep in data.get("dependencies", []):
            for vuln in dep.get("vulns", []):
                vulnerabilities.append({
                    "package": dep.get("name"),
                    "version": dep.get("version"),
                    "severity": "HIGH",
                    "description": vuln.get("description", ""),
                    "id": vuln.get("id", "")
                })

        return vulnerabilities

    except Exception as e:
        print("pip-audit Error:", e)
        return []


def compute_risk_score(vulns):
    score = 0

    for v in vulns:
        sev = str(v.get("severity", "LOW")).upper()

        if sev == "CRITICAL":
            score += 20
        elif sev == "HIGH":
            score += 15
        elif sev == "MEDIUM":
            score += 8
        else:
            score += 3

    return min(score, 100)


def policy_decision(score, vulns):
    high_found = any(
        str(v.get("severity", "")).upper() in ["HIGH", "CRITICAL"]
        for v in vulns
    )

    if high_found:
        return {
            "decision": "BLOCK",
            "reason": "High/Critical vulnerability found"
        }

    if score >= policy_config.max_risk_score:
        return {
            "decision": "BLOCK",
            "reason": "Risk score exceeded threshold"
        }

    return {
        "decision": "ALLOW",
        "reason": "Risk acceptable"
    }


async def run_ai_analysis(code_text, vulnerabilities):

    groq_key = os.environ.get("GROQ_API_KEY")

    if not groq_key:
        return "GROQ_API_KEY missing."

    if not vulnerabilities:
        return "No vulnerabilities found."

    vuln_text = "\n".join([
        f"- {v.get('description', '')}"
        for v in vulnerabilities[:5]
    ])

    prompt = f"""
You are a cybersecurity expert.

Analyze these vulnerabilities:

{vuln_text}

Code:
{code_text[:1000]}

Provide:
1. Risk explanation
2. Exploitation method
3. Secure fix
"""

    try:
        async with httpx.AsyncClient(timeout=40) as client:

            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {groq_key}"
                },
                json={
                    "model": "llama-3.3-70b-versatile",
                    "messages": [
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    "max_tokens": 1000
                }
            )

            data = response.json()

            return data["choices"][0]["message"]["content"]

    except Exception as e:
        return str(e)


# ─────────────────────────────────────────────────────────────
# PDF Generator
# ─────────────────────────────────────────────────────────────

def generate_pdf_report(scan_data):

    buffer = io.BytesIO()

    doc = SimpleDocTemplate(buffer, pagesize=A4)

    styles = getSampleStyleSheet()

    story = []

    story.append(Paragraph("SecureOpsAI Security Report", styles['Title']))
    story.append(Spacer(1, 20))

    story.append(Paragraph(
        f"Filename: {scan_data.get('filename')}",
        styles['BodyText']
    ))

    story.append(Paragraph(
        f"Risk Score: {scan_data.get('risk_score')}",
        styles['BodyText']
    ))

    story.append(Paragraph(
        f"Decision: {scan_data.get('policy_decision', {}).get('decision')}",
        styles['BodyText']
    ))

    story.append(Spacer(1, 20))

    vulnerabilities = scan_data.get("vulnerabilities", [])

    for vuln in vulnerabilities:

        text = f"""
        <b>Severity:</b> {vuln.get('severity')}<br/>
        <b>Description:</b> {vuln.get('description')}<br/>
        """

        story.append(Paragraph(text, styles['BodyText']))
        story.append(Spacer(1, 10))

    ai_analysis = scan_data.get("ai_analysis", "")

    if ai_analysis:
        story.append(Spacer(1, 20))
        story.append(Paragraph("AI Security Analysis", styles['Heading2']))
        story.append(Paragraph(ai_analysis, styles['BodyText']))

    doc.build(story)

    buffer.seek(0)

    return buffer


# ─────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "message": "SecureOpsAI API running successfully",
        "version": "2.0.0"
    }


@app.post("/scan/code")
async def scan_code(file: UploadFile = File(...)):

    if not file.filename.endswith(".py"):
        raise HTTPException(
            status_code=400,
            detail="Only Python files allowed"
        )

    content = await file.read()

    code_text = content.decode("utf-8", errors="replace")

    with tempfile.NamedTemporaryFile(
        suffix=".py",
        delete=False,
        mode="w",
        encoding="utf-8"
    ) as tmp:

        tmp.write(code_text)

        temp_path = tmp.name

    try:

        vulnerabilities = run_bandit(temp_path)

        risk_score = compute_risk_score(vulnerabilities)

        decision = policy_decision(risk_score, vulnerabilities)

        ai_analysis = await run_ai_analysis(
            code_text,
            vulnerabilities
        )

        result = {
            "scan_id": str(uuid.uuid4()),
            "timestamp": datetime.now().isoformat(),
            "filename": file.filename,
            "scan_type": "code",
            "vulnerabilities": vulnerabilities,
            "vulnerability_count": len(vulnerabilities),
            "risk_score": risk_score,
            "policy_decision": decision,
            "ai_analysis": ai_analysis
        }

        scan_history.append(result)

        return result

    finally:
        try:
            os.unlink(temp_path)
        except:
            pass


@app.post("/scan/dependencies")
async def scan_dependencies(file: UploadFile = File(...)):

    content = await file.read()

    with tempfile.NamedTemporaryFile(
        suffix=".txt",
        delete=False,
        mode="wb"
    ) as tmp:

        tmp.write(content)

        temp_path = tmp.name

    try:

        vulnerabilities = run_pip_audit(temp_path)

        risk_score = compute_risk_score(vulnerabilities)

        decision = policy_decision(risk_score, vulnerabilities)

        ai_analysis = await run_ai_analysis(
            "Dependency scan",
            vulnerabilities
        )

        result = {
            "scan_id": str(uuid.uuid4()),
            "timestamp": datetime.now().isoformat(),
            "filename": file.filename,
            "scan_type": "dependency",
            "vulnerabilities": vulnerabilities,
            "vulnerability_count": len(vulnerabilities),
            "risk_score": risk_score,
            "policy_decision": decision,
            "ai_analysis": ai_analysis
        }

        scan_history.append(result)

        return result

    finally:
        try:
            os.unlink(temp_path)
        except:
            pass


@app.post("/report/pdf")
async def create_pdf(request: ReportRequest):

    data = {
        "filename": request.filename,
        "vulnerabilities": request.vulnerabilities or [],
        "risk_score": request.risk_score,
        "policy_decision": request.policy_decision or {},
        "ai_analysis": request.ai_analysis or ""
    }

    pdf_buffer = generate_pdf_report(data)

    filename = f"SecureOpsAI_Report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )


@app.get("/history")
def history():
    return {
        "total_scans": len(scan_history),
        "scans": list(reversed(scan_history))
    }


@app.get("/stats")
def stats():

    total = len(scan_history)

    blocked = sum(
        1 for s in scan_history
        if s["policy_decision"]["decision"] == "BLOCK"
    )

    total_vulns = sum(
        s["vulnerability_count"]
        for s in scan_history
    )

    avg_risk = 0

    if total > 0:
        avg_risk = round(
            sum(s["risk_score"] for s in scan_history) / total,
            1
        )

    return {
        "total_scans": total,
        "blocked_builds": blocked,
        "allowed_builds": total - blocked,
        "total_vulnerabilities": total_vulns,
        "average_risk_score": avg_risk
    }


# ─────────────────────────────────────────────────────────────
# Railway / Production Run
# ─────────────────────────────────────────────────────────────

if __name__ == "__main__":

    import uvicorn

    port = int(os.environ.get("PORT", 8000))

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port
    )
