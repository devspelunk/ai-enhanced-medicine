'use client'

import Link from 'next/link'
import { Heart, Star, Calendar, Building2, Pill } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useDrugStore } from '@/stores/drug-store'
import type { Drug } from '@drug-platform/shared'
import { formatDistanceToNow } from 'date-fns'

interface DrugCardProps {
  drug: Drug & {
    enhancedContent?: {
      seoTitle: string
      metaDescription: string
      contentScore: number
    }
    relevanceScore?: number
  }
  className?: string
}

export function DrugCard({ drug, className }: DrugCardProps) {
  const { favoriteDrugs, toggleFavoriteDrug } = useDrugStore()
  const isFavorite = favoriteDrugs.includes(drug.id)
  
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleFavoriteDrug(drug.id)
  }

  const drugUrl = `/drugs/${drug.id}`
  const approvalDate = drug.approvalDate ? new Date(drug.approvalDate) : null

  return (
    <Card className={`group hover:shadow-lg transition-all duration-200 hover:border-blue-200 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <Link href={drugUrl} className="block">
              <h3 className="font-semibold text-lg text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                {drug.enhancedContent?.seoTitle || drug.name}
              </h3>
              {drug.genericName && drug.genericName !== drug.name && (
                <p className="text-sm text-gray-600 mt-1">
                  Generic: {drug.genericName}
                </p>
              )}
            </Link>
          </div>
          
          <div className="flex items-center space-x-1 ml-2">
            {drug.enhancedContent?.contentScore && (
              <div className="flex items-center space-x-1">
                <Star className="h-3 w-3 text-yellow-500 fill-current" />
                <span className="text-xs text-gray-600">
                  {Math.round(drug.enhancedContent.contentScore)}
                </span>
              </div>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-400 hover:text-red-500"
              onClick={handleFavoriteClick}
            >
              <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current text-red-500' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Description */}
        {drug.enhancedContent?.metaDescription && (
          <p className="text-sm text-gray-600 line-clamp-3">
            {drug.enhancedContent.metaDescription}
          </p>
        )}

        {/* Drug Details */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="text-xs">
            <Pill className="h-3 w-3 mr-1" />
            {drug.dosageForm}
          </Badge>
          {drug.strength && (
            <Badge variant="outline" className="text-xs">
              {drug.strength}
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">
            {drug.route}
          </Badge>
        </div>

        {/* Manufacturer and Approval */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <Building2 className="h-3 w-3" />
            <span className="truncate max-w-[120px]">{drug.manufacturer}</span>
          </div>
          
          {approvalDate && (
            <div className="flex items-center space-x-1">
              <Calendar className="h-3 w-3" />
              <span>{formatDistanceToNow(approvalDate, { addSuffix: true })}</span>
            </div>
          )}
        </div>

        {/* Relevance Score (for search results) */}
        {drug.relevanceScore && (
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-xs text-gray-500">Relevance</span>
            <div className="flex items-center space-x-1">
              <div className="w-12 h-1 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${drug.relevanceScore}%` }}
                />
              </div>
              <span className="text-xs text-gray-600">
                {Math.round(drug.relevanceScore)}%
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}