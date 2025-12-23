import re
from typing import List, Set, Tuple, Iterable
from .schemas import MatchInput, MatchResult


WORD_RE = re.compile(r"[A-Za-z0-9+#\.]+")
STOP_TOKENS = {
    "and",
    "with",
    "for",
    "the",
    "to",
    "of",
    "in",
    "on",
    "team",
    "work",
    "skills",
    "experience",
    "support",
    "manage",
    "management",
    "customer",
    "service",
    "services",
    "operations",
    "project",
    "projects",
    "responsibilities",
    "ability",
    "agile",
    "australia",
    "australian",
    "are",
    "back",
    "bachelor",
    "based",
    "business",
    "country",
    "degree",
    "engineer",
    "environment",
    "excellent",
    "experience",
    "field",
    "global",
    "industry",
    "knowledge",
    "opportunity",
    "required",
    "requirements",
    "responsibility",
    "role",
    "strong",
    "teamwork",
    "years",
    "year",
}

DISPLAY_MAP = {
    "sql": "SQL",
    "aws": "AWS",
    "gcp": "GCP",
    "api": "API",
    "apis": "APIs",
    "ci": "CI",
    "cd": "CD",
    "ai": "AI",
    "ml": "ML",
    "llm": "LLM",
    "llms": "LLMs",
    "python": "Python",
    "java": "Java",
    "javascript": "JavaScript",
    "typescript": "TypeScript",
    "react": "React",
    "fastapi": "FastAPI",
}

SKILL_HINTS = {
    "python",
    "java",
    "javascript",
    "typescript",
    "react",
    "node",
    "sql",
    "aws",
    "gcp",
    "azure",
    "docker",
    "kubernetes",
    "c++",
    "c#",
    "go",
    "golang",
    "graphql",
    "rest",
    "api",
    "linux",
    "git",
    "terraform",
    "postgres",
    "mysql",
    "mongodb",
    "redis",
    "spark",
    "hadoop",
    "kafka",
}

def _tokens_from_texts(texts: List[str]) -> Set[str]:
    toks: Set[str] = set()
    for t in texts or []:
        for w in WORD_RE.findall(t.lower()):
            if len(w) <= 2:
                continue
            toks.add(w)
    return toks


def _normalize_profile(input: MatchInput) -> Set[str]:
    p = input.profile
    toks: Set[str] = set()
    # skills
    for s in (p.skills or []):
        toks.add(s.lower())
    # courses skills/topics/tools
    for c in (p.courses or []):
        for s in (c.skills or []):
            toks.add(s.lower())
        for s in (c.topics or []):
            toks.add(s.lower())
        for s in (c.tools or []):
            toks.add(s.lower())
    # experience bullets
    for exp in (p.experience or []):
        toks |= _tokens_from_texts(exp.bullets or [])
    # projects bullets (reusing Experience schema)
    for proj in (p.projects or []):
        toks |= _tokens_from_texts(proj.bullets or [])
    return toks


def _normalize_jd(input: MatchInput) -> Tuple[Set[str], Set[str]]:
    jd = input.jd
    key = set([k.lower() for k in (jd.keywords or []) if k])
    title_tokens = _tokens_from_texts([jd.title or ""])
    key |= title_tokens
    req = _tokens_from_texts((jd.requirements or []) + (jd.responsibilities or []))
    return key, req


def _clean_token(token: str) -> str | None:
    t = token.strip().lower()
    if not t:
        return None
    if t in STOP_TOKENS:
        return None
    if t.isdigit() or any(ch.isdigit() for ch in t):
        return None
    return t


def _filter_tokens(tokens: Iterable[str]) -> List[str]:
    cleaned = []
    seen = set()
    for tok in tokens:
        ct = _clean_token(tok)
        if not ct or ct in seen:
            continue
        seen.add(ct)
        cleaned.append(ct)
    return cleaned


def _is_skill_token(token: str) -> bool:
    if token in DISPLAY_MAP or token in SKILL_HINTS:
        return True
    if "+" in token or "#" in token or "." in token:
        return True
    return False


def _filter_skill_tokens(tokens: Iterable[str]) -> List[str]:
    cleaned = []
    seen = set()
    for tok in tokens:
        ct = _clean_token(tok)
        if not ct or ct in seen:
            continue
        if not _is_skill_token(ct):
            continue
        seen.add(ct)
        cleaned.append(ct)
    return cleaned


def _display_token(token: str) -> str:
    if token in DISPLAY_MAP:
        return DISPLAY_MAP[token]
    if len(token) <= 3:
        return token.upper()
    return token.replace("_", " ").title()


def _format_tokens(tokens: Iterable[str], limit: int = 6) -> str:
    filtered = _filter_tokens(tokens)
    if not filtered:
        return ""
    display = [_display_token(tok) for tok in filtered[:limit]]
    suffix = "..." if len(filtered) > limit else ""
    return ", ".join(display) + suffix


def _collect_bullet_evidence(tokens: Set[str], input: MatchInput, limit: int = 3) -> List[str]:
    if not tokens:
        return []
    evidence = []
    seen = set()
    meaningful_tokens = set(_filter_tokens(tokens))
    if not meaningful_tokens:
        return []
    for exp in input.profile.experience or []:
        role = (exp.role or "").strip()
        company = (exp.company or "").strip()
        prefix = " / ".join(filter(None, [role, company])) or (company or role) or "Experience"
        for bullet in exp.bullets or []:
            if not bullet:
                continue
            low = bullet.lower()
            if not any(tok in low for tok in meaningful_tokens):
                continue
            key = (prefix, bullet)
            if key in seen:
                continue
            seen.add(key)
            evidence.append((prefix, bullet))
    return [f"{prefix} - {bullet}" for prefix, bullet in evidence[:limit]]


def match(input: MatchInput) -> MatchResult:
    prof = _normalize_profile(input)
    jd_key, jd_req = _normalize_jd(input)

    # Matches
    hit_key = sorted(jd_key & prof)
    hit_req = sorted(jd_req & prof)
    display_hit_key = _filter_tokens(hit_key)
    display_hit_req = _filter_skill_tokens(hit_req)

    # Scores (0-100)
    # 60% from JD keywords overlap, 40% from requirements/responsibilities tokens
    key_ratio = (len(hit_key) / max(1, len(jd_key))) if jd_key else 0
    req_ratio = (len(hit_req) / max(1, len(jd_req))) if jd_req else 0
    score = int(round(100 * (0.6 * key_ratio + 0.4 * req_ratio)))

    # Reasons
    reasons: List[str] = []
    if display_hit_key:
        reasons.append(f"Matched skills: {_format_tokens(display_hit_key, limit=6)}")
    evidence = _collect_bullet_evidence(set(display_hit_key) | set(display_hit_req), input)
    for item in evidence:
        reasons.append(f"Relevant experience: {item}")
    if input.jd.location and input.profile.location:
        profile_loc = input.profile.location.lower()
        if input.jd.location.lower() in profile_loc:
            reasons.append(f"Location match: {input.jd.location}")

    # Gaps
    gaps_key = sorted(jd_key - prof)
    gaps_req = sorted({tok for tok in (jd_req - prof) if tok not in STOP_TOKENS})
    display_gaps_key = _filter_tokens(gaps_key)
    display_gaps_req = _filter_skill_tokens(gaps_req)
    gaps: List[str] = []
    if display_gaps_key:
        gaps.append(f"Missing key skills: {_format_tokens(display_gaps_key, limit=6)}")
    if display_gaps_req:
        gaps.append(f"Missing responsibility keywords: {_format_tokens(display_gaps_req, limit=6)}")

    if not reasons:
        if jd_key or jd_req:
            reasons.append("No clear overlaps found yet.")
        else:
            reasons.append("JD data is too short to match.")
    if not gaps:
        if jd_key or jd_req:
            gaps.append("No major gaps detected from the available JD.")
        else:
            gaps.append("Add a richer JD to generate gap insights.")

    # Recommendations
    recs: List[str] = []
    if display_gaps_key:
        recs.append(f"Add evidence for: {_format_tokens(display_gaps_key, limit=5)}")
    if display_gaps_req:
        recs.append("Add concrete examples that map to the responsibilities.")
    for kw, tip in [
        ("fastapi", "If relevant, add FastAPI/API design and testing examples."),
        ("c++", "If relevant, add concrete C++ projects and performance results."),
        ("python", "If relevant, add Python examples (async/data/scripts)."),
        ("aws", "If relevant, add AWS services used and impact."),
    ]:
        if kw in (jd_key | jd_req) and kw not in prof:
            recs.append(tip)

    return MatchResult(score=score, reasons=reasons, gaps=gaps, recommendations=recs)
