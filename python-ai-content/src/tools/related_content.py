"""
Related content engine for finding similar drugs and related information.
"""

import logging
from typing import Dict, Any, List, Optional
import re

logger = logging.getLogger(__name__)


class RelatedContentEngine:
    """Finds related drugs, conditions, and alternative treatments."""
    
    def __init__(self, db_manager):
        self.db_manager = db_manager
    
    async def find_related_content(
        self, 
        drug_data: Dict[str, Any], 
        relation_types: List[str] = ["similar_drugs", "related_conditions"]
    ) -> Dict[str, Any]:
        """Find related content based on drug information."""
        
        try:
            result = {
                "similar_drugs": [],
                "related_conditions": [],
                "alternative_treatments": []
            }
            
            drug_id = drug_data.get('id', '')
            
            if "similar_drugs" in relation_types:
                result["similar_drugs"] = await self._find_similar_drugs(drug_id, drug_data)
            
            if "related_conditions" in relation_types:
                result["related_conditions"] = self._extract_related_conditions(drug_data)
            
            if "alternative_treatments" in relation_types:
                result["alternative_treatments"] = await self._find_alternative_treatments(drug_id, drug_data)
            
            return result
            
        except Exception as e:
            logger.error(f"Error finding related content: {e}")
            return self._fallback_related_content(drug_data)
    
    async def _find_similar_drugs(self, drug_id: str, drug_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Find drugs similar by indication, mechanism, or manufacturer."""
        
        similar_drugs = []
        
        try:
            # Find by indication similarity
            indication_similar = await self.db_manager.get_similar_drugs(
                drug_id, 
                similarity_type="indication", 
                limit=3
            )
            
            # Find by same manufacturer
            manufacturer_similar = await self.db_manager.get_similar_drugs(
                drug_id, 
                similarity_type="manufacturer", 
                limit=2
            )
            
            # Combine and deduplicate
            all_similar = indication_similar + manufacturer_similar
            seen_ids = set()
            
            for drug in all_similar:
                if drug.get('id') not in seen_ids:
                    similar_drugs.append({
                        "id": drug.get('id'),
                        "name": drug.get('drug_name'),
                        "generic_name": drug.get('generic_name'),
                        "manufacturer": drug.get('manufacturer'),
                        "dosage_form": drug.get('dosage_form'),
                        "similarity_reason": self._determine_similarity_reason(drug, drug_data)
                    })
                    seen_ids.add(drug.get('id'))
            
            return similar_drugs[:5]  # Limit to 5 results
            
        except Exception as e:
            logger.error(f"Error finding similar drugs: {e}")
            return self._fallback_similar_drugs(drug_data)
    
    def _determine_similarity_reason(self, similar_drug: Dict[str, Any], original_drug: Dict[str, Any]) -> str:
        """Determine why drugs are considered similar."""
        
        if similar_drug.get('manufacturer') == original_drug.get('manufacturer'):
            return "Same manufacturer"
        
        if similar_drug.get('generic_name') and original_drug.get('generic_name'):
            if similar_drug['generic_name'].lower() in original_drug['generic_name'].lower():
                return "Similar active ingredient"
        
        if similar_drug.get('dosage_form') == original_drug.get('dosage_form'):
            return "Same dosage form"
        
        return "Similar indication"
    
    def _extract_related_conditions(self, drug_data: Dict[str, Any]) -> List[str]:
        """Extract related medical conditions from indications."""
        
        indications = drug_data.get('indications_and_usage', '')
        
        if not indications:
            return []
        
        # Common medical condition patterns
        condition_patterns = [
            r'treat(?:ment)?.*?(?:of|for)\s+([A-Za-z\s]+?)(?:in|with|\.|$)',
            r'indicat(?:ed|ion).*?(?:for|in)\s+([A-Za-z\s]+?)(?:in|with|\.|$)',
            r'(?:management|therapy).*?(?:of|for)\s+([A-Za-z\s]+?)(?:in|with|\.|$)',
            r'(\w+\s+(?:syndrome|disease|disorder|condition|infection))',
            r'(diabetes|hypertension|depression|anxiety|arthritis|cancer|asthma)',
        ]
        
        conditions = set()
        
        for pattern in condition_patterns:
            matches = re.finditer(pattern, indications, re.IGNORECASE)
            for match in matches:
                condition = match.group(1).strip()
                if len(condition) > 3 and len(condition) < 50:
                    # Clean up the condition name
                    condition = re.sub(r'\s+', ' ', condition)
                    condition = condition.title()
                    conditions.add(condition)
        
        # Add some common categories based on drug data
        if any(term in indications.lower() for term in ['pain', 'analgesic']):
            conditions.add('Pain Management')
        
        if any(term in indications.lower() for term in ['antibiotic', 'infection', 'bacterial']):
            conditions.add('Bacterial Infections')
        
        if any(term in indications.lower() for term in ['blood pressure', 'hypertension']):
            conditions.add('Hypertension')
        
        return list(conditions)[:8]  # Limit to 8 conditions
    
    async def _find_alternative_treatments(self, drug_id: str, drug_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Find alternative treatment options."""
        
        try:
            # Find drugs with similar indications but different mechanisms
            alternatives = []
            
            # Search for drugs treating similar conditions
            indications = drug_data.get('indications_and_usage', '')
            if indications:
                # Extract key terms from indications
                search_terms = self._extract_search_terms(indications)
                
                for term in search_terms[:3]:  # Limit search terms
                    similar_indication_drugs = await self.db_manager.search_drugs(
                        indication=term,
                        limit=3
                    )
                    
                    for drug in similar_indication_drugs:
                        if drug.get('id') != drug_id:  # Exclude the original drug
                            alternatives.append({
                                "id": drug.get('id'),
                                "name": drug.get('drug_name'),
                                "generic_name": drug.get('generic_name'),
                                "manufacturer": drug.get('manufacturer'),
                                "dosage_form": drug.get('dosage_form'),
                                "alternative_type": "Similar indication"
                            })
            
            # Deduplicate and limit results
            seen_ids = set()
            unique_alternatives = []
            
            for alt in alternatives:
                if alt.get('id') not in seen_ids:
                    unique_alternatives.append(alt)
                    seen_ids.add(alt.get('id'))
            
            return unique_alternatives[:4]  # Limit to 4 alternatives
            
        except Exception as e:
            logger.error(f"Error finding alternative treatments: {e}")
            return []
    
    def _extract_search_terms(self, indications: str) -> List[str]:
        """Extract key search terms from indications text."""
        
        # Common medical terms that are good for searching
        terms = []
        
        # Extract specific conditions
        condition_matches = re.finditer(
            r'(diabetes|hypertension|depression|anxiety|arthritis|cancer|asthma|infection|pain)',
            indications,
            re.IGNORECASE
        )
        
        for match in condition_matches:
            terms.append(match.group(1))
        
        # Extract treatment contexts
        treatment_matches = re.finditer(
            r'treat(?:ment)?\s+(?:of\s+)?(\w+)',
            indications,
            re.IGNORECASE
        )
        
        for match in treatment_matches:
            term = match.group(1)
            if len(term) > 4:  # Avoid very short terms
                terms.append(term)
        
        return list(set(terms))  # Remove duplicates
    
    def _fallback_similar_drugs(self, drug_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Fallback similar drugs when database query fails."""
        
        # Create generic similar drug entries
        drug_name = drug_data.get('drug_name', 'Unknown')
        manufacturer = drug_data.get('manufacturer', 'Unknown')
        
        return [
            {
                "id": "fallback-1",
                "name": f"Similar drug to {drug_name}",
                "generic_name": "Consult prescribing database",
                "manufacturer": manufacturer,
                "dosage_form": drug_data.get('dosage_form', ''),
                "similarity_reason": "Database query unavailable"
            }
        ]
    
    def _fallback_related_content(self, drug_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate fallback related content when queries fail."""
        
        return {
            "similar_drugs": self._fallback_similar_drugs(drug_data),
            "related_conditions": ["Consult medical references for related conditions"],
            "alternative_treatments": [
                {
                    "id": "fallback-alt-1",
                    "name": "Consult clinical guidelines",
                    "generic_name": "Alternative treatments available",
                    "manufacturer": "Various manufacturers",
                    "dosage_form": "Multiple forms",
                    "alternative_type": "Clinical consultation recommended"
                }
            ]
        }