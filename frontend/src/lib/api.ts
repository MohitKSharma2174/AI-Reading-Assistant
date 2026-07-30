const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

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
}

export async function ingestArticle(url: string): Promise<Article> {
  const response = await fetch(`${API_BASE_URL}/articles/ingest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
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

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch articles');
  }

  return response.json();
}

export async function getArticle(id: number): Promise<Article> {
  const response = await fetch(`${API_BASE_URL}/articles/${id}`);
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
  });

  if (!response.ok) {
    throw new Error('Failed to delete article');
  }

  return response.json();
}

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
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to create highlight');
  }

  return response.json();
}

export async function getHighlights(articleId: number): Promise<Highlight[]> {
  const response = await fetch(`${API_BASE_URL}/articles/${articleId}/highlights`);
  if (!response.ok) {
    throw new Error('Failed to fetch highlights');
  }

  return response.json();
}

export async function deleteHighlight(highlightId: number): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/highlights/${highlightId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete highlight');
  }

  return response.json();
}
