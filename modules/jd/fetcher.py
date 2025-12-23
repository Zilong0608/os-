import httpx
import platform
import os
import re
import sys
from pathlib import Path
from urllib.parse import urlparse, parse_qs

from .schemas import ParsedJD
from .parser import parse_html_to_jd, TECH_TOKENS


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


def _ensure_jobspy_path() -> None:
    root = Path(__file__).resolve().parents[2]
    jobspy_root = root / "JobSpy-main" / "JobSpy-main"
    if jobspy_root.exists():
        jobspy_root_str = str(jobspy_root)
        if jobspy_root_str not in sys.path:
            sys.path.insert(0, jobspy_root_str)


def _parse_description_to_jd(description: str, url: str) -> ParsedJD | None:
    if not description:
        return None
    text = description.replace("\r\n", "\n")
    html = "<html><body>" + text.replace("\n", "<br/>") + "</body></html>"
    return parse_html_to_jd(html, url)


def _lines_from_description(description: str) -> list[str]:
    if not description:
        return []
    parts = re.split(r"(?:\r?\n|\u2022|•|;|(?<=\.)\s+)", description)
    items = []
    for part in parts:
        item = part.strip(" -\t\r\n")
        if len(item) < 4:
            continue
        items.append(item)
    return list(dict.fromkeys(items))


def _keywords_from_text(text: str, title: str | None = None) -> list[str]:
    if not text and not title:
        return []
    lowtext = ((title or "") + "\n" + (text or "")).lower()
    kw = set()
    for token in TECH_TOKENS:
        if token in lowtext:
            kw.add(token.upper() if token in ["aws", "gcp", "sql", "ros"] else token.capitalize())
    return sorted(kw)


def _try_jobspy_detail(url: str, debug: dict) -> ParsedJD | None:
    try:
        _ensure_jobspy_path()
        from jobspy.model import ScraperInput, DescriptionFormat
        from jobspy.linkedin import LinkedIn
        from jobspy.ziprecruiter import ZipRecruiter
        from jobspy.bdjobs import BDJobs
        from jobspy.glassdoor import Glassdoor
    except Exception:
        debug["notes"].append("jobspy_unavailable")
        return None

    domain = urlparse(url).netloc.lower()

    def init_scraper(scraper):
        scraper.scraper_input = ScraperInput(
            site_type=[scraper.site],
            description_format=DescriptionFormat.HTML,
        )
        return scraper

    if "linkedin.com" in domain:
        match = re.search(r"/jobs/view/(\d+)", url)
        if not match:
            return None
        job_id = match.group(1)
        scraper = init_scraper(LinkedIn())
        details = scraper._get_job_details(job_id)
        desc = details.get("description") if details else None
        return _parse_description_to_jd(desc, url)

    if "ziprecruiter.com" in domain:
        scraper = init_scraper(ZipRecruiter())
        desc, _direct = scraper._get_descr(url)
        return _parse_description_to_jd(desc, url)

    if "bdjobs.com" in domain:
        scraper = init_scraper(BDJobs())
        details = scraper._get_job_details(url)
        desc = details.get("description") if details else None
        return _parse_description_to_jd(desc, url)

    if "glassdoor" in domain:
        parsed = urlparse(url)
        qs = parse_qs(parsed.query)
        job_id = qs.get("jl", [None])[0]
        if not job_id:
            return None
        scraper = init_scraper(Glassdoor())
        desc = scraper._fetch_job_description(job_id)
        return _parse_description_to_jd(desc, url)

    return None


def fetch_and_parse(
    url: str,
    render: bool = False,
    description: str | None = None,
    title: str | None = None,
    company: str | None = None,
    location: str | None = None,
):
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

    if description and "just a moment" in description.lower():
        debug["notes"].append("inline_cloudflare_blocked")
        description = None

    if description:
        jd = _parse_description_to_jd(description, url) or ParsedJD()
        jd.title = jd.title or title
        jd.company = jd.company or company
        jd.location = jd.location or location
        if not jd.requirements and not jd.responsibilities:
            jd.responsibilities = _lines_from_description(description)[:80]
        if not jd.keywords:
            jd.keywords = _keywords_from_text(description, jd.title)
        debug["notes"].append("inline_description")
        return jd, debug

    jobspy_jd = _try_jobspy_detail(url, debug)
    if jobspy_jd:
        jobspy_jd.title = jobspy_jd.title or title
        jobspy_jd.company = jobspy_jd.company or company
        jobspy_jd.location = jobspy_jd.location or location
        debug["notes"].append("jobspy_detail_ok")
        return jobspy_jd, debug

    try:
        with httpx.Client(follow_redirects=True, timeout=DEFAULT_TIMEOUT, headers=HEADERS) as client:
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
                if force_render or resp.status_code == 403:
                    html = _render_page_html(url, debug)
                if html:
                    debug["notes"].append("render_ok")
                    jd = parse_html_to_jd(html, url)
                    debug["content_length"] = len(html)
                    if is_seek and not any([jd.title, jd.company, jd.responsibilities, jd.requirements]):
                        debug["notes"].append("seek_render_parse_empty")
                    if jd.title and "just a moment" in jd.title.lower():
                        debug["notes"].append("cloudflare_blocked")
                        jd = ParsedJD()
                    jd.title = jd.title or title
                    jd.company = jd.company or company
                    jd.location = jd.location or location
                    return jd, debug
                else:
                    if force_render or resp.status_code == 403:
                        debug["notes"].append("render_failed")
                    return ParsedJD(), debug
            html = resp.text
            debug["content_length"] = len(html)
            jd = parse_html_to_jd(html, url)
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
            if not any([jd.title, jd.company, jd.responsibilities, jd.requirements]) and debug["domain"].endswith("linkedin.com"):
                debug["notes"].append("linkedin_login_or_scripted_page")
            if jd.title and "just a moment" in jd.title.lower():
                debug["notes"].append("cloudflare_blocked")
                jd = ParsedJD()
            jd.title = jd.title or title
            jd.company = jd.company or company
            jd.location = jd.location or location
            return jd, debug
    except Exception as e:
        debug["notes"].append(f"exception:{type(e).__name__}")
        return ParsedJD(), debug


def _render_page_html(url: str, debug: dict) -> str | None:
    try:
        import asyncio
        if platform.system().lower().startswith("win"):
            try:
                asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
                debug["notes"].append("windows_proactor_event_loop")
            except Exception:
                pass
        from playwright.sync_api import sync_playwright
    except Exception:
        debug["notes"].append("playwright_not_installed")
        return None

    try:
        with sync_playwright() as p:
            proxy_url = os.getenv("PROXY_URL")
            browser = p.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
                proxy={"server": proxy_url} if proxy_url else None,
            )
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
            context.add_init_script(
                "Object.defineProperty(navigator, 'webdriver', { get: () => undefined });"
            )
            page = context.new_page()
            page.set_default_timeout(int(RENDER_TIMEOUT * 1000))
            page.goto(url, wait_until="networkidle")
            try:
                page.wait_for_selector('[data-automation="jobAdDetails"], article, main', timeout=int(RENDER_TIMEOUT * 1000))
                debug["notes"].append("render_wait_selector_ok")
            except Exception:
                debug["notes"].append("render_wait_selector_timeout")
                pass
            try:
                page.wait_for_timeout(1800)
                page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                page.wait_for_timeout(1200)
            except Exception:
                pass
            html = page.content()
            context.close()
            browser.close()
            return html
    except Exception as e:
        debug["notes"].append(f"playwright_error:{type(e).__name__}:{e}")
        return None
