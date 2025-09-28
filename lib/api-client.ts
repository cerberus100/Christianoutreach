import Router from 'next/router';

interface FetchOptions extends RequestInit {
  headers?: HeadersInit;
}

export async function fetchWithAuth(input: RequestInfo, init: FetchOptions = {}) {
  const response = await fetch(input, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

  if (response.status === 401) {
    // Try to refresh tokens automatically
    try {
      const refreshResponse = await fetch('/api/admin/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (refreshResponse.ok) {
        // Retry the original request with refreshed tokens
        const retryResponse = await fetch(input, {
          ...init,
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(init.headers || {}),
          },
        });

        if (retryResponse.ok) {
          return retryResponse;
        }
      }
    } catch (refreshError) {
      console.warn('Token refresh failed:', refreshError);
    }

    // If refresh fails or retry fails, redirect to login
    Router.push('/admin/login');
    return response;
  }

  return response;
}
