/**
 * TypeScript interfaces for the new drug label schema structure
 * Based on label-schema.json
 */

export interface DrugLabelSchema {
  drugName: string
  setId: string
  slug: string
  labeler: string
  label: DrugLabel
}

export interface DrugLabel {
  genericName?: string
  labelerName?: string
  productType?: string
  effectiveTime?: string
  title?: string
  indicationsAndUsage?: string
  dosageAndAdministration?: string
  dosageFormsAndStrengths?: string
  contraindications?: string
  warningsAndPrecautions?: string
  adverseReactions?: string
  clinicalPharmacology?: string
  clinicalStudies?: string
  howSupplied?: string
  useInSpecificPopulations?: string
  description?: string
  nonclinicalToxicology?: string
  instructionsForUse?: string
  mechanismOfAction?: string
  highlights?: string
}

// Cleaned versions without HTML content
export interface CleanDrugLabelSchema {
  drugName: string
  setId: string
  slug: string
  labeler: string
  label: CleanDrugLabel
}

export interface CleanDrugLabel {
  genericName?: string
  labelerName?: string
  productType?: string
  effectiveTime?: string
  title?: string
  indicationsAndUsage?: string
  dosageAndAdministration?: string
  dosageFormsAndStrengths?: string
  contraindications?: string
  warningsAndPrecautions?: string
  adverseReactions?: string
  clinicalPharmacology?: string
  clinicalStudies?: string
  howSupplied?: string
  useInSpecificPopulations?: string
  description?: string
  nonclinicalToxicology?: string
  instructionsForUse?: string
  mechanismOfAction?: string
  highlights?: string
}

// Type for array of drug labels
export type DrugLabelSchemaArray = DrugLabelSchema[]
export type CleanDrugLabelSchemaArray = CleanDrugLabelSchema[]