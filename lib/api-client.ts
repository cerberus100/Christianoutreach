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
    Router.push('/admin/login');
    return response;
  }

  return response;
}
