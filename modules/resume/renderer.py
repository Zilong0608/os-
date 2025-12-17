from .schemas import RenderInput, RenderOutput
from modules.matching.schemas import MatchInput
from modules.matching.engine import match as run_match
from .refiner import refine_profile_with_llm


def _escape(s: str | None) -> str:
    if not s:
        return ""
    return (
        s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def _list(items):
    if not items:
        return "<ul></ul>"
    lis = "\n".join([f"<li>{_escape(i)}</li>" for i in items if i])
    return f"<ul>\n{lis}\n</ul>"


def _format_period(start: str | None, end: str | None) -> str:
    parts = []
    if start:
        parts.append(start)
    if end:
        parts.append(end)
    return " - ".join(parts)


def render_html(input: RenderInput) -> RenderOutput:
    profile = input.profile
    jd = input.jd

    # Optional LLM-based refinement
    refine_notes = []
    refined_summary = None
    if input.polish and not getattr(input, 'preserve', False):
        try:
            refined_profile, refined_summary, notes = refine_profile_with_llm(profile, jd)
            profile = refined_profile or profile
            refine_notes = notes or []
        except Exception:
            pass

    name = _escape(getattr(profile, "name", None) or "Your Name")
    contact = _escape(getattr(profile, "contact", None) or "")
    location = _escape(getattr(profile, "location", None) or "")

    # Experience bullets
    exp_sections = []
    for exp in (profile.experience or []):
        bullets = exp.bullets or []
        exp_sections.append({
            "company": getattr(exp, "company", ""),
            "role": getattr(exp, "role", ""),
            "start": getattr(exp, "start", ""),
            "end": getattr(exp, "end", ""),
            "bullets": bullets,
        })

    # Education
    edu_sections = []
    for edu in (profile.education or []):
        edu_sections.append({
            "school": getattr(edu, "school", ""),
            "degree": getattr(edu, "degree", ""),
            "major": getattr(edu, "major", ""),
            "start": getattr(edu, "start", ""),
            "end": getattr(edu, "end", ""),
        })

    summary = refined_summary or (getattr(profile, "summary", None) or "")

    # 强制白底黑字风格 (Mirror Studio 统一视觉)
    style = """
    <style>
        @page { margin: 15mm; }
        body { 
            font-family: 'Inter', -apple-system, 'Segoe UI', sans-serif; 
            font-size: 11pt; 
            color: #1a1a1a !important; 
            line-height: 1.5; 
            background: #ffffff !important; 
            margin: 0; 
            padding: 30px; 
        }
        h1 { font-size: 24pt; margin: 0 0 5pt; color: #000 !important; font-weight: 800; border: none; }
        .contact { font-size: 10pt; color: #666; margin-bottom: 25pt; border-bottom: 1px solid #eee; padding-bottom: 10pt; }
        h2 { font-size: 13pt; margin: 20pt 0 8pt; color: #000 !important; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; border-bottom: 1.5pt solid #000; padding-bottom: 3pt; }
        h3 { font-size: 11pt; margin: 12pt 0 3pt; color: #222 !important; font-weight: 700; }
        .date { float: right; color: #666; font-weight: normal; font-size: 10pt; }
        ul { margin: 5pt 0 0 15pt; padding: 0; }
        li { margin: 3pt 0; color: #333; }
        p { margin: 5pt 0; color: #333; }
        .clearfix::after { content: ""; clear: both; display: table; }
    </style>
    """

    html_parts = [
        "<html><head><meta charset='utf-8'>",
        style,
        "</head><body>",
        f"<h1>{name}</h1>",
        f"<div class='contact'>{contact}{(' | ' + location) if location else ''}</div>",
        "<h2>个人简介</h2>",
        f"<p>{_escape(summary)}</p>",
    ]

    html_parts.append("<h2>教育背景</h2>")
    for edu in edu_sections:
        school = _escape(edu["school"])
        major = _escape(edu["major"])
        period = _format_period(edu["start"], edu["end"])
        html_parts.append(f"<div class='clearfix'><strong>{school}</strong> <span class='date'>{period}</span></div>")
        html_parts.append(f"<div>{_escape(edu['degree'])} · {major}</div>")

    html_parts.append("<h2>工作经历</h2>")
    for sec in exp_sections:
        comp = _escape(sec["company"])
        role = _escape(sec["role"])
        period = _format_period(sec["start"], sec["end"])
        html_parts.append(f"<div class='clearfix'><strong>{role} @ {comp}</strong> <span class='date'>{period}</span></div>")
        html_parts.append(_list(sec["bullets"]))

    html_parts.append("<h2>核心技能</h2>")
    skills = profile.skills or []
    html_parts.append(f"<p>{', '.join(skills)}</p>")

    html_parts.append("</body></html>")
    
    return RenderOutput(html="".join(html_parts))
