const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('inkwell_token');
};

export const setToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('inkwell_token', token);
  }
};

export const removeToken = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('inkwell_token');
  }
};

const getAuthHeaders = (): Record<string, string> => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export interface User {
  id: number;
  email: string;
  created_at: string;
}

export interface Tag {
  id: number;
  name: string;
}

export interface Summary {
  id: number;
  bullet_points: string[];
}

export interface Article {
  id: number;
  original_url: string;
  title: string;
  clean_content?: string;
  reading_time: number | null;
  created_at: string;
  summary: Summary | null;
  tags: Tag[];
  already_existed?: boolean;
}

/* AUTH API CALLS */

export async function signup(email: string, password: string): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const errText = await response.text();
    let detail = 'Signup failed';
    try {
      const parsed = JSON.parse(errText);
      detail = parsed.detail || detail;
    } catch {}
    throw new Error(detail);
  }

  return response.json();
}

export async function login(email: string, password: string): Promise<{ access_token: string; token_type: string }> {
  const bodyParams = new URLSearchParams({
    username: email,
    password: password,
  });

  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: bodyParams,
  });

  if (!response.ok) {
    const errText = await response.text();
    let detail = 'Login failed';
    try {
      const parsed = JSON.parse(errText);
      detail = parsed.detail || detail;
    } catch {}
    throw new Error(detail);
  }

  const data = await response.json();
  if (data.access_token) {
    setToken(data.access_token);
  }
  return data;
}

export async function getCurrentUser(): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: {
      ...getAuthHeaders(),
    },
  });

  if (!response.ok) {
    throw new Error('Failed to authenticate session');
  }

  return response.json();
}

/* ARTICLES API CALLS */

export async function ingestArticle(url: string): Promise<Article> {
  const response = await fetch(`${API_BASE_URL}/articles/ingest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const errText = await response.text();
    let detail = 'Failed to ingest article';
    try {
      const parsed = JSON.parse(errText);
      detail = parsed.detail || detail;
    } catch {}
    throw new Error(detail);
  }

  return response.json();
}

export async function getArticles(tag?: string): Promise<Article[]> {
  let url = `${API_BASE_URL}/articles/`;
  if (tag) {
    url += `?tag=${encodeURIComponent(tag)}`;
  }

  const response = await fetch(url, {
    headers: {
      ...getAuthHeaders(),
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch articles');
  }

  return response.json();
}

export async function getArticle(id: number): Promise<Article> {
  const response = await fetch(`${API_BASE_URL}/articles/${id}`, {
    headers: {
      ...getAuthHeaders(),
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Article not found');
    }
    throw new Error('Failed to fetch article details');
  }

  return response.json();
}

export async function deleteArticle(id: number): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/articles/${id}`, {
    method: 'DELETE',
    headers: {
      ...getAuthHeaders(),
    },
  });

  if (!response.ok) {
    throw new Error('Failed to delete article');
  }

  return response.json();
}

/* HIGHLIGHTS API CALLS */

export interface Highlight {
  id: number;
  article_id: number;
  selected_text: string;
  note: string | null;
  position_start: number | null;
  position_end: number | null;
  color: string;
}

export interface HighlightCreate {
  selected_text: string;
  note?: string;
  position_start?: number;
  position_end?: number;
  color?: string;
}

export async function createHighlight(articleId: number, data: HighlightCreate): Promise<Highlight> {
  const response = await fetch(`${API_BASE_URL}/articles/${articleId}/highlights`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to create highlight');
  }

  return response.json();
}

export async function getHighlights(articleId: number): Promise<Highlight[]> {
  const response = await fetch(`${API_BASE_URL}/articles/${articleId}/highlights`, {
    headers: {
      ...getAuthHeaders(),
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch highlights');
  }

  return response.json();
}

export async function deleteHighlight(highlightId: number): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/highlights/${highlightId}`, {
    method: 'DELETE',
    headers: {
      ...getAuthHeaders(),
    },
  });

  if (!response.ok) {
    throw new Error('Failed to delete highlight');
  }

  return response.json();
}

/* AI API CALLS */

export interface AskAIRequest {
  question: string;
  context?: string;
}

export interface AskAIResponse {
  answer: string;
  article_id: number;
}

export async function askArticleAI(
  articleId: number,
  data: AskAIRequest
): Promise<AskAIResponse> {
  const response = await fetch(`${API_BASE_URL}/articles/${articleId}/ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errText = await response.text();
    let detail = 'AI query failed';
    try {
      const parsed = JSON.parse(errText);
      detail = parsed.detail || detail;
    } catch {}
    throw new Error(detail);
  }

  return response.json();
}

export interface SummarizePassageRequest {
  context: string;
}

export interface SummarizePassageResponse {
  summary: string;
  article_id: number;
}

export async function summarizePassageAI(
  articleId: number,
  data: SummarizePassageRequest
): Promise<SummarizePassageResponse> {
  const response = await fetch(`${API_BASE_URL}/articles/${articleId}/summarize_passage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errText = await response.text();
    let detail = 'Summarization failed';
    try {
      const parsed = JSON.parse(errText);
      detail = parsed.detail || detail;
    } catch {}
    throw new Error(detail);
  }

  return response.json();
}
