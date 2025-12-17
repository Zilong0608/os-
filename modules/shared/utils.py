import hashlib
import re
from urllib.parse import urlparse
from typing import Dict, Any


_INACTIVE_SNIPPET_PATTERNS = [
    r"no longer accepting application",
    r"no longer accepting applicants",
    r"no longer accepting applications",
    r"no longer available",
    r"no longer hiring",
    r"no longer recruiting",
    r"position (?:has )?been filled",
    r"positions? filled",
    r"applications? closed",
    r"applications? are closed",
    r"job (?:posting )?(?:has )?expired",
    r"job (?:posting )?closed",
    r"job has closed",
    r"job listing closed",
    r"listing expired",
    r"listing has expired",
    r"job expired",
    r"expired job",
    r"募集終了",  # Japanese
    r"已停止招聘",  # Simplified Chinese
    r"职位已(下线|结束|关闭)",
    r"招聘已结束",
    r"暂停招聘",
    r"停止招聘",
]

_INACTIVE_URL_KEYWORDS = [
    "job/expired",
    "job/closed",
    "jobinactive",
    "job-over",
    "job-no-longer",
    "expiredjob",
    "inactive=true",
]


def canonical_url(url: str) -> str:
    try:
        p = urlparse(url)
        return f"{p.scheme}://{p.netloc}{p.path}"
    except Exception:
        return url or ""


def dedup_hash(title: str, company: str, location: str, url: str) -> str:
    key = f"{(title or '').strip().lower()}|{(company or '').strip().lower()}|{(location or '').strip().lower()}|{canonical_url(url)}"
    return hashlib.sha1(key.encode("utf-8")).hexdigest()


def is_job_too_old(result: Dict[str, Any], max_days: int = 30) -> bool:
    """
    Check if a job posting is too old based on posted_at or snippet text.
    Returns True if the job is older than max_days (default 30 days).
    """
    import datetime
    
    # Check posted_at field
    posted_at = result.get("posted_at")
    if posted_at:
        try:
            if isinstance(posted_at, str):
                # Try to parse date string
                from dateutil import parser
                posted_date = parser.parse(posted_at)
                days_old = (datetime.datetime.now(posted_date.tzinfo or datetime.timezone.utc) - posted_date).days
                return days_old > max_days
        except:
            pass
    
    # Check snippet for time indicators
    text_parts = []
    for key in ("title", "snippet", "description"):
        val = result.get(key)
        if isinstance(val, str):
            text_parts.append(val.lower())
    combined = " ".join(text_parts)
    
    if combined:
        # Check for explicit "X days ago" or "X weeks ago" or "X months ago"
        import re
        
        # Days ago
        days_match = re.search(r'(\d+)\s*days?\s*ago', combined)
        if days_match:
            days = int(days_match.group(1))
            if days > max_days:
                return True
        
        # Weeks ago
        weeks_match = re.search(r'(\d+)\s*weeks?\s*ago', combined)
        if weeks_match:
            weeks = int(weeks_match.group(1))
            if weeks * 7 > max_days:
                return True
        
        # Months ago (reject anything 1+ months old if max_days < 30, or 2+ months if max_days >= 30)
        months_match = re.search(r'(\d+)\s*months?\s*ago', combined)
        if months_match:
            months = int(months_match.group(1))
            if months * 30 > max_days:
                return True
    
    return False


def is_job_result_inactive(result: Dict[str, Any]) -> bool:
    """
    Best-effort heuristic to detect closed / expired job postings from web search results.
    Checks explicit status flags, snippet/title cues, URL patterns, and freshness.
    """
    if not result:
        return False

    # Check if job is too old (older than 30 days)
    if is_job_too_old(result, max_days=30):
        return True

    status = str(result.get("status") or "").strip().lower()
    if status in {"closed", "expired", "inactive", "filled", "stopped"}:
        return True

    # Combine text fields for keyword scanning
    text_parts = []
    for key in ("title", "snippet", "description"):
        val = result.get(key)
        if isinstance(val, str):
            text_parts.append(val.lower())
    combined = " ".join(text_parts)

    if combined:
        for pattern in _INACTIVE_SNIPPET_PATTERNS:
            if re.search(pattern, combined):
                return True

    url = str(result.get("url") or "").lower()
    if url:
        if any(token in url for token in _INACTIVE_URL_KEYWORDS):
            return True

    # Some providers expose boolean flags
    for key in ("is_active", "active", "open", "open_for_applications"):
        if key in result:
            val = result.get(key)
            if isinstance(val, bool) and not val:
                return True
            if isinstance(val, str) and val.strip().lower() in {"false", "0", "no", "closed"}:
                return True

    return False

