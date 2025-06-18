import { z } from 'zod'

// Generic API response wrapper
export const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    timestamp: z.string().datetime()
  })

// API error schema
export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.any()).optional(),
  timestamp: z.string().datetime()
})

// Pagination schema
export const PaginationSchema = z.object({
  page: z.number().min(1),
  limit: z.number().min(1).max(100),
  total: z.number().min(0),
  totalPages: z.number().min(0),
  hasNext: z.boolean(),
  hasPrev: z.boolean()
})

// AI processing status
export const AIProcessingStatusSchema = z.object({
  id: z.string(),
  drugId: z.string(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  progress: z.number().min(0).max(100),
  message: z.string().optional(),
  startedAt: z.date(),
  completedAt: z.date().optional(),
  error: z.string().optional()
})

// MCP (Model Context Protocol) schemas
export const MCPToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  parameters: z.record(z.any())
})

export const MCPRequestSchema = z.object({
  tool: z.string(),
  parameters: z.record(z.any()),
  requestId: z.string().optional()
})

export const MCPResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  requestId: z.string().optional()
})

// Type exports
export type ApiResponse<T> = {
  success: boolean
  data?: T
  error?: string
  timestamp: string
}

export type ApiError = z.infer<typeof ApiErrorSchema>
export type Pagination = z.infer<typeof PaginationSchema>
export type AIProcessingStatus = z.infer<typeof AIProcessingStatusSchema>
export type MCPTool = z.infer<typeof MCPToolSchema>
export type MCPRequest = z.infer<typeof MCPRequestSchema>
export type MCPResponse = z.infer<typeof MCPResponseSchema>