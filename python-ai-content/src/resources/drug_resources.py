"""
Drug resources for MCP server - provides data access endpoints.
"""

import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)


class DrugResources:
    """Provides drug data access resources for the MCP server."""
    
    def __init__(self, db_manager):
        self.db_manager = db_manager
    
    async def get_drug_by_id(self, drug_id: str) -> Dict[str, Any]:
        """Get complete drug information by ID."""
        
        try:
            drug_data = await self.db_manager.get_drug_by_id(drug_id)
            
            if not drug_data:
                return {
                    "error": f"Drug with ID '{drug_id}' not found",
                    "drug_id": drug_id
                }
            
            # Enhance the data with additional formatting
            return self._format_drug_data(drug_data)
            
        except Exception as e:
            logger.error(f"Error retrieving drug {drug_id}: {e}")
            return {
                "error": f"Database error retrieving drug: {str(e)}",
                "drug_id": drug_id
            }
    
    async def search_drugs(
        self,
        query: str = "",
        indication: str = "",
        manufacturer: str = "",
        limit: int = 10
    ) -> Dict[str, Any]:
        """Search drugs by various criteria."""
        
        try:
            drugs = await self.db_manager.search_drugs(
                query=query,
                indication=indication,
                manufacturer=manufacturer,
                limit=limit
            )
            
            return {
                "results": [self._format_drug_summary(drug) for drug in drugs],
                "total_found": len(drugs),
                "search_params": {
                    "query": query,
                    "indication": indication,
                    "manufacturer": manufacturer,
                    "limit": limit
                }
            }
            
        except Exception as e:
            logger.error(f"Error searching drugs: {e}")
            return {
                "error": f"Search error: {str(e)}",
                "results": [],
                "total_found": 0
            }
    
    async def get_drug_label(self, drug_id: str) -> Dict[str, Any]:
        """Get FDA label data for a specific drug."""
        
        try:
            drug_data = await self.db_manager.get_drug_by_id(drug_id)
            
            if not drug_data:
                return {
                    "error": f"Drug with ID '{drug_id}' not found",
                    "drug_id": drug_id
                }
            
            # Extract just the label information
            label_data = {
                "drug_id": drug_id,
                "drug_name": drug_data.get('drug_name'),
                "generic_name": drug_data.get('generic_name'),
                "indications_and_usage": drug_data.get('indications_and_usage'),
                "dosage_and_administration": drug_data.get('dosage_and_administration'),
                "warnings_and_precautions": drug_data.get('warnings_and_precautions'),
                "adverse_reactions": drug_data.get('adverse_reactions'),
                "contraindications": drug_data.get('contraindications'),
                "clinical_pharmacology": drug_data.get('clinical_pharmacology'),
                "mechanism_of_action": drug_data.get('mechanism_of_action'),
                "pharmacokinetics": drug_data.get('pharmacokinetics'),
                "how_supplied": drug_data.get('how_supplied')
            }
            
            # Add summary statistics
            label_data["label_completeness"] = self._calculate_label_completeness(label_data)
            
            return label_data
            
        except Exception as e:
            logger.error(f"Error retrieving label for drug {drug_id}: {e}")
            return {
                "error": f"Database error retrieving label: {str(e)}",
                "drug_id": drug_id
            }
    
    async def get_database_statistics(self) -> Dict[str, Any]:
        """Get database statistics for monitoring."""
        
        try:
            stats = await self.db_manager.get_database_stats()
            return {
                "status": "success",
                "statistics": stats
            }
        except Exception as e:
            logger.error(f"Error getting database statistics: {e}")
            return {
                "status": "error",
                "error": str(e)
            }
    
    def _format_drug_data(self, drug_data: Dict[str, Any]) -> Dict[str, Any]:
        """Format drug data for consistent API responses."""
        
        formatted = {
            # Basic drug information
            "id": drug_data.get('id'),
            "drug_name": drug_data.get('drug_name'),
            "generic_name": drug_data.get('generic_name'),
            "brand_name": drug_data.get('brand_name'),
            "manufacturer": drug_data.get('manufacturer'),
            "labeler": drug_data.get('labeler'),
            
            # Pharmaceutical details
            "dosage_form": drug_data.get('dosage_form'),
            "strength": drug_data.get('strength'),
            "route": drug_data.get('route'),
            "ndc": drug_data.get('ndc'),
            
            # Regulatory information
            "set_id": drug_data.get('set_id'),
            "fda_application_number": drug_data.get('fda_application_number'),
            "approval_date": drug_data.get('approval_date'),
            
            # Label information
            "indications_and_usage": drug_data.get('indications_and_usage'),
            "dosage_and_administration": drug_data.get('dosage_and_administration'),
            "warnings_and_precautions": drug_data.get('warnings_and_precautions'),
            "adverse_reactions": drug_data.get('adverse_reactions'),
            "contraindications": drug_data.get('contraindications'),
            "clinical_pharmacology": drug_data.get('clinical_pharmacology'),
            "mechanism_of_action": drug_data.get('mechanism_of_action'),
            "pharmacokinetics": drug_data.get('pharmacokinetics'),
            "how_supplied": drug_data.get('how_supplied'),
            
            # Metadata
            "created_at": drug_data.get('created_at'),
            "updated_at": drug_data.get('updated_at'),
            "slug": drug_data.get('slug')
        }
        
        # Add data quality metrics
        formatted["data_quality"] = self._assess_data_quality(formatted)
        
        return formatted
    
    def _format_drug_summary(self, drug_data: Dict[str, Any]) -> Dict[str, Any]:
        """Format drug data for search result summaries."""
        
        return {
            "id": drug_data.get('id'),
            "drug_name": drug_data.get('drug_name'),
            "generic_name": drug_data.get('generic_name'),
            "manufacturer": drug_data.get('manufacturer'),
            "dosage_form": drug_data.get('dosage_form'),
            "strength": drug_data.get('strength'),
            "route": drug_data.get('route'),
            "indications_summary": self._create_indication_summary(
                drug_data.get('indications_and_usage', '')
            ),
            "slug": drug_data.get('slug')
        }
    
    def _create_indication_summary(self, indications: str) -> str:
        """Create a brief summary of indications."""
        
        if not indications:
            return "Indications not specified"
        
        # Take first sentence or first 150 characters
        sentences = indications.split('. ')
        if sentences and len(sentences[0]) <= 150:
            return sentences[0] + "."
        
        if len(indications) <= 150:
            return indications
        
        return indications[:147] + "..."
    
    def _assess_data_quality(self, drug_data: Dict[str, Any]) -> Dict[str, Any]:
        """Assess the completeness and quality of drug data."""
        
        essential_fields = [
            'drug_name', 'generic_name', 'manufacturer', 'dosage_form',
            'indications_and_usage', 'dosage_and_administration'
        ]
        
        important_fields = [
            'warnings_and_precautions', 'adverse_reactions', 'contraindications',
            'clinical_pharmacology', 'mechanism_of_action'
        ]
        
        optional_fields = [
            'pharmacokinetics', 'how_supplied', 'brand_name', 'strength', 'route'
        ]
        
        essential_complete = sum(1 for field in essential_fields if drug_data.get(field))
        important_complete = sum(1 for field in important_fields if drug_data.get(field))
        optional_complete = sum(1 for field in optional_fields if drug_data.get(field))
        
        total_fields = len(essential_fields) + len(important_fields) + len(optional_fields)
        total_complete = essential_complete + important_complete + optional_complete
        
        return {
            "essential_completeness": round(essential_complete / len(essential_fields) * 100, 1),
            "important_completeness": round(important_complete / len(important_fields) * 100, 1),
            "optional_completeness": round(optional_complete / len(optional_fields) * 100, 1),
            "overall_completeness": round(total_complete / total_fields * 100, 1),
            "quality_score": self._calculate_quality_score(drug_data)
        }
    
    def _calculate_quality_score(self, drug_data: Dict[str, Any]) -> str:
        """Calculate an overall quality score for the drug data."""
        
        # Check for essential information
        has_name = bool(drug_data.get('drug_name'))
        has_generic = bool(drug_data.get('generic_name'))
        has_manufacturer = bool(drug_data.get('manufacturer'))
        has_indications = bool(drug_data.get('indications_and_usage'))
        has_dosage = bool(drug_data.get('dosage_and_administration'))
        
        essential_score = sum([has_name, has_generic, has_manufacturer, has_indications, has_dosage])
        
        # Check for additional clinical information
        has_warnings = bool(drug_data.get('warnings_and_precautions'))
        has_adverse = bool(drug_data.get('adverse_reactions'))
        has_contraindications = bool(drug_data.get('contraindications'))
        has_pharmacology = bool(drug_data.get('clinical_pharmacology'))
        
        clinical_score = sum([has_warnings, has_adverse, has_contraindications, has_pharmacology])
        
        total_score = essential_score + clinical_score
        
        if total_score >= 8:
            return "excellent"
        elif total_score >= 6:
            return "good"
        elif total_score >= 4:
            return "fair"
        else:
            return "poor"
    
    def _calculate_label_completeness(self, label_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate completeness metrics for FDA label data."""
        
        label_sections = [
            'indications_and_usage', 'dosage_and_administration', 
            'warnings_and_precautions', 'adverse_reactions', 
            'contraindications', 'clinical_pharmacology',
            'mechanism_of_action', 'pharmacokinetics', 'how_supplied'
        ]
        
        completed_sections = sum(1 for section in label_sections if label_data.get(section))
        completeness_percentage = round(completed_sections / len(label_sections) * 100, 1)
        
        return {
            "completed_sections": completed_sections,
            "total_sections": len(label_sections),
            "completeness_percentage": completeness_percentage,
            "missing_sections": [
                section for section in label_sections 
                if not label_data.get(section)
            ]
        }