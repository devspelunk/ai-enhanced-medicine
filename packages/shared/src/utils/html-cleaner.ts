/**
 * Utility functions for cleaning HTML/markdown content from JSON data
 */

/**
 * Strips HTML tags from a string
 */
export function stripHtmlTags(text: string): string {
  if (!text || typeof text !== 'string') return text
  
  return text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&[^;]+;/g, ' ') // Remove HTML entities
    .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
    .trim()
}

/**
 * Recursively processes an object to strip HTML from string values
 */
export function cleanHtmlFromObject<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj
  }
  
  if (typeof obj === 'string') {
    return stripHtmlTags(obj) as T
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => cleanHtmlFromObject(item)) as T
  }
  
  if (typeof obj === 'object') {
    const cleaned: any = {}
    for (const [key, value] of Object.entries(obj)) {
      cleaned[key] = cleanHtmlFromObject(value)
    }
    return cleaned as T
  }
  
  return obj
}

/**
 * Processes JSON data to remove HTML/markdown content
 */
export function processJsonWithHtmlCleaning<T>(data: T): T {
  return cleanHtmlFromObject(data)
}

/**
 * Reads and processes a JSON file, stripping HTML from all string values
 */
export async function readAndCleanJsonFile<T>(filePath: string): Promise<T> {
  const fs = await import('fs')
  const fileContent = await fs.promises.readFile(filePath, 'utf-8')
  const jsonData = JSON.parse(fileContent)
  return processJsonWithHtmlCleaning<T>(jsonData)
}