type ApiErrorPayload = {
  error?: string;
  message?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

async function readResponsePayload<T>(response: Response): Promise<T | string | null> {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    try {
      return await response.json() as T;
    } catch {
      return null;
    }
  }

  try {
    const text = await response.text();
    return text || null;
  } catch {
    return null;
  }
}

function extractErrorMessage(payload: unknown, fallbackMessage: string): string {
  if (typeof payload === 'string' && payload.trim()) {
    return payload.trim();
  }

  if (isRecord(payload)) {
    const apiError = typeof payload.error === 'string' ? payload.error.trim() : '';
    if (apiError) {
      return apiError;
    }

    const message = typeof payload.message === 'string' ? payload.message.trim() : '';
    if (message) {
      return message;
    }
  }

  return fallbackMessage;
}

export async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit, fallbackMessage = '请求失败'): Promise<T> {
  const response = await fetch(input, init);
  const payload = await readResponsePayload<T & ApiErrorPayload>(response);

  if (!response.ok) {
    throw new Error(extractErrorMessage(payload, fallbackMessage));
  }

  return payload as T;
}

export async function fetchBlob(input: RequestInfo | URL, init?: RequestInit, fallbackMessage = '请求失败'): Promise<Blob> {
  const response = await fetch(input, init);

  if (!response.ok) {
    const payload = await readResponsePayload<ApiErrorPayload>(response);
    throw new Error(extractErrorMessage(payload, fallbackMessage));
  }

  return response.blob();
}