function getBaseUrl() {
  if (typeof window !== 'undefined') return ''
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL
  return `http://localhost:3001`
}

class APIError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'APIError'
  }
}

async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${getBaseUrl()}/api${endpoint}`
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  })

  if (!response.ok) {
    throw new APIError(response.status, `API request failed: ${response.statusText}`)
  }

  return response.json()
}

export const apiClient = {
  drugs: {
    search: (params: Record<string, any>) => {
      const searchParams = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value))
        }
      })
      return apiRequest<any>(`/drugs?${searchParams.toString()}`)
    },
    
    getPopular: () => apiRequest<any>('/drugs/popular'),
    
    getById: (id: string) => apiRequest<any>(`/drugs/${id}`),
    
    getBySlug: (slug: string) => apiRequest<any>(`/drugs/slug/${slug}`),
    
    getRelated: (id: string) => apiRequest<any>(`/drugs/${id}/related`),
  },
  
  search: {
    searchDrugs: (params: Record<string, any>) => {
      const searchParams = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value))
        }
      })
      return apiRequest<any>(`/search/drugs?${searchParams.toString()}`)
    },
    
    getSuggestions: (query: string) => 
      apiRequest<any>(`/search/suggestions?q=${encodeURIComponent(query)}`),
    
    searchByCondition: (condition: string) =>
      apiRequest<any>(`/search/by-condition?condition=${encodeURIComponent(condition)}`),
  },
  
  aiContent: {
    enhanceContent: (data: any) =>
      apiRequest<any>('/ai-content/enhance', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
      
    batchEnhance: (data: any) =>
      apiRequest<any>('/ai-content/batch-enhance', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
}

export { APIError }