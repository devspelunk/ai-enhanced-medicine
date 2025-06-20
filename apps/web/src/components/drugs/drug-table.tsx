import Link from 'next/link'

interface Drug {
  id: string
  name: string
  genericName?: string
  manufacturer?: string
  ndc?: string
  dosageForm?: string
  strength?: string
  slug: string
}

interface DrugTableProps {
  drugs: Drug[]
  title?: string
  description?: string
}

export function DrugTable({ drugs, title = "Drug Information", description = "Browse available drug information" }: DrugTableProps) {
  if (!drugs || drugs.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow border p-6">
        <h2 className="text-xl font-semibold mb-2">{title}</h2>
        <p className="text-gray-600 mb-4">{description}</p>
        <p className="text-gray-500">No drugs found.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow border p-6">
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <p className="text-gray-600 mb-6">{description}</p>
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left p-4 font-medium">Drug Name</th>
              <th className="text-left p-4 font-medium">Generic Name</th>
              <th className="text-left p-4 font-medium">Manufacturer</th>
              <th className="text-left p-4 font-medium">Dosage Form</th>
              <th className="text-left p-4 font-medium">Strength</th>
              <th className="text-left p-4 font-medium">NDC</th>
              <th className="text-left p-4 font-medium w-32">Actions</th>
            </tr>
          </thead>
          <tbody>
            {drugs.map((drug) => (
              <tr key={drug.id} className="border-b hover:bg-gray-50">
                <td className="p-4 font-medium">{drug.name}</td>
                <td className="p-4">
                  {drug.genericName ? (
                    <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm">
                      {drug.genericName}
                    </span>
                  ) : (
                    <span className="text-gray-500">—</span>
                  )}
                </td>
                <td className="p-4">{drug.manufacturer || '—'}</td>
                <td className="p-4">{drug.dosageForm || '—'}</td>
                <td className="p-4">{drug.strength || '—'}</td>
                <td className="p-4 font-mono text-sm">{drug.ndc || '—'}</td>
                <td className="p-4">
                  <Link 
                    href={`/drugs/${drug.slug}`}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
                  >
                    View Details
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}