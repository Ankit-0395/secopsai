"""
=============================================================
  ADD THESE IMPORTS to the top of your existing main.py
=============================================================
"""
# Add these with your existing imports:
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table,
    TableStyle, HRFlowable, PageBreak
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Any
import io
from datetime import datetime

"""
=============================================================
  ADD THESE PYDANTIC MODELS (alongside your existing ones)
=============================================================
"""

class ReportRequest(BaseModel):
    code_results: Optional[Any] = None
    deps_results: Optional[Any] = None
    generated_at: Optional[str] = None


"""
=============================================================
  ADD THIS ROUTE to your existing FastAPI app
  (add it after your existing routes in main.py)
=============================================================
"""

@app.post("/report/pdf")
async def generate_pdf_report(request: ReportRequest):
    """Generate a styled PDF security report from scan results."""

    buffer = io.BytesIO()

    # ── Colours ──────────────────────────────────────────────
    C_BG        = colors.HexColor("#0b0d14")
    C_SURFACE   = colors.HexColor("#13151c")
    C_BORDER    = colors.HexColor("#1e2030")
    C_TEXT      = colors.HexColor("#c9d1d9")
    C_MUTED     = colors.HexColor("#666677")
    C_BLUE      = colors.HexColor("#4daaff")
    C_GREEN     = colors.HexColor("#4dcc4d")
    C_RED       = colors.HexColor("#ff4d4d")
    C_ORANGE    = colors.HexColor("#ffaa00")
    C_YELLOW    = colors.HexColor("#ffdd55")
    C_WHITE     = colors.HexColor("#ffffff")

    SEV_COLOR = {
        "HIGH":   C_RED,
        "MEDIUM": C_ORANGE,
        "LOW":    C_BLUE,
        "INFO":   C_MUTED,
    }

    # ── Styles ────────────────────────────────────────────────
    styles = getSampleStyleSheet()

    def style(name, **kw):
        s = ParagraphStyle(name, **kw)
        return s

    S_TITLE = style("title",
        fontSize=28, leading=34, textColor=C_WHITE,
        fontName="Helvetica-Bold", spaceAfter=4
    )
    S_SUBTITLE = style("subtitle",
        fontSize=11, textColor=C_MUTED,
        fontName="Helvetica", spaceAfter=0
    )
    S_SECTION = style("section",
        fontSize=14, leading=20, textColor=C_WHITE,
        fontName="Helvetica-Bold", spaceBefore=18, spaceAfter=8
    )
    S_BODY = style("body",
        fontSize=9, leading=14, textColor=C_TEXT,
        fontName="Helvetica"
    )
    S_SMALL = style("small",
        fontSize=8, textColor=C_MUTED,
        fontName="Helvetica"
    )
    S_AI = style("ai",
        fontSize=9, leading=14, textColor=C_TEXT,
        fontName="Helvetica", leftIndent=12, spaceAfter=6
    )
    S_LABEL = style("label",
        fontSize=8, textColor=C_MUTED,
        fontName="Helvetica-Bold"
    )

    # ── Canvas callback for background + header line ──────────
    def draw_page(canvas, doc):
        canvas.saveState()
        w, h = A4
        # Dark background
        canvas.setFillColor(C_BG)
        canvas.rect(0, 0, w, h, fill=1, stroke=0)
        # Top accent bar
        canvas.setFillColor(C_BLUE)
        canvas.rect(0, h - 6*mm, w, 6*mm, fill=1, stroke=0)
        # Footer line
        canvas.setStrokeColor(C_BORDER)
        canvas.setLineWidth(0.5)
        canvas.line(20*mm, 14*mm, w - 20*mm, 14*mm)
        canvas.setFillColor(C_MUTED)
        canvas.setFont("Helvetica", 7)
        canvas.drawString(20*mm, 10*mm, "SecureOpsAI — Confidential Security Report")
        canvas.drawRightString(w - 20*mm, 10*mm, f"Page {doc.page}")
        canvas.restoreState()

    # ── Build document ────────────────────────────────────────
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=20*mm, rightMargin=20*mm,
        topMargin=22*mm, bottomMargin=22*mm,
        title="SecureOpsAI Security Report",
    )

    story = []

    # ── Cover / Header ────────────────────────────────────────
    story.append(Spacer(1, 10*mm))
    story.append(Paragraph("🛡️ SecureOpsAI", S_TITLE))
    story.append(Paragraph("Automated Security Scan Report", S_SUBTITLE))
    story.append(Spacer(1, 3*mm))

    gen_time = request.generated_at or datetime.utcnow().isoformat()
    try:
        dt = datetime.fromisoformat(gen_time.replace("Z", "+00:00"))
        readable = dt.strftime("%B %d, %Y at %H:%M UTC")
    except Exception:
        readable = gen_time

    story.append(Paragraph(f"Generated: {readable}", S_SMALL))
    story.append(Spacer(1, 4*mm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=C_BORDER))
    story.append(Spacer(1, 6*mm))

    # ── Collect all issues ─────────────────────────────────────
    code_issues = []
    deps_issues = []

    if request.code_results:
        cr = request.code_results
        if isinstance(cr, dict):
            code_issues = cr.get("issues") or cr.get("results") or []

    if request.deps_results:
        dr = request.deps_results
        if isinstance(dr, dict):
            deps_issues = dr.get("vulnerabilities") or dr.get("results") or []

    all_issues = code_issues + deps_issues

    # Count by severity
    sev_counts = {"HIGH": 0, "MEDIUM": 0, "LOW": 0, "INFO": 0}
    for issue in all_issues:
        s = (issue.get("issue_severity") or issue.get("severity") or "INFO").upper()
        sev_counts[s] = sev_counts.get(s, 0) + 1

    # ── Executive Summary ──────────────────────────────────────
    story.append(Paragraph("Executive Summary", S_SECTION))

    summary_data = [
        ["Metric", "Value"],
        ["Total Issues Found", str(len(all_issues))],
        ["High Severity", str(sev_counts["HIGH"])],
        ["Medium Severity", str(sev_counts["MEDIUM"])],
        ["Low Severity", str(sev_counts["LOW"])],
        ["Code Issues (SAST)", str(len(code_issues))],
        ["Dependency Vulnerabilities", str(deps_issues.__len__())],
    ]

    summary_table = Table(
        summary_data,
        colWidths=[100*mm, 60*mm],
        hAlign="LEFT"
    )
    summary_table.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0),  C_SURFACE),
        ("TEXTCOLOR",     (0, 0), (-1, 0),  C_BLUE),
        ("FONTNAME",      (0, 0), (-1, 0),  "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, 0),  9),
        ("BACKGROUND",    (0, 1), (-1, -1), C_BG),
        ("TEXTCOLOR",     (0, 1), (-1, -1), C_TEXT),
        ("FONTNAME",      (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE",      (0, 1), (-1, -1), 9),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [C_BG, C_SURFACE]),
        ("GRID",          (0, 0), (-1, -1), 0.5, C_BORDER),
        ("LEFTPADDING",   (0, 0), (-1, -1), 10),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 10),
        ("TOPPADDING",    (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        # Highlight high severity row
        ("TEXTCOLOR",     (1, 2), (1, 2),   C_RED),
        ("FONTNAME",      (1, 2), (1, 2),   "Helvetica-Bold"),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 6*mm))

    # ── Severity breakdown bar (text-based) ───────────────────
    if all_issues:
        story.append(Paragraph("Severity Breakdown", S_SECTION))

        bar_data = [[
            Paragraph(f'<font color="#ff4d4d"><b>HIGH: {sev_counts["HIGH"]}</b></font>', S_BODY),
            Paragraph(f'<font color="#ffaa00"><b>MEDIUM: {sev_counts["MEDIUM"]}</b></font>', S_BODY),
            Paragraph(f'<font color="#4daaff"><b>LOW: {sev_counts["LOW"]}</b></font>', S_BODY),
            Paragraph(f'<font color="#888888"><b>INFO: {sev_counts["INFO"]}</b></font>', S_BODY),
        ]]
        bar_t = Table(bar_data, colWidths=[42*mm, 42*mm, 42*mm, 42*mm], hAlign="LEFT")
        bar_t.setStyle(TableStyle([
            ("BACKGROUND",   (0, 0), (-1, -1), C_SURFACE),
            ("GRID",         (0, 0), (-1, -1), 0.5, C_BORDER),
            ("TOPPADDING",   (0, 0), (-1, -1), 10),
            ("BOTTOMPADDING",(0, 0), (-1, -1), 10),
            ("LEFTPADDING",  (0, 0), (-1, -1), 12),
        ]))
        story.append(bar_t)
        story.append(Spacer(1, 6*mm))

    # ── Helper: render a list of issues ───────────────────────
    def render_issues(issues, heading):
        if not issues:
            return

        story.append(PageBreak())
        story.append(Paragraph(heading, S_SECTION))
        story.append(HRFlowable(width="100%", thickness=0.5, color=C_BORDER))
        story.append(Spacer(1, 4*mm))

        for i, issue in enumerate(issues, 1):
            sev = (issue.get("issue_severity") or issue.get("severity") or "INFO").upper()
            sev_color = SEV_COLOR.get(sev, C_MUTED)

            # Issue header row
            title_text = (
                issue.get("issue_text") or
                issue.get("vulnerability") or
                issue.get("description") or
                "Security Issue"
            )

            header_data = [[
                Paragraph(f'<font color="#{sev_color.hexval()[2:]}"><b>[{sev}]</b></font> '
                          f'<font color="#e0e0e0">{title_text}</font>', S_BODY),
                Paragraph(f'<font color="#555555">#{i}</font>', S_SMALL),
            ]]

            header_t = Table(header_data, colWidths=[148*mm, 20*mm], hAlign="LEFT")
            header_t.setStyle(TableStyle([
                ("BACKGROUND",   (0, 0), (-1, -1), C_SURFACE),
                ("TOPPADDING",   (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING",(0, 0), (-1, -1), 9),
                ("LEFTPADDING",  (0, 0), (-1, -1), 12),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("LINEBEFORE",   (0, 0), (0, -1),  3, sev_color),
            ]))
            story.append(header_t)

            # Detail rows
            detail_rows = []
            if issue.get("filename"):
                detail_rows.append(["File", issue["filename"]])
            if issue.get("line_number"):
                detail_rows.append(["Line", str(issue["line_number"])])
            if issue.get("test_id"):
                detail_rows.append(["Test ID", issue["test_id"]])
            if issue.get("package"):
                detail_rows.append(["Package", issue["package"]])
            if issue.get("cve"):
                detail_rows.append(["CVE", issue["cve"]])
            if issue.get("advisory"):
                detail_rows.append(["Advisory", issue["advisory"]])
            if issue.get("more_info"):
                detail_rows.append(["Reference", issue["more_info"]])

            if detail_rows:
                dt = Table(
                    [[Paragraph(r[0], S_LABEL), Paragraph(r[1], S_BODY)] for r in detail_rows],
                    colWidths=[28*mm, 140*mm],
                    hAlign="LEFT"
                )
                dt.setStyle(TableStyle([
                    ("BACKGROUND",    (0, 0), (-1, -1), C_BG),
                    ("TEXTCOLOR",     (0, 0), (0, -1),  C_MUTED),
                    ("TOPPADDING",    (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                    ("LEFTPADDING",   (0, 0), (-1, -1), 12),
                    ("LINEBELOW",     (0, -1), (-1, -1), 0.5, C_BORDER),
                ]))
                story.append(dt)

            # AI Analysis block
            if issue.get("ai_analysis"):
                ai_data = [[
                    Paragraph("AI Analysis", S_LABEL),
                    Paragraph(issue["ai_analysis"], S_AI),
                ]]
                ai_t = Table(ai_data, colWidths=[28*mm, 140*mm], hAlign="LEFT")
                ai_t.setStyle(TableStyle([
                    ("BACKGROUND",    (0, 0), (-1, -1), colors.HexColor("#0d1117")),
                    ("TOPPADDING",    (0, 0), (-1, -1), 8),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                    ("LEFTPADDING",   (0, 0), (-1, -1), 12),
                    ("LINEBEFORE",    (0, 0), (-1, -1), 2, C_BLUE),
                    ("LINEBELOW",     (0, -1), (-1, -1), 0.5, C_BORDER),
                ]))
                story.append(ai_t)

            story.append(Spacer(1, 4*mm))

    render_issues(code_issues, "Code Security Issues (SAST — Bandit)")
    render_issues(deps_issues, "Dependency Vulnerabilities")

    # ── AI Summaries ──────────────────────────────────────────
    summaries = []
    if request.code_results and isinstance(request.code_results, dict):
        s = request.code_results.get("ai_summary")
        if s:
            summaries.append(("Code Scan AI Summary", s))
    if request.deps_results and isinstance(request.deps_results, dict):
        s = request.deps_results.get("ai_summary")
        if s:
            summaries.append(("Dependency Scan AI Summary", s))

    if summaries:
        story.append(PageBreak())
        story.append(Paragraph("AI-Powered Analysis", S_SECTION))
        story.append(HRFlowable(width="100%", thickness=0.5, color=C_BORDER))
        story.append(Spacer(1, 4*mm))
        for title_text, summary_text in summaries:
            story.append(Paragraph(title_text, style("sh", fontSize=11, textColor=C_BLUE,
                                                     fontName="Helvetica-Bold", spaceAfter=6, spaceBefore=10)))
            box_data = [[Paragraph(summary_text, S_AI)]]
            box_t = Table(box_data, colWidths=[168*mm], hAlign="LEFT")
            box_t.setStyle(TableStyle([
                ("BACKGROUND",    (0, 0), (-1, -1), colors.HexColor("#0d1117")),
                ("TOPPADDING",    (0, 0), (-1, -1), 12),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
                ("LEFTPADDING",   (0, 0), (-1, -1), 16),
                ("RIGHTPADDING",  (0, 0), (-1, -1), 12),
                ("LINEBEFORE",    (0, 0), (-1, -1), 3, C_BLUE),
                ("BOX",           (0, 0), (-1, -1), 0.5, C_BORDER),
            ]))
            story.append(box_t)
            story.append(Spacer(1, 4*mm))

    # ── Build ─────────────────────────────────────────────────
    doc.build(story, onFirstPage=draw_page, onLaterPages=draw_page)

    buffer.seek(0)
    filename = f"SecureOpsAI_Report_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
