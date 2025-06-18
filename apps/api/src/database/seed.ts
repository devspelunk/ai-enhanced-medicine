import { NestFactory } from '@nestjs/core'
import { AppModule } from '../app.module'
import { Repository } from 'typeorm'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Drug } from '../drugs/drugs.entity'
import { DrugLabel } from '../drugs/drug-label.entity'
import { AIEnhancedContent } from '../ai-content/ai-enhanced-content.entity'

// Sample FDA drug data for seeding
const sampleDrugs = [
  {
    name: 'TALTZ',
    genericName: 'ixekizumab',
    brandName: 'TALTZ',
    manufacturer: 'Eli Lilly and Company',
    dosageForm: 'injection',
    strength: '80 mg/mL',
    route: 'subcutaneous',
    ndc: '0002-4471-01',
    fdaApplicationNumber: 'BLA125521',
    approvalDate: '2016-03-22',
    label: {
      indications: 'TALTZ is indicated for the treatment of adults with moderate-to-severe plaque psoriasis who are candidates for systemic therapy or phototherapy.',
      contraindications: 'TALTZ is contraindicated in patients with a previous serious hypersensitivity reaction to ixekizumab or to any of the excipients.',
      warnings: 'Serious infections that may lead to hospitalization or death may occur in patients treated with TALTZ.',
      precautions: 'Prior to initiating treatment with TALTZ, patients should be evaluated for tuberculosis infection.',
      adverseReactions: 'The most common adverse reactions (≥1%) are injection site reactions, upper respiratory tract infections, nausea, and tinea infections.',
      dosageAndAdministration: 'The recommended dose is 160 mg (two 80 mg injections) at Week 0, followed by 80 mg at Weeks 2, 4, 6, 8, 10, and 12, then 80 mg every 12 weeks.',
      clinicalPharmacology: 'Ixekizumab is a humanized IgG4 monoclonal antibody that selectively binds with the interleukin 17A (IL-17A) cytokine.',
      mechanismOfAction: 'Ixekizumab binds selectively to the IL-17A cytokine and inhibits its interaction with the IL-17 receptor.'
    }
  },
  {
    name: 'HUMIRA',
    genericName: 'adalimumab',
    brandName: 'HUMIRA',
    manufacturer: 'AbbVie Inc.',
    dosageForm: 'injection',
    strength: '40 mg/0.8 mL',
    route: 'subcutaneous',
    ndc: '0074-3799-02',
    fdaApplicationNumber: 'BLA125057',
    approvalDate: '2002-12-31',
    label: {
      indications: 'HUMIRA is indicated for reducing signs and symptoms, inducing major clinical response, inhibiting the progression of structural damage, and improving physical function in adult patients with moderately to severely active rheumatoid arthritis.',
      contraindications: 'None.',
      warnings: 'Increased risk of severe infections that may lead to hospitalization or death.',
      precautions: 'Monitor for signs and symptoms of infection during and after treatment.',
      adverseReactions: 'The most common adverse reactions (≥10%) are infections, injection site reactions, headache, and rash.',
      dosageAndAdministration: 'The recommended dose for adult patients with rheumatoid arthritis is 40 mg administered every other week.',
      clinicalPharmacology: 'Adalimumab is a recombinant human IgG1 monoclonal antibody specific for human tumor necrosis factor (TNF).',
      mechanismOfAction: 'Adalimumab binds specifically to TNF-alpha and blocks its interaction with the p55 and p75 cell surface TNF receptors.'
    }
  },
  {
    name: 'LIPITOR',
    genericName: 'atorvastatin calcium',
    brandName: 'LIPITOR',
    manufacturer: 'Pfizer Inc.',
    dosageForm: 'tablet',
    strength: '20 mg',
    route: 'oral',
    ndc: '0071-0155-23',
    fdaApplicationNumber: 'NDA020702',
    approvalDate: '1996-12-17',
    label: {
      indications: 'LIPITOR is indicated as an adjunctive therapy to diet to reduce elevated total cholesterol, LDL cholesterol, apolipoprotein B, and triglycerides and to increase HDL cholesterol in patients with primary hypercholesterolemia and mixed dyslipidemia.',
      contraindications: 'LIPITOR is contraindicated in patients with active liver disease, which may include unexplained persistent elevations in hepatic transaminase levels.',
      warnings: 'Rare cases of rhabdomyolysis with acute renal failure secondary to myoglobinuria have been reported.',
      precautions: 'Liver enzyme tests should be performed before the initiation of treatment and as clinically indicated thereafter.',
      adverseReactions: 'The most commonly reported adverse reactions (incidence ≥2% and greater than placebo) are nasopharyngitis, arthralgia, diarrhea, pain in extremity, and urinary tract infection.',
      dosageAndAdministration: 'The patient should be placed on a standard cholesterol-lowering diet before receiving LIPITOR and should continue on this diet during treatment. The recommended starting dose is 10 or 20 mg once daily.',
      clinicalPharmacology: 'Atorvastatin is a selective, competitive inhibitor of HMG-CoA reductase, the rate-limiting enzyme that converts 3-hydroxy-3-methylglutaryl-coenzyme A to mevalonate.',
      mechanismOfAction: 'Atorvastatin lowers plasma cholesterol and lipoprotein levels by inhibiting HMG-CoA reductase and cholesterol synthesis in the liver.'
    }
  }
]

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule)
  
  const drugRepository = app.get<Repository<Drug>>(getRepositoryToken(Drug))
  const labelRepository = app.get<Repository<DrugLabel>>(getRepositoryToken(DrugLabel))
  const aiContentRepository = app.get<Repository<AIEnhancedContent>>(getRepositoryToken(AIEnhancedContent))
  
  console.log('🌱 Starting database seed...')
  
  try {
    // Clear existing data
    await aiContentRepository.delete({})
    await labelRepository.delete({})
    await drugRepository.delete({})
    
    console.log('🧹 Cleared existing data')
    
    // Seed drugs and labels
    for (const drugData of sampleDrugs) {
      console.log(`📦 Seeding ${drugData.name}...`)
      
      // Create drug
      const drug = drugRepository.create({
        name: drugData.name,
        genericName: drugData.genericName,
        brandName: drugData.brandName,
        manufacturer: drugData.manufacturer,
        dosageForm: drugData.dosageForm,
        strength: drugData.strength,
        route: drugData.route,
        ndc: drugData.ndc,
        fdaApplicationNumber: drugData.fdaApplicationNumber,
        approvalDate: drugData.approvalDate
      })
      
      const savedDrug = await drugRepository.save(drug)
      
      // Create drug label
      const label = labelRepository.create({
        drugId: savedDrug.id,
        indications: drugData.label.indications,
        contraindications: drugData.label.contraindications,
        warnings: drugData.label.warnings,
        precautions: drugData.label.precautions,
        adverseReactions: drugData.label.adverseReactions,
        dosageAndAdministration: drugData.label.dosageAndAdministration,
        clinicalPharmacology: drugData.label.clinicalPharmacology,
        mechanismOfAction: drugData.label.mechanismOfAction
      })
      
      await labelRepository.save(label)
      
      // Create placeholder AI content (will be enhanced by AI service)
      const aiContent = aiContentRepository.create({
        drugId: savedDrug.id,
        seoTitle: `${drugData.name} (${drugData.genericName}) - Complete Drug Information`,
        metaDescription: `Comprehensive information about ${drugData.name} (${drugData.genericName}), including indications, dosage, side effects, and safety information.`,
        enhancedIndications: drugData.label.indications,
        patientFriendlyDescription: `${drugData.name} is a prescription medication used to treat specific medical conditions as prescribed by your healthcare provider.`,
        providerFriendlyExplanation: `${drugData.name} works by targeting specific pathways in the body to provide therapeutic benefit for patients with qualifying conditions.`,
        relatedConditions: [],
        relatedDrugs: [],
        faqs: [
          {
            question: `What is ${drugData.name} used for?`,
            answer: drugData.label.indications
          },
          {
            question: `How should I take ${drugData.name}?`,
            answer: drugData.label.dosageAndAdministration || 'Follow your healthcare provider\'s instructions for taking this medication.'
          }
        ],
        structuredData: {
          '@context': 'https://schema.org',
          '@type': 'Drug',
          'name': drugData.name,
          'activeIngredient': drugData.genericName,
          'manufacturer': drugData.manufacturer
        },
        contentScore: 75
      })
      
      await aiContentRepository.save(aiContent)
      
      console.log(`✅ Seeded ${drugData.name} successfully`)
    }
    
    console.log('🎉 Database seeding completed successfully!')
    
  } catch (error) {
    console.error('❌ Error seeding database:', error)
  } finally {
    await app.close()
  }
}

seed()