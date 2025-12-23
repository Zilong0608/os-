from typing import List, Optional, Dict
from pydantic import BaseModel


class Job(BaseModel):
    id: str
    hash: str
    source: str
    title: str
    company: str
    location: Optional[str] = None
    remote: Optional[bool] = None
    jd_url: Optional[str] = None
    posted_at: Optional[str] = None
    keywords: List[str] = []

    job_url: Optional[str] = None
    job_url_direct: Optional[str] = None
    company_url: Optional[str] = None
    company_url_direct: Optional[str] = None
    description: Optional[str] = None
    job_type: Optional[str] = None
    job_level: Optional[str] = None
    company_industry: Optional[str] = None
    salary_source: Optional[str] = None
    interval: Optional[str] = None
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None
    currency: Optional[str] = None
    emails: Optional[str] = None

    skills: Optional[str] = None
    experience_range: Optional[str] = None
    company_rating: Optional[float] = None
    company_reviews_count: Optional[int] = None
    vacancy_count: Optional[int] = None
    work_from_home_type: Optional[str] = None


class JobQuery(BaseModel):
    titles: List[str] = []
    keywords: List[str] = []
    locations: List[str] = []
    seniority: Optional[str] = None
    remote: Optional[bool] = None


class SearchJobsInput(BaseModel):
    query: JobQuery
    sources: List[str] = ["seek", "linkedin"]
    allocation: Dict[str, int] = {"seek": 5, "linkedin": 5}
    limit: int = 10
    exclude_hashes: List[str] = []
    session_id: Optional[str] = None


class SearchJobsOutput(BaseModel):
    jobs: List[Job] = []
    seen_hashes: List[str] = []
    stats: dict = {}
