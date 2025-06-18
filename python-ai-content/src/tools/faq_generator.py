"""
FAQ generation tool for creating structured Q&A content from drug information.
"""

import os
import logging
from typing import Dict, Any, List
import json
import re

try:
    from openai import AsyncOpenAI  # type: ignore
except ImportError:
    AsyncOpenAI = None

logger = logging.getLogger(__name__)


class FAQGenerator:
    """Generates structured FAQ content from drug information."""
    
    def __init__(self):
        if AsyncOpenAI is None:
            raise ImportError("OpenAI package not installed. Install with: pip install openai")
        self.client = AsyncOpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        self.model = os.getenv('OPENAI_MODEL', 'gpt-4o-mini')
    
    async def generate_faqs(
        self, 
        drug_data: Dict[str, Any], 
        audience: str = "healthcare_providers",
        max_questions: int = 10
    ) -> Dict[str, Any]:
        """Generate structured FAQ content from drug information."""
        
        try:
            prompt = self._build_faq_prompt(drug_data, audience, max_questions)
            
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a medical education expert who creates clear, informative FAQ content for healthcare professionals based on FDA drug information."
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
            
            # Enhance and validate FAQ content
            return self._enhance_faq_content(content, drug_data)
            
        except Exception as e:
            logger.error(f"Error generating FAQs: {e}")
            return self._fallback_faq_content(drug_data, audience)
    
    def _build_faq_prompt(self, drug_data: Dict[str, Any], audience: str, max_questions: int) -> str:
        """Build the prompt for FAQ generation."""
        
        drug_name = drug_data.get('drug_name', 'Unknown Drug')
        generic_name = drug_data.get('generic_name', '')
        indications = drug_data.get('indications_and_usage', '')
        dosage = drug_data.get('dosage_and_administration', '')
        warnings = drug_data.get('warnings_and_precautions', '')
        adverse_reactions = drug_data.get('adverse_reactions', '')
        contraindications = drug_data.get('contraindications', '')
        mechanism = drug_data.get('mechanism_of_action', '')
        pharmacokinetics = drug_data.get('pharmacokinetics', '')
        
        audience_guidance = {
            "healthcare_providers": "Focus on clinical decision-making, prescribing guidance, and professional concerns",
            "patients": "Focus on patient understanding, safety, and practical usage questions",
            "pharmacists": "Focus on dispensing, drug interactions, and pharmaceutical concerns",
            "researchers": "Focus on clinical data, study results, and scientific mechanisms"
        }
        
        return f"""
Create a comprehensive FAQ section for {drug_name} targeting {audience}.

**Drug Information:**
- Name: {drug_name}
- Generic Name: {generic_name}
- Indications: {indications[:600]}
- Dosage: {dosage[:500]}
- Warnings: {warnings[:500]}
- Adverse Reactions: {adverse_reactions[:400]}
- Contraindications: {contraindications[:300]}
- Mechanism: {mechanism[:400]}
- Pharmacokinetics: {pharmacokinetics[:400]}

**Audience Focus:** {audience_guidance.get(audience, '')}
**Maximum Questions:** {max_questions}

Please provide a JSON response with this structure:
{{
    "faqs": [
        {{
            "category": "Category Name",
            "question": "Specific question",
            "answer": "Detailed, accurate answer",
            "priority": "high|medium|low"
        }}
    ],
    "categories": ["Category 1", "Category 2", "Category 3"]
}}

FAQ Categories to consider:
- Indications & Usage
- Dosing & Administration  
- Safety & Warnings
- Side Effects & Monitoring
- Drug Interactions
- Patient Counseling
- Clinical Considerations

Requirements:
- Questions should address common clinical concerns
- Answers must be medically accurate and evidence-based
- Use clear, professional language
- Prioritize by clinical importance
- Include practical prescribing guidance
"""
    
    def _enhance_faq_content(self, content: Dict[str, Any], drug_data: Dict[str, Any]) -> Dict[str, Any]:
        """Enhance and validate FAQ content."""
        
        faqs = content.get("faqs", [])
        categories = content.get("categories", [])
        
        # Ensure we have fallback FAQs if none were generated
        if not faqs:
            faqs = self._generate_fallback_faqs(drug_data)
        
        # Validate and enhance each FAQ
        enhanced_faqs = []
        for faq in faqs:
            if self._validate_faq(faq):
                enhanced_faq = {
                    "category": faq.get("category", "General"),
                    "question": faq.get("question", ""),
                    "answer": faq.get("answer", ""),
                    "priority": faq.get("priority", "medium")
                }
                enhanced_faqs.append(enhanced_faq)
        
        # Extract categories from FAQs if not provided
        if not categories:
            categories = list(set([faq["category"] for faq in enhanced_faqs]))
        
        return {
            "faqs": enhanced_faqs,
            "categories": categories
        }
    
    def _validate_faq(self, faq: Dict[str, Any]) -> bool:
        """Validate that FAQ has required fields and content."""
        return (
            isinstance(faq.get("question"), str) and 
            len(faq.get("question", "").strip()) > 10 and
            isinstance(faq.get("answer"), str) and 
            len(faq.get("answer", "").strip()) > 20
        )
    
    def _generate_fallback_faqs(self, drug_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate fallback FAQs when AI generation fails."""
        drug_name = drug_data.get('drug_name', 'this medication')
        
        fallback_faqs = [
            {
                "category": "Indications & Usage",
                "question": f"What is {drug_name} used for?",
                "answer": self._extract_indication_summary(drug_data),
                "priority": "high"
            },
            {
                "category": "Dosing & Administration", 
                "question": f"How should {drug_name} be administered?",
                "answer": self._extract_dosing_summary(drug_data),
                "priority": "high"
            },
            {
                "category": "Safety & Warnings",
                "question": f"What are the main warnings for {drug_name}?",
                "answer": self._extract_warning_summary(drug_data),
                "priority": "high"
            },
            {
                "category": "Side Effects & Monitoring",
                "question": f"What adverse reactions should be monitored with {drug_name}?",
                "answer": self._extract_adverse_reactions_summary(drug_data),
                "priority": "medium"
            },
            {
                "category": "Patient Counseling",
                "question": f"What should patients know about taking {drug_name}?",
                "answer": f"Patients should take {drug_name} exactly as prescribed, report any unusual side effects, and follow up with their healthcare provider as recommended.",
                "priority": "medium"
            }
        ]
        
        return fallback_faqs
    
    def _extract_indication_summary(self, drug_data: Dict[str, Any]) -> str:
        """Extract concise indication summary."""
        indications = drug_data.get('indications_and_usage', '')
        
        if not indications:
            return f"{drug_data.get('drug_name', 'This medication')} is indicated for approved medical conditions as determined by the FDA."
        
        # Extract first sentence or main indication
        sentences = re.split(r'[.!?]', indications)
        if sentences and len(sentences[0].strip()) > 20:
            return sentences[0].strip() + "."
        
        return indications[:200].strip() + "..."
    
    def _extract_dosing_summary(self, drug_data: Dict[str, Any]) -> str:
        """Extract concise dosing summary."""
        dosage = drug_data.get('dosage_and_administration', '')
        dosage_form = drug_data.get('dosage_form', '')
        route = drug_data.get('route', '')
        
        if not dosage:
            summary = f"Administer as {dosage_form.lower() if dosage_form else 'directed'}"
            if route:
                summary += f" via {route.lower()}"
            summary += ". Follow complete prescribing information for specific dosing guidelines."
            return summary
        
        # Extract first dosing instruction
        sentences = re.split(r'[.!?]', dosage)
        if sentences and len(sentences[0].strip()) > 10:
            return sentences[0].strip() + ". Refer to complete prescribing information for detailed dosing guidelines."
        
        return dosage[:200].strip() + "..."
    
    def _extract_warning_summary(self, drug_data: Dict[str, Any]) -> str:
        """Extract concise warning summary."""
        warnings = drug_data.get('warnings_and_precautions', '')
        contraindications = drug_data.get('contraindications', '')
        
        summary_parts = []
        
        if contraindications:
            summary_parts.append(f"Contraindicated in patients with {contraindications[:100]}...")
        
        if warnings:
            if any(term in warnings.lower() for term in ['boxed warning', 'black box']):
                summary_parts.append("Contains boxed warning.")
            
            # Extract first warning
            sentences = re.split(r'[.!?]', warnings)
            if sentences and len(sentences[0].strip()) > 20:
                summary_parts.append(sentences[0].strip() + ".")
        
        if not summary_parts:
            summary_parts.append("Review complete prescribing information for all warnings and precautions.")
        
        return " ".join(summary_parts)
    
    def _extract_adverse_reactions_summary(self, drug_data: Dict[str, Any]) -> str:
        """Extract concise adverse reactions summary."""
        adverse_reactions = drug_data.get('adverse_reactions', '')
        
        if not adverse_reactions:
            return "Monitor patients for adverse reactions. Refer to complete prescribing information for detailed adverse reaction profile."
        
        # Extract first sentence or main reactions
        sentences = re.split(r'[.!?]', adverse_reactions)
        if sentences and len(sentences[0].strip()) > 20:
            return sentences[0].strip() + ". Monitor patients accordingly and refer to complete prescribing information."
        
        return adverse_reactions[:200].strip() + "..."
    
    def _fallback_faq_content(self, drug_data: Dict[str, Any], audience: str) -> Dict[str, Any]:
        """Generate complete fallback FAQ content."""
        faqs = self._generate_fallback_faqs(drug_data)
        categories = list(set([faq["category"] for faq in faqs]))
        
        return {
            "faqs": faqs,
            "categories": categories
        }