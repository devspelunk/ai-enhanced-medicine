'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, Filter, Grid, List, SortAsc, SortDesc } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { useDrugStore } from '@/stores/drug-store'
import { DRUG_CATEGORIES, DOSAGE_FORMS } from '@drug-platform/shared'
import { useQueryState } from 'nuqs'

export function DrugSearch() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { 
    searchFilters, 
    setSearchFilters, 
    viewMode, 
    setViewMode,
    addRecentSearch 
  } = useDrugStore()

  // URL state management with nuqs
  const [query, setQuery] = useQueryState('q', { defaultValue: '' })
  const [category, setCategory] = useQueryState('category')
  const [dosageForm, setDosageForm] = useQueryState('dosageForm')
  const [manufacturer, setManufacturer] = useQueryState('manufacturer')
  const [sortBy, setSortBy] = useQueryState('sortBy', { defaultValue: 'relevance' })
  const [sortOrder, setSortOrder] = useQueryState('sortOrder', { defaultValue: 'desc' })

  const [localQuery, setLocalQuery] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Initialize local query from URL
  useEffect(() => {
    setLocalQuery(query || '')
  }, [query])

  // Update store when URL state changes
  useEffect(() => {
    setSearchFilters({
      query: query || undefined,
      category: category || undefined,
      dosageForm: dosageForm || undefined,
      manufacturer: manufacturer || undefined,
      sortBy: (sortBy as any) || 'relevance',
      sortOrder: (sortOrder as any) || 'desc'
    })
  }, [query, category, dosageForm, manufacturer, sortBy, sortOrder, setSearchFilters])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (localQuery.trim()) {
      setQuery(localQuery.trim())
      addRecentSearch(localQuery.trim())
    }
  }

  const clearFilters = () => {
    setQuery('')
    setCategory(null)
    setDosageForm(null)
    setManufacturer(null)
    setSortBy('relevance')
    setSortOrder('desc')
    setLocalQuery('')
  }

  const activeFiltersCount = [category, dosageForm, manufacturer].filter(Boolean).length

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="search"
          placeholder="Search drugs by name, condition, or manufacturer..."
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          className="pl-10 pr-4 h-12 text-base bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
        />
      </form>

      {/* Filters and View Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {/* Mobile Filters */}
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="relative">
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {activeFiltersCount > 0 && (
                  <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80">
              <SheetHeader>
                <SheetTitle>Search Filters</SheetTitle>
                <SheetDescription>
                  Refine your search with these filters
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <FilterControls
                  category={category}
                  setCategory={setCategory}
                  dosageForm={dosageForm}
                  setDosageForm={setDosageForm}
                  manufacturer={manufacturer}
                  setManufacturer={setManufacturer}
                />
                <Button onClick={clearFilters} variant="outline" className="w-full">
                  Clear All Filters
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          {/* Desktop Filters */}
          <div className="hidden md:flex items-center gap-2">
            <FilterControls
              category={category}
              setCategory={setCategory}
              dosageForm={dosageForm}
              setDosageForm={setDosageForm}
              manufacturer={manufacturer}
              setManufacturer={setManufacturer}
            />
            {activeFiltersCount > 0 && (
              <Button onClick={clearFilters} variant="ghost" size="sm">
                Clear ({activeFiltersCount})
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Sort Controls */}
          <Select value={sortBy || 'relevance'} onValueChange={setSortBy}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">Relevance</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="manufacturer">Manufacturer</SelectItem>
              <SelectItem value="approval_date">Approval Date</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          >
            {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
          </Button>

          {/* View Mode Toggle */}
          <div className="hidden sm:flex border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Active Filters Display */}
      {(query || category || dosageForm || manufacturer) && (
        <div className="flex flex-wrap gap-2">
          {query && (
            <Badge variant="secondary" className="cursor-pointer" onClick={() => setQuery('')}>
              Query: {query} ×
            </Badge>
          )}
          {category && (
            <Badge variant="secondary" className="cursor-pointer" onClick={() => setCategory(null)}>
              Category: {category} ×
            </Badge>
          )}
          {dosageForm && (
            <Badge variant="secondary" className="cursor-pointer" onClick={() => setDosageForm(null)}>
              Form: {dosageForm} ×
            </Badge>
          )}
          {manufacturer && (
            <Badge variant="secondary" className="cursor-pointer" onClick={() => setManufacturer(null)}>
              Manufacturer: {manufacturer} ×
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}

interface FilterControlsProps {
  category: string | null
  setCategory: (value: string | null) => void
  dosageForm: string | null
  setDosageForm: (value: string | null) => void
  manufacturer: string | null
  setManufacturer: (value: string | null) => void
}

function FilterControls({
  category,
  setCategory,
  dosageForm,
  setDosageForm,
  manufacturer,
  setManufacturer
}: FilterControlsProps) {
  return (
    <>
      <Select value={category || undefined} onValueChange={(value: string) => setCategory(value === 'all' ? null : value)}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {Object.entries(DRUG_CATEGORIES).map(([key, value]) => (
            <SelectItem key={key} value={value}>
              {key.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase())}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={dosageForm || undefined} onValueChange={(value: string) => setDosageForm(value === 'all' ? null : value)}>
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Form" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Forms</SelectItem>
          {Object.entries(DOSAGE_FORMS).map(([key, value]) => (
            <SelectItem key={key} value={value}>
              {key.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase())}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        placeholder="Manufacturer"
        value={manufacturer || ''}
        onChange={(e) => setManufacturer(e.target.value || null)}
        className="w-40"
      />
    </>
  )
}