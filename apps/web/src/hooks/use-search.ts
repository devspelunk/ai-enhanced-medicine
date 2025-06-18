import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export function useSearchDrugs(params: Record<string, any>, enabled = true) {
  return useQuery({
    queryKey: ['search', 'drugs', params],
    queryFn: () => apiClient.search.searchDrugs(params),
    enabled: enabled && !!params.query,
    staleTime: 5 * 60 * 1000,
  })
}

export function useSearchSuggestions(query: string, enabled = true) {
  return useQuery({
    queryKey: ['search', 'suggestions', query],
    queryFn: () => apiClient.search.getSuggestions(query),
    enabled: enabled && query.length > 1,
    staleTime: 30 * 1000, // 30 seconds for suggestions
  })
}

export function useSearchByCondition(condition: string, enabled = true) {
  return useQuery({
    queryKey: ['search', 'condition', condition],
    queryFn: () => apiClient.search.searchByCondition(condition),
    enabled: enabled && !!condition,
    staleTime: 5 * 60 * 1000,
  })
}