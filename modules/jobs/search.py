from typing import List, Dict, Tuple
from pathlib import Path
import sys
import re
import math

from .schemas import SearchJobsInput, SearchJobsOutput, Job
from .session import get_seen, add_seen


def _ensure_jobspy_path() -> None:
    root = Path(__file__).resolve().parents[2]
    jobspy_root = root / "JobSpy-main" / "JobSpy-main"
    if jobspy_root.exists():
        jobspy_root_str = str(jobspy_root)
        if jobspy_root_str not in sys.path:
            sys.path.insert(0, jobspy_root_str)


_ensure_jobspy_path()

from jobspy import scrape_jobs


def _hash_key(title: str, company: str, location: str, url: str) -> str:
    import hashlib

    key = f"{title.strip().lower()}|{company.strip().lower()}|{(location or '').strip().lower()}|{(url or '').strip().lower()}"
    return hashlib.sha1(key.encode("utf-8")).hexdigest()


def _dedupe(jobs: List[Job], exclude: List[str]) -> Tuple[List[Job], List[str]]:
    seen = set(exclude)
    out: List[Job] = []
    added_hashes: List[str] = []
    for j in jobs:
        if j.hash in seen:
            continue
        seen.add(j.hash)
        out.append(j)
        added_hashes.append(j.hash)
    return out, added_hashes


def _join_terms(items: List[str]) -> str:
    if not items:
        return ""
    cleaned = [item.strip() for item in items if item and item.strip()]
    if not cleaned:
        return ""
    def quote(term: str) -> str:
        if " " in term:
            return f"\"{term}\""
        return term
    if len(cleaned) == 1:
        return quote(cleaned[0])
    return "(" + " OR ".join(quote(item) for item in cleaned) + ")"


def _build_search_term(payload: SearchJobsInput) -> str:
    titles = _join_terms(payload.query.titles or [])
    keywords = _join_terms(payload.query.keywords or [])
    return " ".join([part for part in [titles, keywords] if part])


def _infer_country_indeed(locations: List[str]) -> str:
    if not locations:
        return "usa"

    text = " ".join(locations).lower()
    tokens = set(re.findall(r"[a-z]+", text))

    if "australia" in text or "au" in tokens:
        return "australia"
    if "new" in tokens and "zealand" in tokens:
        return "new zealand"
    if "uk" in tokens or "united" in tokens and "kingdom" in tokens:
        return "uk"
    if "usa" in tokens or "us" in tokens or "united" in tokens and "states" in tokens:
        return "usa"
    if "canada" in text or "ca" in tokens:
        return "canada"
    if "singapore" in text or "sg" in tokens:
        return "singapore"
    if "india" in text or "in" in tokens:
        return "india"

    return "usa"


def _normalize_location(location: str | None) -> str | None:
    if not location:
        return None
    normalized = location.strip()
    if normalized.upper() in {"AU", "AUS"}:
        return "Australia"
    if normalized.upper() in {"US", "USA"}:
        return "United States"
    if normalized.upper() in {"UK", "GB"}:
        return "United Kingdom"
    return normalized


def _is_us_or_canada(location: str | None, country_indeed: str) -> bool:
    if country_indeed in {"usa", "canada"}:
        return True
    if not location:
        return False
    text = location.lower()
    return "usa" in text or "united states" in text or "canada" in text


def _select_sites(location: str | None, country_indeed: str) -> List[str]:
    sites = ["indeed", "linkedin", "google"]
    if _is_us_or_canada(location, country_indeed):
        sites.append("zip_recruiter")
    if country_indeed in {"india"}:
        sites.append("naukri")
    if country_indeed in {"bangladesh"}:
        sites.append("bdjobs")
    if country_indeed in {
        "argentina",
        "australia",
        "austria",
        "belgium",
        "brazil",
        "canada",
        "france",
        "germany",
        "hong kong",
        "india",
        "ireland",
        "netherlands",
        "new zealand",
        "singapore",
        "spain",
        "switzerland",
        "uk",
        "usa",
        "vietnam",
    }:
        sites.append("glassdoor")
    sites.append("bayt")
    return sites


def _to_str_date(val) -> str | None:
    if val is None:
        return None
    try:
        return str(val)
    except Exception:
        return None


def _clean_value(val):
    if val is None:
        return None
    if isinstance(val, float) and math.isnan(val):
        return None
    if isinstance(val, list):
        items = [str(item) for item in val if item is not None]
        return ", ".join(items) if items else None
    return val


def _jobspy_search(payload: SearchJobsInput, exclude: List[str]) -> List[Job]:
    try:
        search_term = _build_search_term(payload)
        raw_location = payload.query.locations[0] if payload.query.locations else None
        location = _normalize_location(raw_location)
        country_indeed = _infer_country_indeed(payload.query.locations or [])
        sites = _select_sites(location, country_indeed)
    except Exception:
        return []

    jobs: List[Job] = []
    exclude_set = set(exclude)
    remaining = max(1, payload.limit)

    for site in sites:
        if remaining <= 0:
            break
        try:
            google_search_term = None
            if site == "google" and search_term:
                if location:
                    google_search_term = f"{search_term} jobs near {location}"
                else:
                    google_search_term = f"{search_term} jobs"

            jobs_df = scrape_jobs(
                site_name=[site],
                search_term=search_term or None,
                google_search_term=google_search_term,
                location=location,
                results_wanted=remaining,
                is_remote=payload.query.remote or False,
                country_indeed=country_indeed,
                description_format="markdown",
                linkedin_fetch_description=False,
                verbose=0,
            )
        except Exception:
            continue

        if jobs_df is None or jobs_df.empty:
            continue

        records = jobs_df.to_dict(orient="records")
        for rec in records:
            title = rec.get("title") or "Job"
            company = rec.get("company") or rec.get("company_name") or ""
            job_location = rec.get("location")
            job_url = rec.get("job_url") or rec.get("job_url_direct")
            h = _hash_key(title, company, job_location or "", job_url or "")
            if h in exclude_set:
                continue

            job = Job(
                id=h,
                hash=h,
                source=rec.get("site") or site,
                title=title,
                company=company,
                location=_clean_value(job_location),
                remote=_clean_value(rec.get("is_remote")),
                jd_url=_clean_value(job_url),
                posted_at=_to_str_date(rec.get("date_posted")),
                keywords=payload.query.keywords or [],
                job_url=_clean_value(job_url),
                job_url_direct=_clean_value(rec.get("job_url_direct")),
                company_url=_clean_value(rec.get("company_url")),
                company_url_direct=_clean_value(rec.get("company_url_direct")),
                description=_clean_value(rec.get("description")),
                job_type=_clean_value(rec.get("job_type")),
                job_level=_clean_value(rec.get("job_level")),
                company_industry=_clean_value(rec.get("company_industry")),
                salary_source=_clean_value(rec.get("salary_source")),
                interval=_clean_value(rec.get("interval")),
                min_amount=_clean_value(rec.get("min_amount")),
                max_amount=_clean_value(rec.get("max_amount")),
                currency=_clean_value(rec.get("currency")),
                emails=_clean_value(rec.get("emails")),
                skills=_clean_value(rec.get("skills")),
                experience_range=_clean_value(rec.get("experience_range")),
                company_rating=_clean_value(rec.get("company_rating")),
                company_reviews_count=_clean_value(rec.get("company_reviews_count")),
                vacancy_count=_clean_value(rec.get("vacancy_count")),
                work_from_home_type=_clean_value(rec.get("work_from_home_type")),
            )
            jobs.append(job)
            exclude_set.add(h)
            remaining -= 1
            if remaining <= 0:
                break
        if remaining <= 0:
            break
    return jobs


def search_jobs(payload: SearchJobsInput) -> SearchJobsOutput:
    requested = payload.limit

    exclude = list(payload.exclude_hashes or [])
    if payload.session_id:
        exclude = list(set(exclude) | get_seen(payload.session_id))

    jobs = _jobspy_search(payload, exclude)
    unique, added_hashes = _dedupe(jobs, exclude)
    limited = unique[:requested]

    if payload.session_id and limited:
        add_seen(payload.session_id, [j.hash for j in limited])

    by_source: Dict[str, int] = {}
    for j in limited:
        by_source[j.source] = by_source.get(j.source, 0) + 1

    stats = {
        "requested": requested,
        "by_source": by_source,
        "deduped": len(jobs) - len(unique),
        "total": len(limited),
    }
    return SearchJobsOutput(jobs=limited, seen_hashes=added_hashes, stats=stats)
