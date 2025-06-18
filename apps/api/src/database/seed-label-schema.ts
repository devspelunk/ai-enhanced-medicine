import { NestFactory } from '@nestjs/core'
import { AppModule } from '../app.module'
import { Repository } from 'typeorm'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Drug } from '../drugs/drugs.entity'
import { DrugLabel } from '../drugs/drug-label.entity'
import { AIEnhancedContent } from '../ai-content/ai-enhanced-content.entity'
import * as fs from 'fs'
import * as path from 'path'
import { processJsonWithHtmlCleaning } from '../../../../packages/shared/src/utils/html-cleaner'
import { DrugLabelSchemaArray, CleanDrugLabelSchemaArray } from '../../../../packages/shared/src/types/drug-label-schema'

async function loadLabelSchemaData(): Promise<CleanDrugLabelSchemaArray> {
  const schemaPath = path.join(process.cwd(), '../../label-schema.json')
  console.log('📁 Loading label schema from:', schemaPath)
  
  try {
    const fileContent = fs.readFileSync(schemaPath, 'utf-8')
    const rawData: DrugLabelSchemaArray = JSON.parse(fileContent)
    
    console.log(`📊 Loaded ${rawData.length} drug entries from schema`)
    
    // Clean HTML content from all string values
    const cleanedData = processJsonWithHtmlCleaning<DrugLabelSchemaArray>(rawData)
    
    return cleanedData
  } catch (error) {
    console.error('❌ Error loading label schema:', error)
    throw error
  }
}

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule)
  
  const drugRepository = app.get<Repository<Drug>>(getRepositoryToken(Drug))
  const labelRepository = app.get<Repository<DrugLabel>>(getRepositoryToken(DrugLabel))
  const aiContentRepository = app.get<Repository<AIEnhancedContent>>(getRepositoryToken(AIEnhancedContent))
  
  console.log('🌱 Starting database seed with label-schema.json...')
  
  try {
    // Load data from label-schema.json
    const labelSchemaData = await loadLabelSchemaData()
    
    // Clear existing data
    await aiContentRepository.delete({})
    await labelRepository.delete({})
    await drugRepository.delete({})
    
    console.log('🧹 Cleared existing data')
    
    // Seed drugs and labels from schema
    for (const [index, drugData] of labelSchemaData.entries()) {
      console.log(`📦 Seeding ${drugData.drugName} (${index + 1}/${labelSchemaData.length})...`)
      
      // Create drug with new schema structure
      const drug = drugRepository.create({
        name: drugData.drugName,
        manufacturer: drugData.labeler,
        genericName: drugData.label.genericName,
        dosageForm: 'Unknown',
        strength: 'Unknown',
        route: 'Unknown'
      })
      
      const savedDrug = await drugRepository.save(drug)
      
      // Create drug label with new schema structure
      const label = labelRepository.create({
        drugId: savedDrug.id,
        indications: drugData.label.indicationsAndUsage || 'Not available',
        contraindications: drugData.label.contraindications,
        warnings: drugData.label.warningsAndPrecautions,
        adverseReactions: drugData.label.adverseReactions,
        dosageAndAdministration: drugData.label.dosageAndAdministration,
        howSupplied: drugData.label.howSupplied,
        clinicalPharmacology: drugData.label.clinicalPharmacology,
        mechanismOfAction: drugData.label.mechanismOfAction
      })
      
      await labelRepository.save(label)
      
      // Create placeholder AI content
      const aiContent = aiContentRepository.create({
        drugId: savedDrug.id,
        seoTitle: `${drugData.drugName}${drugData.label.genericName ? ` (${drugData.label.genericName})` : ''} - Complete Drug Information`,
        metaDescription: `Comprehensive information about ${drugData.drugName}${drugData.label.genericName ? ` (${drugData.label.genericName})` : ''}, including indications, dosage, side effects, and safety information.`,
        enhancedIndications: drugData.label.indicationsAndUsage || 'Indications information not available.',
        patientFriendlyDescription: `${drugData.drugName} is a prescription medication manufactured by ${drugData.labeler}. Please consult your healthcare provider for proper usage.`,
        providerFriendlyExplanation: `${drugData.drugName} works through specific mechanisms to provide therapeutic benefit for patients with qualifying conditions.`,
        relatedConditions: [],
        relatedDrugs: [],
        faqs: [
          {
            question: `What is ${drugData.drugName} used for?`,
            answer: drugData.label.indicationsAndUsage || 'Please consult your healthcare provider for indication information.'
          },
          {
            question: `How should I take ${drugData.drugName}?`,
            answer: drugData.label.dosageAndAdministration || 'Follow your healthcare provider\'s instructions for taking this medication.'
          },
          {
            question: `What are the side effects of ${drugData.drugName}?`,
            answer: drugData.label.adverseReactions || 'Please discuss potential side effects with your healthcare provider.'
          }
        ],
        structuredData: {
          '@context': 'https://schema.org',
          '@type': 'Drug',
          'name': drugData.drugName,
          'activeIngredient': drugData.label.genericName,
          'manufacturer': drugData.labeler
        },
        contentScore: 75
      })
      
      await aiContentRepository.save(aiContent)
      
      if ((index + 1) % 10 === 0) {
        console.log(`✅ Processed ${index + 1} drugs so far...`)
      }
    }
    
    console.log(`🎉 Database seeding completed successfully! Processed ${labelSchemaData.length} drugs.`)
    
  } catch (error) {
    console.error('❌ Error seeding database:', error)
  } finally {
    await app.close()
  }
}

seed()