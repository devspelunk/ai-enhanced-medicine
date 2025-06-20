'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { DrugCard } from '@/components/drugs/drug-card'
import { DrugSearch } from '@/components/drugs/drug-search'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Grid, List, Filter } from 'lucide-react'
import { useDrugStore } from '@/stores/drug-store'
import { useDrugSearch, usePopularDrugs } from '@/hooks/use-drugs'
import type { Drug } from '@drug-platform/shared'

export default function DrugsPage() {
  const searchParams = useSearchParams()
  const { viewMode, searchFilters, setSearchResults, setSearchLoading, setSearchError } = useDrugStore()
  
  // Get search filters from URL and store
  const currentFilters = {
    ...searchFilters,
    query: searchParams.get('q') || searchFilters.query,
    category: searchParams.get('category') || searchFilters.category,
    dosageForm: searchParams.get('dosageForm') || searchFilters.dosageForm,
    manufacturer: searchParams.get('manufacturer') || searchFilters.manufacturer
  }

  // Fetch drugs using custom hooks
  const { data: searchResults, isLoading, error, refetch } = useDrugSearch(currentFilters, true)

  const { data: popularDrugs } = usePopularDrugs(!currentFilters.query)

  useEffect(() => {
    setSearchLoading(isLoading)
    if (searchResults) {
      setSearchResults(searchResults)
      setSearchError(null)
    }
    if (error) {
      setSearchError(error.message)
    }
  }, [isLoading, searchResults, error, setSearchLoading, setSearchResults, setSearchError])

  const hasActiveFilters = currentFilters.query || currentFilters.category || 
                          currentFilters.dosageForm || currentFilters.manufacturer

  const drugsToShow = searchResults?.drugs || popularDrugs || []
  const showPopular = !hasActiveFilters && popularDrugs

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {hasActiveFilters ? 'Search Results' : 'Browse Drugs'}
          </h1>
          <p className="text-lg text-gray-600">
            {hasActiveFilters 
              ? `Found ${searchResults?.total || 0} drugs matching your criteria`
              : 'Discover comprehensive drug information enhanced with AI insights'
            }
          </p>
        </div>

        {/* Search Interface */}
        <div className="mb-8">
          <DrugSearch />
        </div>

        {/* Popular Drugs Section */}
        {showPopular && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">Popular Drugs</h2>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Refresh
              </Button>
            </div>
            
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="h-48 w-full rounded-lg" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {popularDrugs?.map((drug: any) => (
                  <DrugCard key={drug.id} drug={drug as Drug & { enhancedContent?: any; relevanceScore?: number }} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Search Results */}
        {hasActiveFilters && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Search Results {searchResults?.total ? `(${searchResults.total})` : ''}
              </h2>
              
              <div className="flex items-center space-x-2">
                <div className="hidden sm:flex border rounded-md">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="icon"
                    className="rounded-r-none"
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="icon"
                    className="rounded-l-none"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Error State */}
            {error && (
              <Alert className="mb-6">
                <AlertDescription>
                  Error loading search results: {error.message}
                  <Button variant="outline" size="sm" className="ml-2" onClick={() => refetch()}>
                    Try Again
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className={viewMode === 'grid' 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                : "space-y-4"
              }>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="h-48 w-full rounded-lg" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))}
              </div>
            )}

            {/* Results */}
            {!isLoading && searchResults && (
              <>
                {searchResults.drugs.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-gray-400 mb-4">
                      <Filter className="h-12 w-12 mx-auto" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No drugs found</h3>
                    <p className="text-gray-600 mb-4">
                      Try adjusting your search criteria or browse our popular drugs above.
                    </p>
                    <Button variant="outline" onClick={() => window.location.href = '/drugs'}>
                      Clear Filters
                    </Button>
                  </div>
                ) : (
                  <div className={viewMode === 'grid' 
                    ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    : "space-y-4"
                  }>
                    {searchResults.drugs.map((drug: any) => (
                      <DrugCard 
                        key={drug.id} 
                        drug={drug as Drug & { enhancedContent?: any; relevanceScore?: number }}
                        className={viewMode === 'list' ? 'flex-row' : ''}
                      />
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {searchResults.totalPages > 1 && (
                  <div className="mt-8 flex justify-center">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        disabled={!searchResults.hasPrev}
                        onClick={() => {
                          // Implementation for previous page
                        }}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-gray-600">
                        Page {searchResults.page} of {searchResults.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        disabled={!searchResults.hasNext}
                        onClick={() => {
                          // Implementation for next page
                        }}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}