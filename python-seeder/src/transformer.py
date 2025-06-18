"""
Data transformer for cleaning and normalizing FDA drug label data.
Handles HTML cleaning, text extraction, and data mapping to database schema.
"""

import re
from typing import Dict, Any, Optional, List
from bs4 import BeautifulSoup
from dataclasses import dataclass


@dataclass
class DrugRecord:
    """Structured drug record ready for database insertion."""
    # Drug table fields
    name: str
    generic_name: Optional[str]
    brand_name: Optional[str]
    manufacturer: str
    dosage_form: str
    strength: str
    route: str
    ndc: Optional[str]
    fda_application_number: Optional[str]
    approval_date: Optional[str]
    
    # DrugLabel table fields
    indications: str
    contraindications: Optional[str]
    warnings: Optional[str]
    precautions: Optional[str]
    adverse_reactions: Optional[str]
    dosage_and_administration: Optional[str]
    how_supplied: Optional[str]
    clinical_pharmacology: Optional[str]
    mechanism_of_action: Optional[str]
    pharmacokinetics: Optional[str]
    
    # Original identifiers for deduplication
    set_id: Optional[str]
    slug: Optional[str]


class DrugDataTransformer:
    """Transform raw FDA drug label JSON data to structured database records."""
    
    def __init__(self):
        self.html_parser = "lxml"
        self.data_quality_issues = []
        
        # Default values for required fields
        self.defaults = {
            'dosage_form': 'Unknown',
            'strength': 'Not specified',
            'route': 'Unknown',
            'manufacturer': 'Unknown Manufacturer',
            'indications': 'Not available'
        }
    
    def transform(self, raw_drug_data: Dict[str, Any]) -> Optional[DrugRecord]:
        """
        Transform raw drug data to structured DrugRecord with graceful error handling.
        
        Args:
            raw_drug_data: Raw drug data from JSON
            
        Returns:
            DrugRecord if transformation successful, None if critical data is missing
        """
        if not isinstance(raw_drug_data, dict):
            self._log_quality_issue("Invalid data type", "Expected dict, got " + str(type(raw_drug_data)))
            return None
            
        try:
            # Reset quality issues for this record
            self.data_quality_issues = []
            
            label = raw_drug_data.get('label', {})
            if not label:
                self._log_quality_issue("Missing label", "Drug has no label data")
            
            # Extract and validate basic drug information
            drug_name = self._safe_extract_drug_name(raw_drug_data)
            if not drug_name:
                self._log_quality_issue("Missing drug name", "Cannot process drug without name")
                return None
            
            # Extract manufacturer with fallback
            manufacturer = self._safe_extract_manufacturer(raw_drug_data)
            
            # Extract other fields with graceful handling
            generic_name = self._extract_generic_name(label)
            brand_name = self._extract_brand_name(drug_name, label)
            dosage_form = self._extract_dosage_form(label)
            strength = self._extract_strength(label)
            route = self._extract_route(label)
            ndc = self._extract_ndc(label)
            approval_date = self._extract_approval_date(label)
            
            # Extract label content with fallbacks
            indications = self._safe_extract_indications(label)
            contraindications = self._clean_html_content(label.get('contraindications'))
            warnings = self._clean_html_content(label.get('warningsAndPrecautions'))
            adverse_reactions = self._clean_html_content(label.get('adverseReactions'))
            dosage_and_administration = self._clean_html_content(label.get('dosageAndAdministration'))
            how_supplied = self._clean_html_content(label.get('howSupplied'))
            clinical_pharmacology = self._clean_html_content(label.get('clinicalPharmacology'))
            mechanism_of_action = self._extract_mechanism_of_action(label)
            pharmacokinetics = self._extract_pharmacokinetics(label)
            
            # Log data quality issues
            if self.data_quality_issues:
                quality_summary = f"Drug '{drug_name}' has {len(self.data_quality_issues)} quality issues: " + \
                                "; ".join([f"{issue['type']}: {issue['description']}" for issue in self.data_quality_issues])
                print(f"⚠️  {quality_summary}")
            
            # Create record with validated data
            record = DrugRecord(
                # Drug table fields
                name=drug_name,
                generic_name=generic_name,
                brand_name=brand_name,
                manufacturer=manufacturer,
                dosage_form=dosage_form,
                strength=strength,
                route=route,
                ndc=ndc,
                fda_application_number=None,  # Not in current JSON structure
                approval_date=approval_date,
                
                # DrugLabel table fields
                indications=indications,
                contraindications=contraindications,
                warnings=warnings,
                precautions=None,  # Often combined with warnings
                adverse_reactions=adverse_reactions,
                dosage_and_administration=dosage_and_administration,
                how_supplied=how_supplied,
                clinical_pharmacology=clinical_pharmacology,
                mechanism_of_action=mechanism_of_action,
                pharmacokinetics=pharmacokinetics,
                
                # Identifiers for deduplication
                set_id=raw_drug_data.get('setId'),
                slug=raw_drug_data.get('slug')
            )
            
            return record
            
        except Exception as e:
            print(f"❌ Error transforming drug data: {e}")
            if 'drug_name' in locals():
                print(f"   Drug: {drug_name}")
            return None
    
    def _log_quality_issue(self, issue_type: str, description: str):
        """Log a data quality issue for the current record."""
        self.data_quality_issues.append({
            'type': issue_type,
            'description': description
        })
    
    def _safe_extract_drug_name(self, raw_drug_data: Dict[str, Any]) -> Optional[str]:
        """Safely extract drug name with multiple fallback strategies."""
        # Try primary drugName field
        drug_name = self._clean_text(raw_drug_data.get('drugName'))
        if drug_name:
            return drug_name
        
        # Try alternative fields
        alternatives = ['name', 'productName', 'brandName']
        for alt_field in alternatives:
            alt_name = self._clean_text(raw_drug_data.get(alt_field))
            if alt_name:
                self._log_quality_issue("Alternative name source", f"Used {alt_field} instead of drugName")
                return alt_name
        
        # Try label title
        label = raw_drug_data.get('label', {})
        title = self._clean_text(label.get('title'))
        if title:
            self._log_quality_issue("Label title used", "Used label title as drug name")
            return title
        
        return None
    
    def _safe_extract_manufacturer(self, raw_drug_data: Dict[str, Any]) -> str:
        """Safely extract manufacturer with fallback."""
        # Try primary labeler field
        manufacturer = self._clean_text(raw_drug_data.get('labeler'))
        if manufacturer:
            return manufacturer
        
        # Try alternative fields
        alternatives = ['manufacturer', 'company', 'sponsor']
        for alt_field in alternatives:
            alt_manufacturer = self._clean_text(raw_drug_data.get(alt_field))
            if alt_manufacturer:
                self._log_quality_issue("Alternative manufacturer source", f"Used {alt_field} instead of labeler")
                return alt_manufacturer
        
        # Try label labelerName
        label = raw_drug_data.get('label', {})
        labeler_name = self._clean_text(label.get('labelerName'))
        if labeler_name:
            self._log_quality_issue("Label labeler used", "Used label labelerName as manufacturer")
            return labeler_name
        
        # Use default
        self._log_quality_issue("Missing manufacturer", "Using default manufacturer")
        return self.defaults['manufacturer']
    
    def _safe_extract_indications(self, label: Dict[str, Any]) -> str:
        """Safely extract indications with fallback."""
        # Try primary field
        indications = self._clean_html_content(label.get('indicationsAndUsage'))
        if indications:
            return indications
        
        # Try alternative fields
        alternatives = ['indications', 'usage', 'indication']
        for alt_field in alternatives:
            alt_indications = self._clean_html_content(label.get(alt_field))
            if alt_indications:
                self._log_quality_issue("Alternative indications source", f"Used {alt_field} instead of indicationsAndUsage")
                return alt_indications
        
        # Use default
        self._log_quality_issue("Missing indications", "Using default indications")
        return self.defaults['indications']
    
    def _clean_html_content(self, html_content: Optional[str]) -> Optional[str]:
        """
        Clean HTML content and extract readable text.
        
        Args:
            html_content: Raw HTML string
            
        Returns:
            Clean text content or None if empty
        """
        if not html_content:
            return None
        
        try:
            # Parse HTML and extract text
            soup = BeautifulSoup(html_content, self.html_parser)
            
            # Remove script and style elements
            for script in soup(["script", "style"]):
                script.decompose()
            
            # Get text and clean whitespace
            text = soup.get_text()
            text = re.sub(r'\s+', ' ', text).strip()
            
            return text if text else None
            
        except Exception as e:
            print(f"Error cleaning HTML content: {e}")
            return self._clean_text(html_content)
    
    def _clean_text(self, text: Optional[str]) -> Optional[str]:
        """Clean and normalize text content."""
        if not text:
            return None
        
        # Remove extra whitespace and normalize
        cleaned = re.sub(r'\s+', ' ', str(text)).strip()
        return cleaned if cleaned else None
    
    def _extract_generic_name(self, label: Dict[str, Any]) -> Optional[str]:
        """Extract generic name from label."""
        generic_name = label.get('genericName')
        if generic_name:
            return self._clean_text(generic_name)
        
        # Sometimes in the title or other fields
        title = label.get('title', '')
        if 'generic' in title.lower():
            # Try to extract from title
            parts = title.split('(')
            if len(parts) > 1:
                return self._clean_text(parts[1].rstrip(')'))
        
        return None
    
    def _extract_brand_name(self, drug_name: str, label: Dict[str, Any]) -> Optional[str]:
        """Extract brand name, often the main drug name."""
        title = label.get('title', '')
        if title and title.upper() != drug_name.upper():
            return self._clean_text(title)
        return self._clean_text(drug_name)
    
    def _extract_dosage_form(self, label: Dict[str, Any]) -> str:
        """Extract dosage form from label data with fallbacks."""
        # Look in dosage forms and strengths section
        forms_section = label.get('dosageFormsAndStrengths', '')
        if forms_section:
            forms_text = self._clean_html_content(forms_section) or ''
            
            common_forms = [
                'tablet', 'capsule', 'injection', 'solution', 'suspension',
                'cream', 'ointment', 'gel', 'patch', 'spray', 'inhaler',
                'syrup', 'powder', 'granules', 'suppository', 'drops',
                'lotion', 'foam', 'film', 'strip', 'pellet'
            ]
            
            for form in common_forms:
                if form in forms_text.lower():
                    return form.title()
        
        # Try alternative fields
        alternative_fields = ['dosageForm', 'formulation', 'productType']
        for field in alternative_fields:
            field_value = label.get(field, '')
            if field_value:
                field_text = self._clean_html_content(field_value) or field_value
                if 'injection' in field_text.lower():
                    return 'Injection'
                if 'tablet' in field_text.lower():
                    return 'Tablet'
                if 'capsule' in field_text.lower():
                    return 'Capsule'
        
        # Log missing dosage form
        self._log_quality_issue("Missing dosage form", "Using default dosage form")
        return self.defaults['dosage_form']
    
    def _extract_strength(self, label: Dict[str, Any]) -> str:
        """Extract strength information with fallbacks."""
        # Try primary dosage forms and strengths section
        forms_section = label.get('dosageFormsAndStrengths', '')
        if forms_section:
            strength_text = self._clean_html_content(forms_section) or ''
            strength = self._parse_strength_from_text(strength_text)
            if strength:
                return strength
        
        # Try alternative fields
        alternative_fields = ['strength', 'activeIngredient', 'concentration']
        for field in alternative_fields:
            field_value = label.get(field, '')
            if field_value:
                field_text = self._clean_html_content(field_value) or field_value
                strength = self._parse_strength_from_text(field_text)
                if strength:
                    self._log_quality_issue("Alternative strength source", f"Used {field} for strength")
                    return strength
        
        # Log missing strength
        self._log_quality_issue("Missing strength", "Using default strength")
        return self.defaults['strength']
    
    def _parse_strength_from_text(self, text: str) -> Optional[str]:
        """Parse strength from text using regex patterns."""
        if not text:
            return None
            
        # Look for strength patterns like "120 mg/mL", "100 mg", "5%", etc.
        strength_patterns = [
            r'(\d+(?:\.\d+)?\s*(?:mg|g|mcg|μg|units?|iu|%)\s*(?:/\s*\d+(?:\.\d+)?\s*(?:mg|g|mcg|μg|mL|tablet|capsule))?)',
            r'(\d+(?:\.\d+)?\s*(?:mg|g|mcg|μg|units?|iu)\s*per\s*\d+(?:\.\d+)?\s*(?:mL|tablet|capsule))',
            r'(\d+(?:\.\d+)?\s*%)',
        ]
        
        for pattern in strength_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                return matches[0]
        
        return None
    
    def _extract_route(self, label: Dict[str, Any]) -> str:
        """Extract route of administration with fallbacks."""
        # Try dosage and administration section
        dosage_section = label.get('dosageAndAdministration', '')
        if dosage_section:
            route_text = self._clean_html_content(dosage_section) or ''
            route = self._parse_route_from_text(route_text)
            if route:
                return route
        
        # Try alternative fields
        alternative_fields = ['route', 'administration', 'productType']
        for field in alternative_fields:
            field_value = label.get(field, '')
            if field_value:
                field_text = self._clean_html_content(field_value) or field_value
                route = self._parse_route_from_text(field_text)
                if route:
                    self._log_quality_issue("Alternative route source", f"Used {field} for route")
                    return route
        
        # Log missing route
        self._log_quality_issue("Missing route", "Using default route")
        return self.defaults['route']
    
    def _parse_route_from_text(self, text: str) -> Optional[str]:
        """Parse route of administration from text."""
        if not text:
            return None
            
        text_lower = text.lower()
        
        routes = [
            ('subcutaneous', 'Subcutaneous'),
            ('intravenous', 'Intravenous'),
            ('intramuscular', 'Intramuscular'),
            ('injection', 'Injection'),
            ('oral', 'Oral'),
            ('topical', 'Topical'),
            ('inhalation', 'Inhalation'),
            ('inhaled', 'Inhalation'),
            ('rectal', 'Rectal'),
            ('ophthalmic', 'Ophthalmic'),
            ('nasal', 'Nasal'),
            ('transdermal', 'Transdermal'),
            ('sublingual', 'Sublingual'),
            ('buccal', 'Buccal')
        ]
        
        for route_key, route_name in routes:
            if route_key in text_lower:
                return route_name
        
        return None
    
    def _extract_ndc(self, label: Dict[str, Any]) -> Optional[str]:
        """Extract NDC number from label."""
        # Look in how supplied section
        how_supplied = label.get('howSupplied', '')
        if how_supplied:
            text = self._clean_html_content(how_supplied) or ''
            
            # NDC pattern: typically 4-4-2 or 5-3-2 digits
            ndc_pattern = r'NDC\s*:?\s*(\d{4,5}-\d{3,4}-\d{2})'
            match = re.search(ndc_pattern, text, re.IGNORECASE)
            
            if match:
                return match.group(1)
        
        return None
    
    def _extract_approval_date(self, label: Dict[str, Any]) -> Optional[str]:
        """Extract FDA approval date."""
        effective_time = label.get('effectiveTime')
        if effective_time and len(str(effective_time)) == 8:
            # Format: YYYYMMDD
            date_str = str(effective_time)
            try:
                # Convert to YYYY-MM-DD format
                return f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}"
            except:
                pass
        
        return None
    
    def _extract_mechanism_of_action(self, label: Dict[str, Any]) -> Optional[str]:
        """Extract mechanism of action from clinical pharmacology."""
        clinical_pharm = label.get('clinicalPharmacology', '')
        if clinical_pharm:
            text = self._clean_html_content(clinical_pharm) or ''
            
            # Look for mechanism of action section
            lines = text.split('\n')
            in_mechanism_section = False
            mechanism_lines = []
            
            for line in lines:
                if 'mechanism of action' in line.lower():
                    in_mechanism_section = True
                    continue
                elif in_mechanism_section:
                    if any(keyword in line.lower() for keyword in ['pharmacodynamics', 'pharmacokinetics', 'absorption']):
                        break
                    if line.strip():
                        mechanism_lines.append(line.strip())
            
            if mechanism_lines:
                return ' '.join(mechanism_lines)
        
        return None
    
    def _extract_pharmacokinetics(self, label: Dict[str, Any]) -> Optional[str]:
        """Extract pharmacokinetics information."""
        clinical_pharm = label.get('clinicalPharmacology', '')
        if clinical_pharm:
            text = self._clean_html_content(clinical_pharm) or ''
            
            # Look for pharmacokinetics section
            lines = text.split('\n')
            in_pk_section = False
            pk_lines = []
            
            for line in lines:
                if 'pharmacokinetics' in line.lower():
                    in_pk_section = True
                    continue
                elif in_pk_section:
                    if any(keyword in line.lower() for keyword in ['clinical studies', 'drug interactions', 'mechanism']):
                        break
                    if line.strip():
                        pk_lines.append(line.strip())
            
            if pk_lines:
                return ' '.join(pk_lines)
        
        return None


if __name__ == "__main__":
    # Test the transformer
    test_data = {
        "drugName": "Emgality",
        "setId": "33a147be-233a-40e8-a55e-e40936e28db0",
        "slug": "emgality-33a147b",
        "labeler": "Eli Lilly and Company",
        "label": {
            "genericName": "galcanezumab-gnlm",
            "title": "EMGALITY",
            "indicationsAndUsage": "<p>EMGALITY is indicated for the preventive treatment of migraine in adults.</p>",
            "dosageFormsAndStrengths": "<p>Injection: 120 mg/mL in a single-dose prefilled pen</p>"
        }
    }
    
    transformer = DrugDataTransformer()
    record = transformer.transform(test_data)
    
    if record:
        print(f"Transformed drug: {record.name}")
        print(f"Generic: {record.generic_name}")
        print(f"Manufacturer: {record.manufacturer}")
        print(f"Dosage form: {record.dosage_form}")
        print(f"Strength: {record.strength}")
        print("Transformation successful!")
    else:
        print("Transformation failed!")