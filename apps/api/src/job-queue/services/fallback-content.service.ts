import { Injectable, Logger } from '@nestjs/common';
import { Drug } from '../../drugs/drugs.entity';
import { DrugLabel } from '../../drugs/drug-label.entity';
import { AIEnhancedContent } from '../../ai-content/ai-enhanced-content.entity';

@Injectable()
export class FallbackContentService {
  private readonly logger = new Logger(FallbackContentService.name);

  generateSEOFallback(drug: Drug, label?: DrugLabel): Partial<AIEnhancedContent> {
    this.logger.log(`Generating fallback content for drug: ${drug.name} (ID: ${drug.id})`);

    const seoTitle = this.generateSEOTitle(drug);
    const metaDescription = this.generateMetaDescription(drug, label);
    const providerFriendlyDescription = this.generateProviderDescription(drug, label);
    const structuredData = this.generateBasicStructuredData(drug);
    const faqs = this.generateBasicFAQs(drug, label);

    return {
      seoTitle,
      metaDescription,
      patientFriendlyDescription: providerFriendlyDescription,
      structuredData,
      faqs,
      contentScore: 60, // Lower score indicates fallback content
      lastEnhanced: new Date(),
    };
  }

  private generateSEOTitle(drug: Drug): string {
    const drugName = drug.name || drug.drugName;
    const dosageForm = drug.dosageForm ? ` (${drug.dosageForm})` : '';
    const strength = drug.strength ? ` ${drug.strength}` : '';
    
    return `${drugName}${strength}${dosageForm} - Prescribing Information | Medication`;
  }

  private generateMetaDescription(drug: Drug, label?: DrugLabel): string {
    const drugName = drug.name || drug.drugName;
    let description = `Complete prescribing information for ${drugName}`;
    
    if (drug.dosageForm) {
      description += ` ${drug.dosageForm.toLowerCase()}`;
    }
    
    if (drug.strength) {
      description += ` ${drug.strength}`;
    }

    if (label?.indications) {
      const indication = this.extractFirstIndication(label.indications);
      if (indication) {
        description += `. Used for ${indication.toLowerCase()}`;
      }
    }

    if (drug.manufacturer) {
      description += `. Manufactured by ${drug.manufacturer}`;
    }

    description += '. Get FDA-approved drug information, dosing, and safety details.';

    // Ensure description is within meta description limits (150-160 characters)
    return description.length > 160 ? description.substring(0, 157) + '...' : description;
  }

  private generateProviderDescription(drug: Drug, label?: DrugLabel): string {
    const drugName = drug.name || drug.drugName;
    let description = `${drugName} is a prescription medication`;
    
    if (drug.dosageForm) {
      description += ` available as ${drug.dosageForm.toLowerCase()}`;
    }

    if (label?.indications) {
      const indication = this.extractFirstIndication(label.indications);
      if (indication) {
        description += ` used for the treatment of ${indication.toLowerCase()}`;
      }
    }

    if (drug.manufacturer) {
      description += `. It is manufactured by ${drug.manufacturer}`;
    }

    description += '. Healthcare providers should review complete prescribing information including contraindications, warnings, and adverse reactions before prescribing.';

    return description;
  }

  private generateBasicStructuredData(drug: Drug): Record<string, any> {
    const drugName = drug.name || drug.drugName;
    return {
      '@context': 'https://schema.org',
      '@type': 'Drug',
      name: drugName,
      description: `Prescription medication ${drugName}`,
      manufacturer: {
        '@type': 'Organization',
        name: drug.manufacturer || drug.labeler || 'Unknown Manufacturer',
      },
      dosageForm: drug.dosageForm,
      strength: drug.strength,
      identifier: {
        '@type': 'PropertyValue',
        name: 'NDC',
        value: drug.ndc,
      },
      url: `https://med.com/drugs/${drug.slug}`,
    };
  }

  private generateBasicFAQs(drug: Drug, label?: DrugLabel): Array<{ question: string; answer: string; category: string }> {
    const faqs: Array<{ question: string; answer: string; category: string }> = [];
    const drugName = drug.name || drug.drugName;

    // Basic drug information FAQ
    faqs.push({
      question: `What is ${drugName}?`,
      answer: `${drugName} is a prescription medication${drug.dosageForm ? ` available as ${drug.dosageForm.toLowerCase()}` : ''}${drug.manufacturer ? ` manufactured by ${drug.manufacturer}` : ''}.`,
      category: 'general',
    });

    // Dosage form FAQ
    if (drug.dosageForm && drug.strength) {
      faqs.push({
        question: `What strengths does ${drugName} come in?`,
        answer: `${drugName} is available as ${drug.dosageForm.toLowerCase()} in ${drug.strength} strength.`,
        category: 'dosing',
      });
    }

    // Manufacturer FAQ
    if (drug.manufacturer) {
      faqs.push({
        question: `Who makes ${drugName}?`,
        answer: `${drugName} is manufactured by ${drug.manufacturer}.`,
        category: 'general',
      });
    }

    // Indications FAQ from label if available
    if (label?.indications) {
      const indication = this.extractFirstIndication(label.indications);
      if (indication) {
        faqs.push({
          question: `What is ${drugName} used for?`,
          answer: `${drugName} is indicated for ${indication.toLowerCase()}. Consult your healthcare provider for complete prescribing information.`,
          category: 'indications',
        });
      }
    }

    // Safety FAQ
    if (label?.warnings || label?.contraindications) {
      faqs.push({
        question: `Are there any warnings for ${drugName}?`,
        answer: `${drugName} has important safety information including warnings and contraindications. Please consult the complete prescribing information and your healthcare provider.`,
        category: 'safety',
      });
    }

    // Generic storage FAQ
    faqs.push({
      question: `How should ${drugName} be stored?`,
      answer: `Store ${drugName} as directed on the prescription label. Keep all medications away from children and pets.`,
      category: 'storage',
    });

    return faqs;
  }

  private extractFirstIndication(indications: string): string | null {
    if (!indications) return null;

    // Try to extract the first sentence or meaningful indication
    const sentences = indications.split(/[.!?]+/);
    const firstSentence = sentences[0]?.trim();
    
    if (firstSentence && firstSentence.length > 10 && firstSentence.length < 200) {
      return firstSentence;
    }

    // If first sentence is too short or long, try to find indication patterns
    const indicationPatterns = [
      /indicated for (.*?)(?:\.|,|;|$)/i,
      /used to treat (.*?)(?:\.|,|;|$)/i,
      /treatment of (.*?)(?:\.|,|;|$)/i,
    ];

    for (const pattern of indicationPatterns) {
      const match = indications.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  generateBasicKeywords(drug: Drug): string[] {
    const keywords: string[] = [];
    const drugName = drug.name || drug.drugName;
    
    if (drugName) {
      keywords.push(drugName, drugName.toLowerCase());
    }
    
    if (drug.dosageForm) {
      keywords.push(drug.dosageForm, drug.dosageForm.toLowerCase());
    }
    
    if (drug.manufacturer) {
      keywords.push(drug.manufacturer);
    }

    // Add generic pharmaceutical keywords
    keywords.push(
      'prescription medication',
      'drug information',
      'prescribing information',
      'pharmaceutical',
      'medication guide'
    );

    // Remove duplicates and empty strings
    return [...new Set(keywords.filter(keyword => keyword && keyword.trim().length > 0))];
  }

  generateContentSummary(drug: Drug, label?: DrugLabel): string {
    const drugName = drug.name || drug.drugName;
    let summary = `${drugName} is a prescription medication`;
    
    if (drug.dosageForm) {
      summary += ` available as ${drug.dosageForm.toLowerCase()}`;
    }
    
    if (drug.manufacturer) {
      summary += `, manufactured by ${drug.manufacturer}`;
    }
    
    summary += '. This medication requires a prescription from a healthcare provider.';
    
    if (label?.warnings) {
      summary += ' Important safety information and warnings apply.';
    }
    
    return summary;
  }
}