import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, Building2, Pill, Shield, AlertTriangle, Info, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

// This would typically come from your API
async function getDrugBySlug(slug: string) {
  // Mock data for demonstration
  const drugs = {
    'taltz-ixekizumab': {
      id: '1',
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
      createdAt: new Date(),
      updatedAt: new Date(),
      label: {
        indications: 'TALTZ is indicated for the treatment of adults with moderate-to-severe plaque psoriasis who are candidates for systemic therapy or phototherapy.',
        contraindications: 'TALTZ is contraindicated in patients with a previous serious hypersensitivity reaction to ixekizumab or to any of the excipients.',
        warnings: 'Serious infections that may lead to hospitalization or death may occur in patients treated with TALTZ.',
        precautions: 'Prior to initiating treatment with TALTZ, patients should be evaluated for tuberculosis infection.',
        adverseReactions: 'The most common adverse reactions (≥1%) are injection site reactions, upper respiratory tract infections, nausea, and tinea infections.',
        dosageAndAdministration: 'The recommended dose is 160 mg (two 80 mg injections) at Week 0, followed by 80 mg at Weeks 2, 4, 6, 8, 10, and 12, then 80 mg every 12 weeks.',
        clinicalPharmacology: 'Ixekizumab is a humanized IgG4 monoclonal antibody that selectively binds with the interleukin 17A (IL-17A) cytokine.',
        mechanismOfAction: 'Ixekizumab binds selectively to the IL-17A cytokine and inhibits its interaction with the IL-17 receptor.'
      },
      enhancedContent: [{
        seoTitle: 'TALTZ (ixekizumab) - Complete Drug Information for Healthcare Professionals',
        metaDescription: 'Comprehensive information about TALTZ (ixekizumab), including indications for psoriasis, dosing, side effects, and safety considerations.',
        patientFriendlyDescription: 'TALTZ is a prescription medication used to treat moderate-to-severe plaque psoriasis in adults who need systemic therapy or phototherapy.',
        providerFriendlyExplanation: 'TALTZ (ixekizumab) is a humanized monoclonal antibody that specifically targets IL-17A, providing targeted therapy for psoriasis patients.',
        contentScore: 95,
        faqs: [
          {
            question: 'What is TALTZ used for?',
            answer: 'TALTZ is used to treat moderate-to-severe plaque psoriasis in adults who are candidates for systemic therapy or phototherapy.'
          },
          {
            question: 'How is TALTZ administered?',
            answer: 'TALTZ is given as a subcutaneous injection. The recommended dose is 160 mg initially, followed by 80 mg at specific intervals.'
          },
          {
            question: 'What are the most common side effects?',
            answer: 'The most common side effects include injection site reactions, upper respiratory tract infections, nausea, and fungal infections.'
          }
        ]
      }]
    }
  }

  return drugs[slug as keyof typeof drugs] || null
}

interface DrugPageProps {
  params: {
    slug: string
  }
}

export async function generateMetadata({ params }: DrugPageProps): Promise<Metadata> {
  const drug = await getDrugBySlug(params.slug)
  
  if (!drug) {
    return {
      title: 'Drug Not Found',
      description: 'The requested drug information could not be found.'
    }
  }

  const enhancedContent = drug.enhancedContent?.[0]
  
  return {
    title: enhancedContent?.seoTitle || `${drug.name} (${drug.genericName}) - Drug Information`,
    description: enhancedContent?.metaDescription || `Information about ${drug.name}, including uses, dosage, and side effects.`,
    keywords: [
      drug.name,
      drug.genericName,
      drug.manufacturer,
      'drug information',
      'prescription medication',
      'healthcare'
    ],
    openGraph: {
      title: enhancedContent?.seoTitle || drug.name,
      description: enhancedContent?.metaDescription || `Information about ${drug.name}`,
      type: 'article',
      publishedTime: drug.approvalDate,
      modifiedTime: drug.updatedAt.toISOString()
    },
    alternates: {
      canonical: `/drugs/${params.slug}`
    }
  }
}

export default async function DrugPage({ params }: DrugPageProps) {
  const drug = await getDrugBySlug(params.slug)
  
  if (!drug) {
    notFound()
  }

  const enhancedContent = drug.enhancedContent?.[0]
  const approvalDate = drug.approvalDate ? new Date(drug.approvalDate) : null

  // Structured data for SEO
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Drug',
    'name': drug.name,
    'activeIngredient': drug.genericName,
    'manufacturer': {
      '@type': 'Organization',
      'name': drug.manufacturer
    },
    'dosageForm': drug.dosageForm,
    'strength': drug.strength,
    'routeOfAdministration': drug.route,
    'description': enhancedContent?.metaDescription || drug.label?.indications
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          {/* Navigation */}
          <div className="mb-6">
            <Button variant="ghost" asChild className="mb-4">
              <Link href="/drugs">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Drug Search
              </Link>
            </Button>
            
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Link href="/" className="hover:text-blue-600">Home</Link>
              <span>/</span>
              <Link href="/drugs" className="hover:text-blue-600">Drugs</Link>
              <span>/</span>
              <span className="text-gray-900">{drug.name}</span>
            </div>
          </div>

          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {drug.name}
                  {drug.genericName && drug.genericName !== drug.name && (
                    <span className="text-xl text-gray-600 font-normal ml-2">
                      ({drug.genericName})
                    </span>
                  )}
                </h1>
                
                {enhancedContent?.patientFriendlyDescription && (
                  <p className="text-lg text-gray-700 mb-4 leading-relaxed">
                    {enhancedContent.patientFriendlyDescription}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="secondary" className="text-sm">
                    <Pill className="h-3 w-3 mr-1" />
                    {drug.dosageForm}
                  </Badge>
                  <Badge variant="outline" className="text-sm">
                    {drug.strength}
                  </Badge>
                  <Badge variant="outline" className="text-sm">
                    {drug.route}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center text-gray-600">
                    <Building2 className="h-4 w-4 mr-2" />
                    <span>{drug.manufacturer}</span>
                  </div>
                  {approvalDate && (
                    <div className="flex items-center text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>Approved {approvalDate.getFullYear()}</span>
                    </div>
                  )}
                  {drug.ndc && (
                    <div className="flex items-center text-gray-600">
                      <span className="font-medium mr-2">NDC:</span>
                      <span>{drug.ndc}</span>
                    </div>
                  )}
                </div>
              </div>

              {enhancedContent?.contentScore && (
                <div className="mt-4 lg:mt-0 lg:ml-6">
                  <Card className="w-full lg:w-48">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Content Quality</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${enhancedContent.contentScore}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">
                          {enhancedContent.contentScore}%
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="dosing">Dosing</TabsTrigger>
                  <TabsTrigger value="safety">Safety</TabsTrigger>
                  <TabsTrigger value="clinical">Clinical</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                  {/* Indications */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Info className="h-5 w-5 mr-2 text-blue-600" />
                        Indications
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700 leading-relaxed">
                        {drug.label?.indications}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Provider-Friendly Explanation */}
                  {enhancedContent?.providerFriendlyExplanation && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <Users className="h-5 w-5 mr-2 text-green-600" />
                          Clinical Overview
                        </CardTitle>
                        <CardDescription>
                          Enhanced explanation for healthcare providers
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-700 leading-relaxed">
                          {enhancedContent.providerFriendlyExplanation}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {/* FAQs */}
                  {enhancedContent?.faqs && enhancedContent.faqs.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Frequently Asked Questions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Accordion type="single" collapsible>
                          {enhancedContent.faqs.map((faq, index) => (
                            <AccordionItem key={index} value={`faq-${index}`}>
                              <AccordionTrigger>{faq.question}</AccordionTrigger>
                              <AccordionContent>
                                <p className="text-gray-700 leading-relaxed">
                                  {faq.answer}
                                </p>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="dosing" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Dosage and Administration</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {drug.label?.dosageAndAdministration ? (
                        <p className="text-gray-700 leading-relaxed">
                          {drug.label.dosageAndAdministration}
                        </p>
                      ) : (
                        <p className="text-gray-500 italic">
                          Dosage information not available. Consult prescribing information.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="safety" className="space-y-6">
                  {/* Contraindications */}
                  {drug.label?.contraindications && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center text-red-600">
                          <Shield className="h-5 w-5 mr-2" />
                          Contraindications
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            {drug.label.contraindications}
                          </AlertDescription>
                        </Alert>
                      </CardContent>
                    </Card>
                  )}

                  {/* Warnings */}
                  {drug.label?.warnings && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center text-orange-600">
                          <AlertTriangle className="h-5 w-5 mr-2" />
                          Warnings
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-700 leading-relaxed">
                          {drug.label.warnings}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Adverse Reactions */}
                  {drug.label?.adverseReactions && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Adverse Reactions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-700 leading-relaxed">
                          {drug.label.adverseReactions}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Precautions */}
                  {drug.label?.precautions && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Precautions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-700 leading-relaxed">
                          {drug.label.precautions}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="clinical" className="space-y-6">
                  {/* Clinical Pharmacology */}
                  {drug.label?.clinicalPharmacology && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Clinical Pharmacology</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-700 leading-relaxed">
                          {drug.label.clinicalPharmacology}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Mechanism of Action */}
                  {drug.label?.mechanismOfAction && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Mechanism of Action</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-700 leading-relaxed">
                          {drug.label.mechanismOfAction}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Drug Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Drug Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Generic Name</span>
                    <p className="text-sm">{drug.genericName || 'N/A'}</p>
                  </div>
                  <Separator />
                  <div>
                    <span className="text-sm font-medium text-gray-500">Manufacturer</span>
                    <p className="text-sm">{drug.manufacturer}</p>
                  </div>
                  <Separator />
                  <div>
                    <span className="text-sm font-medium text-gray-500">Dosage Form</span>
                    <p className="text-sm capitalize">{drug.dosageForm}</p>
                  </div>
                  <Separator />
                  <div>
                    <span className="text-sm font-medium text-gray-500">Strength</span>
                    <p className="text-sm">{drug.strength}</p>
                  </div>
                  <Separator />
                  <div>
                    <span className="text-sm font-medium text-gray-500">Route</span>
                    <p className="text-sm capitalize">{drug.route}</p>
                  </div>
                  {drug.fdaApplicationNumber && (
                    <>
                      <Separator />
                      <div>
                        <span className="text-sm font-medium text-gray-500">FDA Application</span>
                        <p className="text-sm">{drug.fdaApplicationNumber}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Related Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Related Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <Building2 className="h-4 w-4 mr-2" />
                    More from {drug.manufacturer}
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Pill className="h-4 w-4 mr-2" />
                    Similar {drug.dosageForm}s
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Info className="h-4 w-4 mr-2" />
                    Drug Interactions
                  </Button>
                </CardContent>
              </Card>

              {/* Disclaimer */}
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="pt-6">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-orange-800 font-medium mb-1">
                        Medical Disclaimer
                      </p>
                      <p className="text-xs text-orange-700 leading-relaxed">
                        This information is for educational purposes only and should not replace 
                        professional medical advice. Always consult with a healthcare provider 
                        before making medical decisions.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}