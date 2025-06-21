'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Search, Filter, TrendingUp } from 'lucide-react'
import { DrugCard } from '@/components/drugs/drug-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useSearchDrugs, useSearchSuggestions } from '@/hooks/use-search'
import { useDrugStore } from '@/stores/drug-store'
import type { Drug } from '@drug-platform/shared'

export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q') || ''
  
  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const { recentSearches, addRecentSearch } = useDrugStore()

  // Search drugs using custom hooks
  const { data: searchResults, isLoading, error, refetch } = useSearchDrugs(
    { query: initialQuery, limit: 20 },
    initialQuery.length > 0
  )

  // Get search suggestions
  const { data: suggestions } = useSearchSuggestions(searchQuery, searchQuery.length > 1)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      const query = searchQuery.trim()
      addRecentSearch(query)
      router.push(`/search?q=${encodeURIComponent(query)}`)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion)
    addRecentSearch(suggestion)
    router.push(`/search?q=${encodeURIComponent(suggestion)}`)
  }

  const handleRecentSearchClick = (query: string) => {
    setSearchQuery(query)
    router.push(`/search?q=${encodeURIComponent(query)}`)
  }

  useEffect(() => {
    if (initialQuery) {
      setSearchQuery(initialQuery)
    }
  }, [initialQuery])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {initialQuery ? 'Search Results' : 'Search Drugs'}
          </h1>
          <p className="text-lg text-gray-600">
            {initialQuery 
              ? `Results for "${initialQuery}"` 
              : 'Find comprehensive drug information enhanced with AI insights'
            }
          </p>
        </div>

        {/* Search Bar */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="search"
                placeholder="Search drugs by name, condition, or manufacturer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 h-12 text-base"
              />
              <Button type="submit" className="absolute right-2 top-1/2 transform -translate-y-1/2">
                Search
              </Button>
            </form>

            {/* Search Suggestions */}
            {suggestions && suggestions.length > 0 && searchQuery && !initialQuery && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">Suggestions:</p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.slice(0, 5).map((suggestion: string, index: number) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="text-xs"
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Searches */}
        {!initialQuery && recentSearches.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <TrendingUp className="h-5 w-5 mr-2" />
                Recent Searches
              </CardTitle>
              <CardDescription>
                Your recent drug searches
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {recentSearches.slice(0, 8).map((search: string, index: number) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="cursor-pointer hover:bg-blue-100"
                    onClick={() => handleRecentSearchClick(search)}
                  >
                    {search}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search Results */}
        {initialQuery && (
          <div>
            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {isLoading ? 'Searching...' : `Found ${searchResults?.total || 0} results`}
              </h2>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Refresh
              </Button>
            </div>

            {/* Error State */}
            {error && (
              <Alert className="mb-6">
                <AlertDescription>
                  Error searching drugs: {error.message}
                  <Button variant="outline" size="sm" className="ml-2" onClick={() => refetch()}>
                    Try Again
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_: unknown, i: number) => (
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
                      <Search className="h-12 w-12 mx-auto" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
                    <p className="text-gray-600 mb-4">
                      Try different search terms or check your spelling.
                    </p>
                    {searchResults.suggestions.length > 0 && (
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Did you mean:</p>
                        <div className="flex flex-wrap gap-2 justify-center">
                          {searchResults.suggestions.map((suggestion: string, index: number) => (
                            <Button
                              key={index}
                              variant="outline"
                              size="sm"
                              onClick={() => handleSuggestionClick(suggestion)}
                            >
                              {suggestion}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {searchResults.drugs.map((drug: Drug) => (
                        <DrugCard key={drug.id} drug={drug} />
                      ))}
                    </div>

                    {/* Suggestions */}
                    {searchResults.suggestions.length > 0 && (
                      <Card className="mt-8">
                        <CardHeader>
                          <CardTitle className="text-lg">Related Searches</CardTitle>
                          <CardDescription>
                            You might also be interested in these
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {searchResults.suggestions.map((suggestion: string, index: number) => (
                              <Button
                                key={index}
                                variant="outline"
                                size="sm"
                                onClick={() => handleSuggestionClick(suggestion)}
                              >
                                {suggestion}
                              </Button>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* Empty State for No Query */}
        {!initialQuery && recentSearches.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Search className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Start searching</h3>
            <p className="text-gray-600 mb-4">
              Enter a drug name, manufacturer, or medical condition to begin.
            </p>
            <Button onClick={() => router.push('/drugs')}>
              Browse All Drugs
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}