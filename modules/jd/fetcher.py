import httpx
import platform
from urllib.parse import urlparse
import re
from .schemas import ParsedJD
from .parser import parse_html_to_jd


DEFAULT_TIMEOUT = 10.0
RENDER_TIMEOUT = 18.0
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-AU,en-US;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
    "Connection": "keep-alive",
    "Referer": "https://www.seek.com.au/",
}


def fetch_and_parse(url: str, render: bool = False):
    domain = urlparse(url).netloc
    is_seek = "seek.com" in domain
    force_render = render or is_seek
    debug = {
        "requested_url": url,
        "status_code": None,
        "final_url": None,
        "domain": domain,
        "content_length": 0,
        "notes": [],
    }
    try:
        with httpx.Client(follow_redirects=True, timeout=DEFAULT_TIMEOUT, headers=HEADERS) as client:
            # Warm-up to obtain cookies/session for the domain
            base = f"{urlparse(url).scheme}://{urlparse(url).netloc}/"
            try:
                client.get(base)
                debug["notes"].append("warmed_cookies")
            except Exception:
                pass
            resp = client.get(url)
            debug["status_code"] = resp.status_code
            debug["final_url"] = str(resp.request.url)
            if resp.status_code >= 400:
                debug["notes"].append(f"http_error_{resp.status_code}")
                html = None
                # Try rendering when caller requests it or when forbidden (common on Seek/LinkedIn)
                if force_render or resp.status_code == 403:
                    html = _render_page_html(url, debug)
                if html:
                    debug["notes"].append("render_ok")
                    jd = parse_html_to_jd(html, url)
                    debug["content_length"] = len(html)
                    if is_seek and not any([jd.title, jd.company, jd.responsibilities, jd.requirements]):
                        seek_fallback = _fetch_seek_api(url, debug)
                        if seek_fallback:
                            debug["notes"].append("seek_api_fallback_ok")
                            return seek_fallback, debug
                    return jd, debug
                else:
                    if force_render or resp.status_code == 403:
                        debug["notes"].append("render_failed")
                    # Try API fallback for Seek even if render failed
                    if is_seek:
                        seek_fallback = _fetch_seek_api(url, debug)
                        if seek_fallback:
                            debug["notes"].append("seek_api_fallback_ok")
                            return seek_fallback, debug
                    return ParsedJD(), debug
            html = resp.text
            debug["content_length"] = len(html)
            jd = parse_html_to_jd(html, url)
            # Seek pages often render nothing via plain HTTP; fallback to Playwright render
            if is_seek and not any([jd.title, jd.company, jd.responsibilities, jd.requirements]):
                debug["notes"].append("seek_html_empty_try_render")
                html_rendered = _render_page_html(url, debug)
                if html_rendered:
                    jd = parse_html_to_jd(html_rendered, url)
                    debug["content_length"] = len(html_rendered)
                    if any([jd.title, jd.company, jd.responsibilities, jd.requirements]):
                        debug["notes"].append("seek_render_parse_ok")
                    else:
                        debug["notes"].append("seek_render_parse_empty")
            # Seek API fallback (public JSON) if still empty
            if is_seek and not any([jd.title, jd.company, jd.responsibilities, jd.requirements]):
                seek_fallback = _fetch_seek_api(url, debug)
                if seek_fallback:
                    jd = seek_fallback
                    debug["notes"].append("seek_api_fallback_ok")
            # Heuristic note for likely blocked content
            if not any([jd.title, jd.company, jd.responsibilities, jd.requirements]) and debug["domain"].endswith("linkedin.com"):
                debug["notes"].append("linkedin_login_or_scripted_page")
            return jd, debug
    except Exception as e:
        debug["notes"].append(f"exception:{type(e).__name__}")
        return ParsedJD(), debug


def _render_page_html(url: str, debug: dict) -> str | None:
    """Optional headless rendering via Playwright. Returns HTML or None if unavailable."""
    try:
        import asyncio
        if platform.system().lower().startswith("win"):
            try:
                asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())  # type: ignore[attr-defined]
                debug["notes"].append("windows_proactor_event_loop")
            except Exception:
                pass
        from playwright.sync_api import sync_playwright  # type: ignore
    except Exception:
        debug["notes"].append("playwright_not_installed")
        return None

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                user_agent=HEADERS.get("User-Agent"),
                locale="en-AU",
                java_script_enabled=True,
                viewport={"width": 1300, "height": 2400},
                extra_http_headers={
                    "Accept-Language": HEADERS.get("Accept-Language", "en-AU,en-US;q=0.9"),
                    "Referer": "https://www.seek.com.au/",
                    "Cache-Control": "no-cache",
                    "Pragma": "no-cache",
                },
            )
            # Simple stealth: hide webdriver flag
            context.add_init_script(
                "Object.defineProperty(navigator, 'webdriver', { get: () => undefined });"
            )
            page = context.new_page()
            page.set_default_timeout(int(RENDER_TIMEOUT * 1000))
            page.goto(url, wait_until="domcontentloaded")
            # Try to wait for main content on Seek
            try:
                page.wait_for_selector('[data-automation="jobAdDetails"], article, main', timeout=int(RENDER_TIMEOUT * 1000))
                debug["notes"].append("render_wait_selector_ok")
            except Exception:
                debug["notes"].append("render_wait_selector_timeout")
                pass
            # Allow client-side render to settle
            try:
                page.wait_for_timeout(1200)
                page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                page.wait_for_timeout(600)
            except Exception:
                pass
            html = page.content()
            context.close()
            browser.close()
            return html
    except Exception as e:
        debug["notes"].append(f"playwright_error:{type(e).__name__}")
        return None


def _fetch_seek_api(url: str, debug: dict) -> ParsedJD | None:
    """Public Seek job API fallback by job id. Avoids touching LinkedIn logic."""
    m = re.search("/job/(\\d+)", url)
    if not m:
        return None
    job_id = m.group(1)
    endpoints = [
        f"https://www.seek.com.au/api/chalice-search/v4/jobs?jobs={job_id}",
        f"https://www.seek.com.au/api/chalice-search/v4/jobs/{job_id}",
        f"https://www.seek.com.au/api/jobseekers/jobs/{job_id}",
    ]
    seek_headers = {
        **HEADERS,
        "Accept": "application/json, text/plain, */*",
        "Referer": url,
        "Origin": "https://www.seek.com.au",
    }
    last_status = None
    data = None
    for ep in endpoints:
        try:
            resp = httpx.get(ep, headers=seek_headers, timeout=DEFAULT_TIMEOUT)
        except Exception as e:
            debug["notes"].append(f"seek_api_error:{type(e).__name__}")
            continue
        last_status = resp.status_code
        debug["notes"].append(f"seek_api_attempt:{ep}|{resp.status_code}")
        if resp.status_code != 200:
            continue
        try:
            data = resp.json()
            break
        except Exception:
            debug["notes"].append("seek_api_json_error")
            data = None
            continue

    if data is None:
        if last_status:
            debug["notes"].append(f"seek_api_status_{last_status}")
        return None

    jobs = None
    if isinstance(data, dict):
        for key in ["data", "jobs", "results"]:
            if key in data and isinstance(data[key], list):
                jobs = data[key]
                break
        if jobs is None and "job" in data and isinstance(data["job"], dict):
            jobs = [data["job"]]
    if not jobs or not isinstance(jobs, list):
        debug["notes"].append("seek_api_no_jobs")
        return None
    job = jobs[0] if jobs else None
    if not isinstance(job, dict):
        debug["notes"].append("seek_api_invalid_job")
        return None

    title = job.get("title") or job.get("jobTitle")
    adv = job.get("advertiser") or {}
    company = None
    if isinstance(adv, dict):
        company = adv.get("description") or adv.get("name") or adv.get("companyName")
    location = job.get("location") or job.get("displayLocation") or job.get("workLocation")

    bullets = []
    bullet_points = job.get("bulletPoints") or job.get("bullet_points")
    if isinstance(bullet_points, list):
        bullets.extend([str(x).strip() for x in bullet_points if str(x).strip()])
    desc = job.get("content") or job.get("teaser") or job.get("summary") or job.get("adDetails") or job.get("description")
    if isinstance(desc, str) and len(desc.strip()) > 0:
        bullets.append(desc.strip())

    if not any([title, company, location, bullets]):
        debug["notes"].append("seek_api_empty_job")
        return None

    # split bullets into simple responsibilities/requirements buckets
    responsibilities = []
    requirements = []
    for b in bullets:
        if re.search(r"experience|required|skill|qualification|degree", b, re.I):
            requirements.append(b)
        else:
            responsibilities.append(b)

    return ParsedJD(
        title=title,
        company=company,
        location=location,
        responsibilities=responsibilities,
        requirements=requirements,
        keywords=[],
    )
