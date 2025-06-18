"""
SEO optimization tool for generating search-engine optimized content.
"""

import os
import logging
from typing import Dict, Any, List
import json

try:
    from openai import AsyncOpenAI  # type: ignore
except ImportError:
    AsyncOpenAI = None

logger = logging.getLogger(__name__)


class SEOOptimizer:
    """Generates SEO-optimized content from drug information."""
    
    def __init__(self):
        if AsyncOpenAI is None:
            raise ImportError("OpenAI package not installed. Install with: pip install openai")
        self.client = AsyncOpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        self.model = os.getenv('OPENAI_MODEL', 'gpt-4o-mini')
    
    async def generate_seo_content(
        self, 
        drug_data: Dict[str, Any], 
        target_audience: str = "healthcare_providers"
    ) -> Dict[str, Any]:
        """Generate SEO-optimized title, meta description, and keywords."""
        
        try:
            prompt = self._build_seo_prompt(drug_data, target_audience)
            
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert SEO content writer specializing in healthcare and pharmaceutical content. Generate accurate, compelling, and search-optimized content."
                    },
                    {
                        "role": "user", 
                        "content": prompt
                    }
                ],
                response_format={"type": "json_object"},
                temperature=0.3
            )
            
            content = json.loads(response.choices[0].message.content)
            
            # Validate and enhance the response
            return self._enhance_seo_content(content, drug_data)
            
        except Exception as e:
            logger.error(f"Error generating SEO content: {e}")
            return self._fallback_seo_content(drug_data)
    
    def _build_seo_prompt(self, drug_data: Dict[str, Any], target_audience: str) -> str:
        """Build the prompt for SEO content generation."""
        
        drug_name = drug_data.get('drug_name', 'Unknown Drug')
        generic_name = drug_data.get('generic_name', '')
        manufacturer = drug_data.get('manufacturer', '')
        dosage_form = drug_data.get('dosage_form', '')
        indications = drug_data.get('indications_and_usage', '')
        
        return f"""
Generate SEO-optimized content for the following pharmaceutical product:

**Drug Information:**
- Name: {drug_name}
- Generic Name: {generic_name}
- Manufacturer: {manufacturer}
- Dosage Form: {dosage_form}
- Indications: {indications[:500]}...

**Target Audience:** {target_audience}

Please provide a JSON response with the following structure:
{{
    "title": "SEO-optimized page title (50-60 characters)",
    "meta_description": "Compelling meta description (150-160 characters)",
    "keywords": ["relevant", "search", "keywords", "array"],
    "structured_data": {{
        "@context": "https://schema.org",
        "@type": "Drug",
        "name": "drug name",
        "description": "brief description",
        "manufacturer": "manufacturer name",
        "activeIngredient": "active ingredient"
    }}
}}

Requirements:
- Title should include drug name and primary indication
- Meta description should be compelling and informative
- Keywords should be relevant for healthcare professionals
- Structured data should follow Schema.org standards
- Content must be medically accurate
"""
    
    def _enhance_seo_content(self, content: Dict[str, Any], drug_data: Dict[str, Any]) -> Dict[str, Any]:
        """Enhance and validate SEO content."""
        
        # Ensure required fields exist
        enhanced = {
            "title": content.get("title", f"{drug_data.get('drug_name', 'Drug')} - Prescribing Information"),
            "meta_description": content.get("meta_description", f"Complete prescribing information for {drug_data.get('drug_name', 'this medication')}"),
            "keywords": content.get("keywords", []),
            "structured_data": content.get("structured_data", {})
        }
        
        # Add fallback keywords if none provided
        if not enhanced["keywords"]:
            enhanced["keywords"] = self._generate_fallback_keywords(drug_data)
        
        # Enhance structured data
        if not enhanced["structured_data"].get("@context"):
            enhanced["structured_data"] = self._generate_structured_data(drug_data)
        
        return enhanced
    
    def _generate_fallback_keywords(self, drug_data: Dict[str, Any]) -> List[str]:
        """Generate fallback keywords from drug data."""
        keywords = []
        
        if drug_name := drug_data.get('drug_name'):
            keywords.append(drug_name.lower())
        
        if generic_name := drug_data.get('generic_name'):
            keywords.append(generic_name.lower())
        
        if manufacturer := drug_data.get('manufacturer'):
            keywords.append(manufacturer.lower())
        
        if dosage_form := drug_data.get('dosage_form'):
            keywords.append(dosage_form.lower())
        
        # Add common medical keywords
        keywords.extend([
            "prescription medication",
            "prescribing information", 
            "drug information",
            "medication guide"
        ])
        
        return list(set(keywords))[:10]  # Limit to 10 unique keywords
    
    def _generate_structured_data(self, drug_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate Schema.org structured data."""
        return {
            "@context": "https://schema.org",
            "@type": "Drug",
            "name": drug_data.get('drug_name', ''),
            "description": f"Prescription medication {drug_data.get('drug_name', '')} manufactured by {drug_data.get('manufacturer', '')}",
            "manufacturer": {
                "@type": "Organization",
                "name": drug_data.get('manufacturer', '')
            },
            "activeIngredient": drug_data.get('generic_name', ''),
            "dosageForm": drug_data.get('dosage_form', ''),
            "strength": drug_data.get('strength', ''),
            "administrationRoute": drug_data.get('route', '')
        }
    
    def _fallback_seo_content(self, drug_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate fallback SEO content when AI fails."""
        drug_name = drug_data.get('drug_name', 'Medication')
        
        return {
            "title": f"{drug_name} - Prescribing Information & Drug Details",
            "meta_description": f"Complete prescribing information, dosage, side effects, and clinical data for {drug_name}. Healthcare provider resource.",
            "keywords": self._generate_fallback_keywords(drug_data),
            "structured_data": self._generate_structured_data(drug_data)
        }