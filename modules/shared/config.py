import os

# Load .env if present (no-op if package not installed)
try:
    from dotenv import load_dotenv  # type: ignore
    load_dotenv()  # will read .env from project root if available
except Exception:
    pass

# Support both GPT_API_KEY and OPENAI_API_KEY for backward compatibility
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY") or os.getenv("GPT_API_KEY", "")
GPT_API_KEY = OPENAI_API_KEY  # Alias for backward compatibility

DEFAULT_REGION = os.getenv("DEFAULT_REGION", "AU")
TEMP_FILE_TTL_MIN = int(os.getenv("TEMP_FILE_TTL_MIN", "15"))
OPENAI_MODEL_CHAT = os.getenv("OPENAI_MODEL_CHAT", "gpt-4")
OPENAI_MODEL_WEB = os.getenv("OPENAI_MODEL_WEB", "gpt-5.2-2025-12-11")
OPENAI_USE_WEB_TOOL = os.getenv("OPENAI_USE_WEB_TOOL", "1")  # '1' to enable Responses web search tool path
OPENAI_WEB_TOOL_TYPE = os.getenv("OPENAI_WEB_TOOL_TYPE", "web_search_preview")
OPENAI_MODEL_REFINE = os.getenv("OPENAI_MODEL_REFINE", OPENAI_MODEL_CHAT)
OPENAI_MODEL_PROFILE_EXTRACT = os.getenv("OPENAI_MODEL_PROFILE_EXTRACT", OPENAI_MODEL_CHAT)
PROFILE_EXTRACT_LLM = os.getenv("PROFILE_EXTRACT_LLM", "1")  # '0' to disable LLM for profile extraction
COURSE_ENRICH_PROVIDER = os.getenv("COURSE_ENRICH_PROVIDER", "db")  # db | none
