const getApiBaseUrl = (): string | null => {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    const { hostname } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://127.0.0.1:8000';
    }
    // On Vercel or production host without configured API URL, return null to serve fallback directly
    return null;
  }
  return 'http://127.0.0.1:8000';
};

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  if (!baseUrl) {
    throw new Error('Backend API not configured. Set NEXT_PUBLIC_API_BASE_URL environment variable.');
  }

  const url = `${baseUrl}${cleanEndpoint}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error [${response.status}]: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
}

export async function checkHealth() {
  try {
    return await fetchApi<{
      status: string;
      service: string;
      version: string;
      database: { connected: boolean; dialect?: string; error?: string };
    }>('/health');
  } catch {
    return { status: 'offline', database: { connected: false } };
  }
}
