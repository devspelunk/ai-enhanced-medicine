import { z } from 'zod'

// Core drug information schema
export const DrugSchema = z.object({
  id: z.string(),
  name: z.string(),
  genericName: z.string().optional(),
  brandName: z.string().optional(),
  manufacturer: z.string(),
  dosageForm: z.string(),
  strength: z.string(),
  route: z.string(),
  ndc: z.string().optional(),
  fdaApplicationNumber: z.string().optional(),
  approvalDate: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// Drug label information schema
export const DrugLabelSchema = z.object({
  id: z.string(),
  drugId: z.string(),
  indications: z.string(),
  contraindications: z.string().optional(),
  warnings: z.string().optional(),
  precautions: z.string().optional(),
  adverseReactions: z.string().optional(),
  dosageAndAdministration: z.string().optional(),
  howSupplied: z.string().optional(),
  clinicalPharmacology: z.string().optional(),
  mechanismOfAction: z.string().optional(),
  pharmacokinetics: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// AI-enhanced content schema
export const AIEnhancedContentSchema = z.object({
  id: z.string(),
  drugId: z.string(),
  seoTitle: z.string(),
  metaDescription: z.string(),
  enhancedIndications: z.string(),
  patientFriendlyDescription: z.string(),
  providerFriendlyExplanation: z.string(),
  relatedConditions: z.array(z.string()),
  relatedDrugs: z.array(z.string()),
  faqs: z.array(z.object({
    question: z.string(),
    answer: z.string()
  })),
  structuredData: z.record(z.any()),
  contentScore: z.number().min(0).max(100),
  lastEnhanced: z.date(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// Search and filtering schemas
export const DrugSearchFiltersSchema = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  manufacturer: z.string().optional(),
  dosageForm: z.string().optional(),
  indication: z.string().optional(),
  sortBy: z.enum(['name', 'manufacturer', 'approval_date', 'relevance']).default('relevance'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20)
})

export const DrugSearchResultSchema = z.object({
  drugs: z.array(DrugSchema.extend({
    enhancedContent: AIEnhancedContentSchema.pick({
      seoTitle: true,
      metaDescription: true,
      contentScore: true
    }).optional(),
    relevanceScore: z.number().optional()
  })),
  total: z.number(),
  page: z.number(),
  totalPages: z.number(),
  hasNext: z.boolean(),
  hasPrev: z.boolean()
})

// Type exports
export type Drug = z.infer<typeof DrugSchema>
export type DrugLabel = z.infer<typeof DrugLabelSchema>
export type AIEnhancedContent = z.infer<typeof AIEnhancedContentSchema>
export type DrugSearchFilters = z.infer<typeof DrugSearchFiltersSchema>
export type DrugSearchResult = z.infer<typeof DrugSearchResultSchema>

// Complete drug information for detailed pages
export const CompleteDrugInfoSchema = DrugSchema.extend({
  label: DrugLabelSchema.optional(),
  enhancedContent: AIEnhancedContentSchema.optional()
})

export type CompleteDrugInfo = z.infer<typeof CompleteDrugInfoSchema>