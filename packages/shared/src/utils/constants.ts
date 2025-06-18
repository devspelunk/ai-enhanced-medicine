/**
 * Shared constants across the application
 */

// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  CACHE_TTL: 300000 // 5 minutes
} as const

// Drug Categories
export const DRUG_CATEGORIES = {
  CARDIOVASCULAR: 'cardiovascular',
  RESPIRATORY: 'respiratory',
  NEUROLOGICAL: 'neurological',
  GASTROINTESTINAL: 'gastrointestinal',
  MUSCULOSKELETAL: 'musculoskeletal',
  DERMATOLOGICAL: 'dermatological',
  OPHTHALMOLOGICAL: 'ophthalmological',
  OTOLOGICAL: 'otological',
  HEMATOLOGICAL: 'hematological',
  ENDOCRINE: 'endocrine',
  IMMUNOLOGICAL: 'immunological',
  REPRODUCTIVE: 'reproductive',
  UROLOGICAL: 'urological',
  ONCOLOGICAL: 'oncological',
  PSYCHIATRIC: 'psychiatric',
  INFECTIOUS_DISEASE: 'infectious_disease',
  OTHER: 'other'
} as const

// Dosage Forms
export const DOSAGE_FORMS = {
  TABLET: 'tablet',
  CAPSULE: 'capsule',
  LIQUID: 'liquid',
  INJECTION: 'injection',
  TOPICAL: 'topical',
  INHALER: 'inhaler',
  PATCH: 'patch',
  SUPPOSITORY: 'suppository',
  DROPS: 'drops',
  CREAM: 'cream',
  OINTMENT: 'ointment',
  GEL: 'gel',
  POWDER: 'powder',
  OTHER: 'other'
} as const

// Routes of Administration
export const ADMINISTRATION_ROUTES = {
  ORAL: 'oral',
  INTRAVENOUS: 'intravenous',
  INTRAMUSCULAR: 'intramuscular',
  SUBCUTANEOUS: 'subcutaneous',
  TOPICAL: 'topical',
  INHALATION: 'inhalation',
  NASAL: 'nasal',
  RECTAL: 'rectal',
  VAGINAL: 'vaginal',
  OPHTHALMIC: 'ophthalmic',
  OTIC: 'otic',
  TRANSDERMAL: 'transdermal',
  OTHER: 'other'
} as const

// AI Content Enhancement Settings
export const AI_CONTENT_CONFIG = {
  MAX_TITLE_LENGTH: 70,
  MAX_META_DESCRIPTION_LENGTH: 160,
  MIN_CONTENT_SCORE: 70,
  MAX_FAQS: 10,
  MAX_RELATED_ITEMS: 5
} as const

// SEO Configuration
export const SEO_CONFIG = {
  DEFAULT_TITLE: 'Drug Information Platform',
  DEFAULT_DESCRIPTION: 'Comprehensive drug information for healthcare professionals',
  TITLE_TEMPLATE: '%s | Drug Information Platform',
  CANONICAL_URL: process.env.NEXT_PUBLIC_SITE_URL || 'https://druginfo.com',
  TWITTER_HANDLE: '@druginfo',
  FACEBOOK_APP_ID: process.env.FACEBOOK_APP_ID || ''
} as const

// Cache Keys
export const CACHE_KEYS = {
  DRUG_LIST: 'drugs:list',
  DRUG_DETAIL: 'drug:detail',
  DRUG_SEARCH: 'drugs:search',
  AI_CONTENT: 'ai:content',
  POPULAR_DRUGS: 'drugs:popular',
  CATEGORIES: 'drugs:categories'
} as const

// Error Messages
export const ERROR_MESSAGES = {
  DRUG_NOT_FOUND: 'Drug not found',
  INVALID_INPUT: 'Invalid input provided',
  AI_SERVICE_UNAVAILABLE: 'AI service temporarily unavailable',
  DATABASE_ERROR: 'Database connection error',
  VALIDATION_FAILED: 'Data validation failed',
  UNAUTHORIZED: 'Unauthorized access',
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded',
  INTERNAL_SERVER_ERROR: 'Internal server error'
} as const

// Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const

export type DrugCategory = typeof DRUG_CATEGORIES[keyof typeof DRUG_CATEGORIES]
export type DosageForm = typeof DOSAGE_FORMS[keyof typeof DOSAGE_FORMS]
export type AdministrationRoute = typeof ADMINISTRATION_ROUTES[keyof typeof ADMINISTRATION_ROUTES]