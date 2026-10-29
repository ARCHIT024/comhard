/**
 * Custom API Error class surfacing HTTP status, backend message, and validation details.
 */
export class ApiError extends Error {
  constructor(message, status, details = [], data = {}) {
    super(message || 'An unexpected error occurred');
    this.name = 'ApiError';
    this.status = status;
    this.details = Array.isArray(details) ? details : [];
    this.data = data;
  }

  /**
   * Returns a map of field -> error message for easy form error binding
   */
  getFieldErrors() {
    const map = {};
    for (const item of this.details) {
      if (item && item.field) {
        map[item.field] = item.message;
      }
    }
    return map;
  }
}

/**
 * Base fetch wrapper for /api requests
 */
export async function apiClient(endpoint, options = {}) {
  const url = endpoint.startsWith('http') || endpoint.startsWith('/') ? endpoint : `/api/${endpoint}`;

  const defaultHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers || {})
  };

  const fetchOptions = {
    ...options,
    headers: defaultHeaders
  };

  if (fetchOptions.body && typeof fetchOptions.body === 'object' && !(fetchOptions.body instanceof FormData)) {
    fetchOptions.body = JSON.stringify(fetchOptions.body);
  }

  let response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (networkError) {
    throw new ApiError('Network connection error. Please ensure the server is running.', 0);
  }

  let data = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    try {
      const text = await response.text();
      data = { message: text };
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const errorMessage = data?.error || data?.message || `Request failed with status ${response.status}`;
    const errorDetails = data?.details || [];
    throw new ApiError(errorMessage, response.status, errorDetails, data);
  }

  return data;
}

export const api = {
  get: (endpoint, params = {}) => {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value);
      }
    }
    const query = searchParams.toString();
    const url = query ? `${endpoint}?${query}` : endpoint;
    return apiClient(url, { method: 'GET' });
  },

  post: (endpoint, body) => apiClient(endpoint, { method: 'POST', body }),

  patch: (endpoint, body) => apiClient(endpoint, { method: 'PATCH', body }),

  delete: (endpoint) => apiClient(endpoint, { method: 'DELETE' })
};

export default api;
