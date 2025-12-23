import json
from typing import AsyncGenerator

from .schemas import SearchJobsInput
from .search import search_jobs


def _sse(event: str, data: dict) -> bytes:
    return (
        f"event: {event}\n" + "data: " + json.dumps(data, ensure_ascii=False) + "\n\n"
    ).encode("utf-8")


async def stream_jobs(input: SearchJobsInput) -> AsyncGenerator[bytes, None]:
    output = search_jobs(input)
    requested = input.limit

    delivered = 0
    yield _sse("progress", {"delivered": delivered, "requested": requested})

    for job in output.jobs:
        delivered += 1
        yield _sse("job", job.model_dump())
        yield _sse("progress", {"delivered": delivered, "requested": requested})

    yield _sse("end", {"delivered": delivered, "requested": requested})
