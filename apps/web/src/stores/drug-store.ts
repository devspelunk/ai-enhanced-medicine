'use client'

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { Drug, DrugSearchFilters, DrugSearchResult } from '@drug-platform/shared'

interface DrugStoreState {
  // Search state
  searchResults: DrugSearchResult | null
  searchFilters: DrugSearchFilters
  searchLoading: boolean
  searchError: string | null

  // Selected drug
  selectedDrug: Drug | null
  drugLoading: boolean
  drugError: string | null

  // Recent searches and favorites
  recentSearches: string[]
  favoriteDrugs: string[]

  // UI state
  sidebarOpen: boolean
  viewMode: 'grid' | 'list'
}

interface DrugStoreActions {
  // Search actions
  setSearchResults: (results: DrugSearchResult | null) => void
  setSearchFilters: (filters: Partial<DrugSearchFilters>) => void
  setSearchLoading: (loading: boolean) => void
  setSearchError: (error: string | null) => void
  clearSearch: () => void

  // Drug actions
  setSelectedDrug: (drug: Drug | null) => void
  setDrugLoading: (loading: boolean) => void
  setDrugError: (error: string | null) => void

  // Recent searches and favorites
  addRecentSearch: (query: string) => void
  toggleFavoriteDrug: (drugId: string) => void
  clearRecentSearches: () => void

  // UI actions
  toggleSidebar: () => void
  setViewMode: (mode: 'grid' | 'list') => void
}

type DrugStore = DrugStoreState & DrugStoreActions

const initialState: DrugStoreState = {
  searchResults: null,
  searchFilters: {
    page: 1,
    limit: 20,
    sortBy: 'relevance',
    sortOrder: 'desc'
  },
  searchLoading: false,
  searchError: null,
  selectedDrug: null,
  drugLoading: false,
  drugError: null,
  recentSearches: [],
  favoriteDrugs: [],
  sidebarOpen: false,
  viewMode: 'grid'
}

export const useDrugStore = create<DrugStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // Search actions
        setSearchResults: (results) => set({ searchResults: results }),
        setSearchFilters: (filters) => 
          set((state) => ({ 
            searchFilters: { ...state.searchFilters, ...filters }
          })),
        setSearchLoading: (loading) => set({ searchLoading: loading }),
        setSearchError: (error) => set({ searchError: error }),
        clearSearch: () => set({ 
          searchResults: null, 
          searchError: null,
          searchFilters: initialState.searchFilters
        }),

        // Drug actions
        setSelectedDrug: (drug) => set({ selectedDrug: drug }),
        setDrugLoading: (loading) => set({ drugLoading: loading }),
        setDrugError: (error) => set({ drugError: error }),

        // Recent searches and favorites
        addRecentSearch: (query) => {
          const current = get().recentSearches
          const updated = [query, ...current.filter(s => s !== query)].slice(0, 10)
          set({ recentSearches: updated })
        },
        toggleFavoriteDrug: (drugId) => {
          const current = get().favoriteDrugs
          const updated = current.includes(drugId)
            ? current.filter(id => id !== drugId)
            : [...current, drugId]
          set({ favoriteDrugs: updated })
        },
        clearRecentSearches: () => set({ recentSearches: [] }),

        // UI actions
        toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
        setViewMode: (mode) => set({ viewMode: mode })
      }),
      {
        name: 'drug-store',
        partialize: (state) => ({
          recentSearches: state.recentSearches,
          favoriteDrugs: state.favoriteDrugs,
          viewMode: state.viewMode
        })
      }
    ),
    { name: 'DrugStore' }
  )
)