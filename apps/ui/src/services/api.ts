// API Base URL - 根据环境自动切换
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// ========================================
// Type Definitions
// ========================================

export interface Profile {
  name?: string;
  contact?: string;
  location?: string;
  email?: string;
  phone?: string;
  intro?: string;
  summary?: string;
  education?: EducationItem[];
  experience?: ExperienceItem[];
  projects?: ProjectItem[];
  skills?: string[];
  courses?: CourseItem[];
}

export interface EducationItem {
  school?: string;
  degree?: string;
  major?: string;
  start?: string;
  end?: string;
  period?: string;
}

export interface ExperienceItem {
  company?: string;
  role?: string;
  start?: string;
  end?: string;
  period?: string;
  bullets?: string[];
  details?: string[];
}

export interface ProjectItem {
  name?: string;
  description?: string;
  bullets?: string[];
}

export interface CourseItem {
  code?: string;
  name?: string;
  skills?: string[];
  topics?: string[];
}

export interface Job {
  id: string;
  hash: string;
  source: string;  // 'seek' | 'linkedin'
  title: string;
  company: string;
  location?: string;
  remote?: boolean;
  jd_url?: string;
  url?: string;  // 兼容字段
  posted_at?: string;
  keywords?: string[];
  description?: string;
}

export interface RoleRecommendation {
  title: string;  // 后端返回的字段名
  reason: string;
  matched_keywords: string[];
}

export interface MatchResult {
  score: number;
  reasons?: string[];
  gaps?: string[];
  recommendations?: string[];
}

// ========================================
// Profile API
// ========================================

/**
 * 分析上传的简历文件或文本
 */
export async function analyzeProfile(formData: FormData): Promise<{
  profile: Profile;
  normalized_skills: string[];
  course_skills: Record<string, string[]>;
  course_enrichment_notes: string[];
}> {
  const response = await fetch(`${API_BASE_URL}/profile/analyze-upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to analyze profile' }));
    throw new Error(error.detail || 'Failed to analyze profile');
  }

  return response.json();
}

/**
 * 基于画像推荐职位
 */
export async function recommendRoles(profile: Profile, limit?: number): Promise<{
  role_recommendations: RoleRecommendation[];
}> {
  const response = await fetch(`${API_BASE_URL}/profile/recommend-roles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      profile,
      limit: limit || 10,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to recommend roles' }));
    throw new Error(error.detail || 'Failed to recommend roles');
  }

  return response.json();
}

// ========================================
// Jobs API
// ========================================

/**
 * 流式搜索职位（使用 Server-Sent Events）
 */
export function streamJobs(params: {
  sessionId?: string;
  titles: string[];
  keywords?: string[];
  locations?: string[];
  linkedinCount?: number;
  seekCount?: number;
  limit?: number;
  onJob: (job: Job) => void;
  onProgress: (delivered: number, requested: number) => void;
  onEnd: () => void;
  onError?: (error: Error) => void;
}): () => void {
  const {
    sessionId = '',
    titles,
    keywords = [],
    locations = ['AU'],
    linkedinCount = 5,
    seekCount = 5,
    limit = 10,
    onJob,
    onProgress,
    onEnd,
    onError,
  } = params;

  const query = new URLSearchParams({
    session_id: sessionId,
    titles: titles.join(','),
    keywords: keywords.join(','),
    locations: locations.join(','),
    linkedin: linkedinCount.toString(),
    seek: seekCount.toString(),
    limit: limit.toString(),
  });

  const url = `${API_BASE_URL}/jobs/stream?${query}`;
  const eventSource = new EventSource(url);

  eventSource.addEventListener('job', (event) => {
    try {
      const job = JSON.parse(event.data);
      onJob(job);
    } catch (error) {
      console.error('Failed to parse job data:', error);
    }
  });

  eventSource.addEventListener('progress', (event) => {
    try {
      const { delivered, requested } = JSON.parse(event.data);
      onProgress(delivered, requested);
    } catch (error) {
      console.error('Failed to parse progress data:', error);
    }
  });

  eventSource.addEventListener('end', () => {
    onEnd();
    eventSource.close();
  });

  eventSource.onerror = (event) => {
    console.error('EventSource error:', event);
    if (onError) {
      onError(new Error('Failed to stream jobs'));
    }
    eventSource.close();
  };

  // 返回清理函数
  return () => {
    eventSource.close();
  };
}

// ========================================
// JD API
// ========================================

/**
 * 获取并解析职位描述
 */
export async function fetchJD(jdUrl: string, render: boolean = false): Promise<{
  title?: string;
  company?: string;
  location?: string;
  responsibilities?: string[];
  requirements?: string[];
  benefits?: string[];
  keywords?: string[];
}> {
  const response = await fetch(`${API_BASE_URL}/jd/fetch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jd_url: jdUrl,
      render,
      debug: false,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to fetch JD' }));
    throw new Error(error.detail || 'Failed to fetch JD');
  }

  const result = await response.json();
  // 后端返回格式是 {jd: {...}, debug: ...}
  return result.jd;
}

// ========================================
// Matching API
// ========================================

/**
 * 匹配画像与 JD
 */
export async function matchProfileToJD(
  profile: Profile,
  jd: {
    title?: string;
    company?: string;
    location?: string;
    requirements?: string[];
    keywords?: string[];
  }
): Promise<MatchResult> {
  const response = await fetch(`${API_BASE_URL}/matching/match`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      profile,
      jd,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to match profile' }));
    throw new Error(error.detail || 'Failed to match profile');
  }

  return response.json();
}

// ========================================
// Resume API
// ========================================

/**
 * 预览简历
 */
export async function previewResume(
  profile: Profile,
  templateId: string = 'resume-ats-en',
  language: 'zh' | 'en' = 'en'
): Promise<{ html: string }> {
  const response = await fetch(`${API_BASE_URL}/resume/preview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      profile,
      template_id: templateId,
      language,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to preview resume' }));
    throw new Error(error.detail || 'Failed to preview resume');
  }

  return response.json();
}

/**
 * 导出简历为 DOCX
 */
export async function exportResumeDocx(
  profile: Profile,
  templateId: string = 'resume-ats-en',
  language: 'zh' | 'en' = 'en'
): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/resume/file/docx`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      profile,
      template_id: templateId,
      language,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to export DOCX' }));
    throw new Error(error.detail || 'Failed to export DOCX');
  }

  return response.blob();
}

/**
 * 导出简历为 PDF
 */
export async function exportResumePdf(
  profile: Profile,
  templateId: string = 'resume-ats-en',
  language: 'zh' | 'en' = 'en'
): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/resume/file/pdf`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      profile,
      template_id: templateId,
      language,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to export PDF' }));
    throw new Error(error.detail || 'Failed to export PDF');
  }

  return response.blob();
}

/**
 * 下载文件的辅助函数
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

