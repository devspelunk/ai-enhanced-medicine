import { z } from 'zod'

/**
 * Utility functions for data validation and sanitization
 */

// Email validation
export const emailSchema = z.string().email()

// URL validation
export const urlSchema = z.string().url()

// Safe string validation (no XSS)
export const safeStringSchema = z.string().transform((str) => {
  // Basic XSS prevention - strip HTML tags
  return str.replace(/<[^>]*>/g, '').trim()
})

// Medical text validation (allows some HTML for formatting)
export const medicalTextSchema = z.string().transform((str) => {
  // Allow only safe HTML tags for medical content
  const allowedTags = /<\/?(?:p|br|strong|em|ul|ol|li|h[1-6])\b[^>]*>/gi
  return str.replace(/<(?!\/?)(?!(?:p|br|strong|em|ul|ol|li|h[1-6])\b)[^>]*>/gi, '').trim()
})

// NDC (National Drug Code) validation
export const ndcSchema = z.string().regex(
  /^\d{4,5}-\d{3,4}-\d{1,2}$/,
  'Invalid NDC format. Expected format: NNNN-NNN-NN or NNNNN-NNNN-N'
)

// FDA Application Number validation
export const fdaApplicationNumberSchema = z.string().regex(
  /^[A-Z]{1,3}\d{6}$/,
  'Invalid FDA application number format'
)

/**
 * Validates and sanitizes drug name
 */
export const validateDrugName = (name: string): string => {
  return safeStringSchema.parse(name)
}

/**
 * Validates medical content while preserving safe HTML
 */
export const validateMedicalContent = (content: string): string => {
  return medicalTextSchema.parse(content)
}

/**
 * Generic validation function with error handling
 */
export const validateWithSchema = <T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } => {
  try {
    const result = schema.parse(data)
    return { success: true, data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      }
    }
    return { success: false, error: 'Validation failed' }
  }
}