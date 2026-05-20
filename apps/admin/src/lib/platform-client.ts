const API_BASE = '/api/platform';

export class PlatformClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'PlatformClientError';
  }
}

async function readJson(response: Response) {
  return response.json().catch(() => null);
}

export async function platformClientFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    method: init?.method ?? 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const payload = await readJson(response);
    throw new PlatformClientError(
      payload?.message || `Platform request failed with status ${response.status}.`,
      response.status,
    );
  }

  return response.json() as Promise<T>;
}
