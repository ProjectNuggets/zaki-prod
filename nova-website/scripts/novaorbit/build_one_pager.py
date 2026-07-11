from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[2]
OUTPUT_DIR = ROOT / "output" / "pdf"
PUBLIC_DIR = ROOT / "public" / "assets" / "downloads"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
PUBLIC_DIR.mkdir(parents=True, exist_ok=True)

PDF_PATH = OUTPUT_DIR / "novaorbit-one-pager.pdf"
PUBLIC_PDF_PATH = PUBLIC_DIR / "novaorbit-one-pager.pdf"
DOWNLOAD_COPY_PATH = Path.home() / "Downloads" / "novaorbit-one-pager-polished.pdf"
LOGO_PATH = ROOT / "public" / "assets" / "nova-nuggets-logo-cut-transparent.png"
BOOKING_URL = "https://calendar.app.google/7rmv1kwmYhum1TTT9"
ORBIT_URL = "https://novanuggets.com/nova-orbit/"
CONTACT_EMAIL = "hello@novanuggets.com"
CONTACT_URL = "mailto:hello@novanuggets.com?subject=NovaOrbit%20assessment%20request"

INK = colors.HexColor("#17120E")
DEEP = colors.HexColor("#0F0C09")
PAPER = colors.HexColor("#FFFAF1")
SAND = colors.HexColor("#EFE4D2")
HAZE = colors.HexColor("#F6EFE3")
EMBER = colors.HexColor("#C9582C")
TERRA = colors.HexColor("#A65B36")
SAGE = colors.HexColor("#6EA888")
RED = colors.HexColor("#8F2F1C")
LINE = colors.HexColor("#D8CDBB")
MUTED = colors.HexColor("#6F665D")


def string_width(c, text, font, size):
    return c.stringWidth(text, font, size)


def wrap_to_width(c, text, width, font="Helvetica", size=8):
    words = text.split()
    lines = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if string_width(c, candidate, font, size) <= width:
            current = candidate
            continue
        if current:
            lines.append(current)
        current = word
    if current:
        lines.append(current)
    return lines


def draw_wrapped(c, text, x, y, width, font="Helvetica", size=8, leading=10, color=INK, max_lines=None):
    c.setFillColor(color)
    c.setFont(font, size)
    lines = wrap_to_width(c, text, width, font, size)
    if max_lines is not None and len(lines) > max_lines:
        lines = lines[:max_lines]
        while lines and string_width(c, f"{lines[-1]}...", font, size) > width:
            lines[-1] = lines[-1].rsplit(" ", 1)[0]
        if lines:
            lines[-1] = f"{lines[-1]}..."
    for line in lines:
        c.drawString(x, y, line)
        y -= leading
    return y


def label(c, text, x, y, color=EMBER):
    c.setFillColor(color)
    c.setFont("Helvetica-Bold", 6.6)
    c.drawString(x, y, text.upper())


def heading(c, text, x, y, size=18, color=INK):
    c.setFillColor(color)
    c.setFont("Helvetica-Bold", size)
    c.drawString(x, y, text)


def box(c, x, y, w, h, fill=PAPER, stroke=LINE, line_width=0.7):
    c.setFillColor(fill)
    c.setStrokeColor(stroke)
    c.setLineWidth(line_width)
    c.rect(x, y, w, h, fill=1, stroke=1)


def diamond(c, x, y, r, fill, stroke=PAPER):
    c.setFillColor(fill)
    c.setStrokeColor(stroke)
    c.setLineWidth(1.0)
    p = c.beginPath()
    p.moveTo(x, y + r)
    p.lineTo(x + r, y)
    p.lineTo(x, y - r)
    p.lineTo(x - r, y)
    p.close()
    c.drawPath(p, fill=1, stroke=1)


def stat(c, x, y, value, label_text):
    c.setFillColor(PAPER)
    c.setFont("Helvetica-Bold", 13)
    c.drawString(x, y, value)
    c.setFillColor(colors.HexColor("#D8CDBB"))
    c.setFont("Helvetica-Bold", 6.2)
    c.drawString(x + 26, y + 3, label_text.upper())


def draw_grid_background(c, w, h, step=34):
    c.setStrokeColor(colors.HexColor("#E3D6C3"))
    c.setLineWidth(0.25)
    x = 0
    while x <= w:
        c.line(x, 0, x, h)
        x += step
    y = 0
    while y <= h:
        c.line(0, y, w, y)
        y += step


def draw_outcome_strip(c, x, y, w, h):
    box(c, x, y, w, h, fill=DEEP, stroke=colors.HexColor("#2A211B"))
    cols = [
        ("FINAL READ", "Stage 2", "Connected AI"),
        ("GATE CAP", "Stage 2", "3 active gates"),
        ("NEXT TARGET", "Stage 3", "Operational AI"),
        ("COMMERCIAL STEP", "NovaOrbit In-Depth", "4-6 weeks / EUR 18k"),
    ]
    col_w = w / 4
    for idx, (kicker, value, sub) in enumerate(cols):
        cx = x + idx * col_w
        if idx:
            c.setStrokeColor(colors.HexColor("#342922"))
            c.setLineWidth(0.55)
            c.line(cx, y, cx, y + h)
        label(c, kicker, cx + 12, y + h - 18)
        c.setFillColor(PAPER)
        c.setFont("Helvetica-Bold", 14 if idx < 3 else 12)
        c.drawString(cx + 12, y + 28, value)
        c.setFillColor(colors.HexColor("#CFC2B1"))
        c.setFont("Helvetica-Bold", 5.8)
        c.drawString(cx + 12, y + 15, sub.upper())


def draw_maturity_map(c, x, y, w, h):
    box(c, x, y, w, h, fill=colors.HexColor("#FBF5EA"), stroke=LINE)
    header_h = 38
    bench_w = 170
    action_w = 155
    track_w = w - bench_w - action_w
    row_h = (h - header_h - 3 * 18) / 12

    box(c, x, y + h - header_h, w, header_h, fill=DEEP, stroke=DEEP)
    label(c, "Benchmark", x + 10, y + h - 24, color=colors.HexColor("#CFC2B1"))
    label(c, "Definitive action", x + bench_w + track_w + 10, y + h - 24, color=colors.HexColor("#CFC2B1"))
    stages = [
        ("S1", "Ad Hoc"),
        ("S2", "Connected"),
        ("S3", "Operational"),
        ("S4", "Owned"),
    ]
    stage_w = track_w / 4
    for i, (stage, name) in enumerate(stages):
        sx = x + bench_w + i * stage_w
        c.setStrokeColor(colors.HexColor("#332923"))
        c.setLineWidth(0.45)
        c.line(sx, y + h - header_h, sx, y + h)
        c.setFillColor(PAPER)
        c.setFont("Helvetica-Bold", 7)
        c.drawString(sx + 8, y + h - 18, stage)
        c.setFillColor(colors.HexColor("#B8AFA2"))
        c.setFont("Helvetica", 5.8)
        c.drawString(sx + 8, y + h - 29, name)
    c.line(x + bench_w + track_w, y + h - header_h, x + bench_w + track_w, y + h)

    groups = [
        (
            "WHERE",
            "Infrastructure & Access",
            "Where can AI work?",
            [
                ("W1", "Deployment Boundary", 3, None, "Validate boundary"),
                ("W2", "Inference Readiness", 3, None, "Set cost/fallback"),
                ("W3", "Access Readiness", 2, "No access, no AI", "Approve access path"),
                ("W4", "Control Plane", 3, None, "Design run ledger"),
            ],
        ),
        (
            "WHAT",
            "Apps & Agents",
            "What should AI do?",
            [
                ("A1", "Workflow Fit", 3, None, "Define first workflow"),
                ("A2", "Agent Role", 2, "No reliability, no autonomy", "Set evals/fallback"),
                ("A3", "App Surface", 3, None, "Define surface"),
                ("A4", "Integration Depth", 3, None, "Approve read path"),
            ],
        ),
        (
            "HOW",
            "Operations & Impact",
            "How does value scale?",
            [
                ("H1", "Ownership", 3, None, "Name owners"),
                ("H2", "Business Case", 2, "No evidence, no scale", "Build baseline"),
                ("H3", "Governance", 3, None, "Document oversight"),
                ("H4", "Run Model", 3, None, "Set run cadence"),
            ],
        ),
    ]

    yy = y + h - header_h
    for group, title, question, rows in groups:
        group_h = 18
        yy -= group_h
        box(c, x, yy, w, group_h, fill=colors.HexColor("#EFE7D9"), stroke=LINE, line_width=0.4)
        label(c, group, x + 10, yy + 6)
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(x + 54, yy + 5, title)
        c.setFillColor(MUTED)
        c.setFont("Helvetica", 5.8)
        c.drawRightString(x + w - 10, yy + 6, question.upper())

        for code, bench, stage, gate, action in rows:
            yy -= row_h
            box(c, x, yy, w, row_h, fill=colors.HexColor("#FFF8ED"), stroke=colors.HexColor("#E3D7C5"), line_width=0.35)
            c.setFillColor(EMBER)
            c.setFont("Helvetica-Bold", 5.9)
            c.drawString(x + 10, yy + row_h - 8, code)
            c.setFillColor(INK)
            c.setFont("Helvetica-Bold", 7.7)
            c.drawString(x + 30, yy + row_h - 9, bench)
            c.setFillColor(MUTED)
            c.setFont("Helvetica", 5.7)
            c.drawString(x + 30, yy + 5, f"Stage {stage}")

            track_x = x + bench_w
            for i in range(5):
                lx = track_x + i * stage_w
                c.setStrokeColor(colors.HexColor("#DED2C0"))
                c.setLineWidth(0.3)
                c.line(lx, yy, lx, yy + row_h)
            marker_y = yy + row_h / 2
            current_x = track_x + (stage - 1) * stage_w + stage_w / 2
            target_x = track_x + 2 * stage_w + stage_w / 2
            if gate:
                c.setStrokeColor(colors.HexColor("#BFD4C3"))
                c.setLineWidth(3.2)
                c.line(current_x, marker_y, target_x, marker_y)
                c.setFillColor(colors.HexColor("#F1D9CE"))
                c.setStrokeColor(colors.HexColor("#C99A87"))
                c.rect(current_x - 10, marker_y + 7, 20, 9, fill=1, stroke=1)
                c.setFillColor(RED)
                c.setFont("Helvetica-Bold", 4.5)
                c.drawCentredString(current_x, marker_y + 9.8, "CAP")
                diamond(c, current_x, marker_y, 6, RED)
            diamond(c, target_x if gate else current_x, marker_y, 6, SAGE)

            action_x = x + bench_w + track_w + 10
            action_width = action_w - 20
            if gate:
                c.setFillColor(RED)
                c.setFont("Helvetica-Bold", 5.1)
                c.drawString(action_x, yy + row_h - 9, gate.upper())
                draw_wrapped(c, action, action_x, yy + row_h - 18, action_width, size=5.5, leading=6.1, color=MUTED, max_lines=2)
            else:
                draw_wrapped(c, action, action_x, marker_y + 3, action_width, size=5.5, leading=6.1, color=MUTED, max_lines=2)


def draw_side_panel(c, x, y, w, h):
    top_h = 122
    box(c, x, y + h - top_h, w, top_h, fill=DEEP, stroke=colors.HexColor("#2A211B"))
    label(c, "Paid entry", x + 12, y + h - 22)
    c.setFillColor(PAPER)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(x + 12, y + h - 46, "Choose by risk.")
    offers = [
        ("Standard", "2 weeks / EUR 10,000", "Board-ready read and first-workflow direction."),
        ("In-Depth", "4-6 weeks / EUR 18,000", "Validate stack, access, ROI, governance, and 90-day roadmap."),
    ]
    yy = y + h - 68
    for name, price, text in offers:
        c.setFillColor(EMBER)
        c.setFont("Helvetica-Bold", 7.2)
        c.drawString(x + 12, yy, name)
        c.setFillColor(PAPER)
        c.setFont("Helvetica-Bold", 7.2)
        c.drawRightString(x + w - 12, yy, price)
        yy = draw_wrapped(c, text, x + 12, yy - 10, w - 24, size=6.4, leading=7.4, color=colors.HexColor("#D8CDBB"), max_lines=2)
        yy -= 5

    output_h = 116
    output_y = y + h - top_h - output_h - 8
    box(c, x, output_y, w, output_h, fill=HAZE, stroke=LINE)
    label(c, "What the buyer gets", x + 12, output_y + output_h - 18)
    outputs = [
        ("Maturity score", "Where, What, How stage read."),
        ("Red-gate cap", "Blockers that cannot be averaged away."),
        ("First workflow", "Owner, agent role, app surface, metric."),
        ("Build path", "Deployment, controls, 30-day action plan."),
    ]
    yy = output_y + output_h - 34
    for name, text in outputs:
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 6.8)
        c.drawString(x + 12, yy, name)
        draw_wrapped(c, text, x + 82, yy, w - 94, size=6.0, leading=6.8, color=MUTED, max_lines=1)
        yy -= 18

    method_y = y
    method_h = output_y - y - 8
    box(c, x, method_y, w, method_h, fill=colors.white, stroke=LINE)
    label(c, "Method and gates", x + 12, method_y + method_h - 18)
    heading(c, "Interviews to build decision.", x + 12, method_y + method_h - 38, size=12.5)
    steps = [
        ("Interview", "C-level, IT/security, finance, owners."),
        ("Inspect", "Stack, APIs, MCPs, access, deployment."),
        ("Score", "3 dimensions, 12 benchmarks, red gates."),
        ("Decide", "Workflow, owner map, value model, proposal."),
    ]
    yy = method_y + method_h - 56
    for name, text in steps:
        c.setFillColor(EMBER)
        c.setFont("Helvetica-Bold", 6.4)
        c.drawString(x + 12, yy, name.upper())
        draw_wrapped(c, text, x + 60, yy, w - 72, size=6.3, leading=7, color=MUTED, max_lines=1)
        yy -= 13.5
    c.setStrokeColor(LINE)
    c.setLineWidth(0.55)
    c.line(x + 12, method_y + 34, x + w - 12, method_y + 34)
    draw_wrapped(
        c,
        "Red gates: no access, no workflow, no owner, no evidence, no reliability. Open gates cap the maturity stage until resolved.",
        x + 12,
        method_y + 24,
        w - 24,
        size=6.2,
        leading=7.2,
        color=MUTED,
        max_lines=3,
    )


def main():
    width, height = landscape(A4)
    c = canvas.Canvas(str(PDF_PATH), pagesize=(width, height))
    c.setTitle("NovaOrbit One-Pager")
    c.setAuthor("Nova Nuggets")
    c.setSubject("NovaOrbit AI maturity assessment one-page sales opener")
    c.setKeywords("NovaOrbit, AI maturity, AI assessment, Nova Nuggets, ZAKI")

    c.setFillColor(PAPER)
    c.rect(0, 0, width, height, fill=1, stroke=0)
    draw_grid_background(c, width, height)

    margin = 26
    header_h = 126
    c.setFillColor(DEEP)
    c.rect(0, height - header_h, width, header_h, fill=1, stroke=0)
    if LOGO_PATH.exists():
        c.drawImage(ImageReader(str(LOGO_PATH)), margin, height - 76, width=34, height=34, mask="auto")

    title_x = margin + 48
    label(c, "NovaOrbit AI maturity assessment", title_x, height - 34)
    c.setFillColor(PAPER)
    c.setFont("Helvetica-Bold", 23)
    c.drawString(title_x, height - 55, "Closing the last mile")
    c.drawString(title_x, height - 82, "between AI and humans")
    c.setFillColor(colors.HexColor("#D8CDBB"))
    c.setFont("Helvetica", 8.8)
    c.drawString(title_x, height - 102, "Where AI can work, what it should do, and how the business captures measurable impact.")
    stat_x = title_x
    for value, text in [("3", "dimensions"), ("12", "benchmarks"), ("4", "stages"), ("5", "red gates")]:
        stat(c, stat_x, height - 120, value, text)
        stat_x += 98

    cta_x = width - 228
    cta_y = height - 98
    cta_w = 196
    cta_h = 60
    c.setFillColor(EMBER)
    c.roundRect(cta_x, cta_y, cta_w, cta_h, 4, fill=1, stroke=0)
    c.setFillColor(PAPER)
    c.setFont("Helvetica-Bold", 12)
    c.drawCentredString(cta_x + cta_w / 2, cta_y + 37, "Book NovaOrbit")
    c.setFont("Helvetica", 7.6)
    c.drawCentredString(cta_x + cta_w / 2, cta_y + 23, "EUR 10k Standard / EUR 18k In-Depth")
    c.setFont("Helvetica", 6.6)
    c.drawCentredString(cta_x + cta_w / 2, cta_y + 10, "fixed-price assessment to build decision")
    c.linkURL(BOOKING_URL, (cta_x, cta_y, cta_x + cta_w, cta_y + cta_h), relative=0, thickness=0)

    body_top = height - header_h - 22
    outcome_h = 58
    map_x = margin
    side_gap = 14
    side_w = 214
    map_w = width - margin * 2 - side_w - side_gap
    map_h = 332
    outcome_y = body_top - outcome_h
    draw_outcome_strip(c, map_x, outcome_y, map_w, outcome_h)
    draw_maturity_map(c, map_x, outcome_y - 12 - map_h, map_w, map_h)
    draw_side_panel(c, map_x + map_w + side_gap, outcome_y - 12 - map_h, side_w, outcome_h + 12 + map_h)

    c.setFillColor(DEEP)
    c.rect(0, 0, width, 26, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#D8CDBB"))
    c.setFont("Helvetica", 7.2)
    c.drawString(margin, 9.5, "Nova Nuggets - AI infrastructure, ZAKI agents, AI apps, and operationalisation.")
    footer_text = f"novanuggets.com/nova-orbit/ | {CONTACT_EMAIL}"
    c.drawRightString(width - margin, 9.5, footer_text)
    c.linkURL(ORBIT_URL, (width - margin - 182, 5, width - margin - 64, 18), relative=0, thickness=0)
    c.linkURL(CONTACT_URL, (width - margin - 61, 5, width - margin, 18), relative=0, thickness=0)

    c.showPage()
    c.save()
    PUBLIC_PDF_PATH.write_bytes(PDF_PATH.read_bytes())
    DOWNLOAD_COPY_PATH.write_bytes(PDF_PATH.read_bytes())
    print(PDF_PATH)
    print(PUBLIC_PDF_PATH)
    print(DOWNLOAD_COPY_PATH)


if __name__ == "__main__":
    main()
