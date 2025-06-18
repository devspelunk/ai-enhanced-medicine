import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export function useDrugSearch(filters: Record<string, any>, enabled = true) {
  return useQuery({
    queryKey: ['drugs', 'search', filters],
    queryFn: () => apiClient.drugs.search(filters),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function usePopularDrugs(enabled = true) {
  return useQuery({
    queryKey: ['drugs', 'popular'],
    queryFn: () => apiClient.drugs.getPopular(),
    enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes for popular drugs
  })
}

export function useDrug(id: string, enabled = true) {
  return useQuery({
    queryKey: ['drugs', id],
    queryFn: () => apiClient.drugs.getById(id),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000,
  })
}

export function useDrugBySlug(slug: string, enabled = true) {
  return useQuery({
    queryKey: ['drugs', 'slug', slug],
    queryFn: () => apiClient.drugs.getBySlug(slug),
    enabled: enabled && !!slug,
    staleTime: 5 * 60 * 1000,
  })
}

export function useRelatedDrugs(id: string, enabled = true) {
  return useQuery({
    queryKey: ['drugs', id, 'related'],
    queryFn: () => apiClient.drugs.getRelated(id),
    enabled: enabled && !!id,
    staleTime: 10 * 60 * 1000,
  })
}