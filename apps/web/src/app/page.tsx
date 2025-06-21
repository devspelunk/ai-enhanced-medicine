import { apiClient } from '@/lib/api-client'
import { DrugTable } from '@/components/drugs/drug-table'

async function getDrugs() {
  try {
    const response = await apiClient.drugs.search({ limit: 20 })
    return response.data || []
  } catch (error) {
    console.error('Failed to fetch drugs:', error)
    return []
  }
}

export default async function HomePage() {
  const drugs = await getDrugs()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <span className="inline-block mb-4 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
            AI-Enhanced Drug Information Platform
          </span>
          
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
            Drug Information Dashboard
          </h1>
          
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Access comprehensive FDA-approved drug information with AI-powered insights 
            for healthcare professionals.
          </p>
        </div>

        <DrugTable 
          drugs={drugs}
          title="Available Drugs"
          description="Browse and search through our comprehensive database of FDA-approved medications"
        />
      </div>
    </div>
  )
}