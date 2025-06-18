"""
Content transformation tool for creating provider-friendly content.
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

try:
    import textstat  # type: ignore
except ImportError:
    textstat = None

logger = logging.getLogger(__name__)


class ContentTransformer:
    """Transforms FDA drug information into provider-friendly content."""
    
    def __init__(self):
        if AsyncOpenAI is None:
            raise ImportError("OpenAI package not installed. Install with: pip install openai")
        self.client = AsyncOpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        self.model = os.getenv('OPENAI_MODEL', 'gpt-4o-mini')
    
    async def create_provider_content(
        self, 
        drug_data: Dict[str, Any], 
        complexity_level: str = "intermediate"
    ) -> Dict[str, Any]:
        """Transform drug information into provider-friendly content."""
        
        try:
            prompt = self._build_transformation_prompt(drug_data, complexity_level)
            
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a medical communications expert who transforms complex FDA drug labels into clear, actionable content for healthcare providers."
                    },
                    {
                        "role": "user", 
                        "content": prompt
                    }
                ],
                response_format={"type": "json_object"},
                temperature=0.2
            )
            
            content = json.loads(response.choices[0].message.content)
            
            # Calculate readability and enhance content
            return self._enhance_provider_content(content, drug_data)
            
        except Exception as e:
            logger.error(f"Error creating provider content: {e}")
            return self._fallback_provider_content(drug_data)
    
    def _build_transformation_prompt(self, drug_data: Dict[str, Any], complexity_level: str) -> str:
        """Build the prompt for content transformation."""
        
        drug_name = drug_data.get('drug_name', 'Unknown Drug')
        indications = drug_data.get('indications_and_usage', '')
        dosage = drug_data.get('dosage_and_administration', '')
        warnings = drug_data.get('warnings_and_precautions', '')
        adverse_reactions = drug_data.get('adverse_reactions', '')
        
        complexity_guidance = {
            "basic": "Use simple language suitable for general practitioners",
            "intermediate": "Use standard medical terminology for experienced clinicians",
            "advanced": "Use technical language for specialists and researchers"
        }
        
        return f"""
Transform the following FDA drug information into clear, actionable content for healthcare providers:

**Drug:** {drug_name}
**Complexity Level:** {complexity_level} - {complexity_guidance.get(complexity_level, '')}

**Original FDA Content:**
- Indications: {indications[:800]}
- Dosage: {dosage[:600]}
- Warnings: {warnings[:600]}
- Adverse Reactions: {adverse_reactions[:600]}

Please provide a JSON response with this structure:
{{
    "simplified_indications": "Clear, concise indication summary",
    "usage_instructions": "Step-by-step usage guidance for providers",
    "key_warnings": ["Warning 1", "Warning 2", "Warning 3"],
    "clinical_pearls": ["Practical tip 1", "Practical tip 2"],
    "patient_counseling_points": ["Point 1", "Point 2", "Point 3"]
}}

Requirements:
- Use active voice and clear language
- Focus on actionable information
- Highlight the most critical warnings
- Include practical prescribing tips
- Ensure medical accuracy
"""
    
    def _enhance_provider_content(self, content: Dict[str, Any], drug_data: Dict[str, Any]) -> Dict[str, Any]:
        """Enhance provider content with readability metrics and validation."""
        
        # Extract text for readability analysis
        all_text = " ".join([
            content.get("simplified_indications", ""),
            content.get("usage_instructions", ""),
            " ".join(content.get("key_warnings", [])),
            " ".join(content.get("clinical_pearls", [])),
            " ".join(content.get("patient_counseling_points", []))
        ])
        
        # Calculate readability score
        readability_score = self._calculate_readability(all_text)
        
        enhanced = {
            "simplified_indications": content.get("simplified_indications", self._simplify_indications(drug_data)),
            "usage_instructions": content.get("usage_instructions", self._create_usage_instructions(drug_data)),
            "key_warnings": content.get("key_warnings", self._extract_key_warnings(drug_data)),
            "readability_score": readability_score,
            "clinical_pearls": content.get("clinical_pearls", []),
            "patient_counseling_points": content.get("patient_counseling_points", [])
        }
        
        return enhanced
    
    def _calculate_readability(self, text: str) -> float:
        """Calculate readability score using Flesch-Kincaid."""
        if not text.strip():
            return 0.0
        
        if textstat is None:
            logger.warning("textstat not available, returning default readability score")
            return 50.0  # Default neutral score
        
        try:
            # Flesch Reading Ease (higher = more readable)
            return round(textstat.flesch_reading_ease(text), 2)
        except Exception as e:
            logger.warning(f"Error calculating readability: {e}")
            return 50.0
    
    def _simplify_indications(self, drug_data: Dict[str, Any]) -> str:
        """Create simplified indication text as fallback."""
        indications = drug_data.get('indications_and_usage', '')
        
        if not indications:
            return f"{drug_data.get('drug_name', 'This medication')} is prescribed for approved medical conditions."
        
        # Extract first sentence or paragraph
        sentences = re.split(r'[.!?]', indications)
        if sentences:
            return sentences[0].strip() + "."
        
        return indications[:200] + "..."
    
    def _create_usage_instructions(self, drug_data: Dict[str, Any]) -> str:
        """Create basic usage instructions as fallback."""
        dosage = drug_data.get('dosage_and_administration', '')
        dosage_form = drug_data.get('dosage_form', '')
        route = drug_data.get('route', '')
        
        instructions = []
        
        if dosage_form:
            instructions.append(f"Administer as {dosage_form.lower()}")
        
        if route:
            instructions.append(f"via {route.lower()} route")
        
        if dosage:
            # Extract first dosing instruction
            dosing_match = re.search(r'(\d+\s*(?:mg|mcg|g|mL|units?))', dosage, re.IGNORECASE)
            if dosing_match:
                instructions.append(f"Typical dose contains {dosing_match.group(1)}")
        
        instructions.append("Follow prescribing information for complete dosing guidelines")
        
        return ". ".join(instructions) + "."
    
    def _extract_key_warnings(self, drug_data: Dict[str, Any]) -> List[str]:
        """Extract key warnings as fallback."""
        warnings = drug_data.get('warnings_and_precautions', '')
        contraindications = drug_data.get('contraindications', '')
        
        key_warnings = []
        
        if contraindications:
            key_warnings.append(f"Contraindicated in patients with {contraindications[:100]}...")
        
        if warnings:
            # Look for boxed warning or serious warnings
            if any(term in warnings.lower() for term in ['boxed warning', 'black box', 'serious']):
                key_warnings.append("Contains boxed warning - review full prescribing information")
            
            # Extract first warning point
            warning_sentences = re.split(r'[.!?]', warnings)
            if warning_sentences:
                key_warnings.append(warning_sentences[0].strip() + ".")
        
        if not key_warnings:
            key_warnings.append("Review complete prescribing information for warnings and precautions")
        
        return key_warnings[:3]  # Limit to 3 key warnings
    
    def _fallback_provider_content(self, drug_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate fallback provider content when AI fails."""
        return {
            "simplified_indications": self._simplify_indications(drug_data),
            "usage_instructions": self._create_usage_instructions(drug_data),
            "key_warnings": self._extract_key_warnings(drug_data),
            "readability_score": 50.0,  # Neutral score
            "clinical_pearls": [
                "Review complete prescribing information before prescribing",
                "Monitor patient response and adjust as clinically indicated"
            ],
            "patient_counseling_points": [
                "Take as directed by healthcare provider",
                "Report any unusual side effects",
                "Complete full course of therapy as prescribed"
            ]
        }