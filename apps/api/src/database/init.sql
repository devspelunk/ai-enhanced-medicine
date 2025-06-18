-- PostgreSQL Database Initialization Script
-- Drug Information Publishing Platform

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create database if it doesn't exist (run manually if needed)
-- CREATE DATABASE prescribe_point;

-- Create drugs table with updated schema for label-schema.json
CREATE TABLE IF NOT EXISTS drugs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    drug_name VARCHAR(255) NOT NULL,
    set_id VARCHAR(255) UNIQUE NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    labeler VARCHAR(255) NOT NULL,
    
    -- Legacy fields for backward compatibility (can be removed after migration)
    name VARCHAR(255),
    generic_name VARCHAR(255),
    brand_name VARCHAR(255),
    manufacturer VARCHAR(255),
    dosage_form VARCHAR(255),
    strength VARCHAR(255),
    route VARCHAR(255),
    ndc VARCHAR(255) UNIQUE,
    fda_application_number VARCHAR(255),
    approval_date DATE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create drug_labels table with comprehensive FDA label fields
CREATE TABLE IF NOT EXISTS drug_labels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    drug_id UUID NOT NULL REFERENCES drugs(id) ON DELETE CASCADE,
    
    -- Core FDA label fields from label-schema.json
    generic_name VARCHAR(255),
    labeler_name VARCHAR(255),
    product_type VARCHAR(255),
    effective_time VARCHAR(50),
    title VARCHAR(255),
    
    -- Main content sections (TEXT for large HTML content)
    indications_and_usage TEXT,
    dosage_and_administration TEXT,
    dosage_forms_and_strengths TEXT,
    contraindications TEXT,
    warnings_and_precautions TEXT,
    adverse_reactions TEXT,
    clinical_pharmacology TEXT,
    clinical_studies TEXT,
    how_supplied TEXT,
    use_in_specific_populations TEXT,
    description TEXT,
    nonclinical_toxicology TEXT,
    instructions_for_use TEXT,
    mechanism_of_action TEXT,
    highlights TEXT,
    
    -- Legacy fields for backward compatibility
    indications TEXT,
    warnings TEXT,
    precautions TEXT,
    pharmacokinetics TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one label per drug
    UNIQUE(drug_id)
);

-- Create ai_enhanced_content table for SEO and AI-generated content
CREATE TABLE IF NOT EXISTS ai_enhanced_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    drug_id UUID NOT NULL REFERENCES drugs(id) ON DELETE CASCADE,
    
    -- SEO fields
    seo_title VARCHAR(70) NOT NULL,
    meta_description VARCHAR(160) NOT NULL,
    
    -- Enhanced content fields
    enhanced_indications TEXT,
    patient_friendly_description TEXT,
    provider_friendly_explanation TEXT,
    
    -- Related data as arrays
    related_conditions TEXT[] DEFAULT '{}',
    related_drugs TEXT[] DEFAULT '{}',
    
    -- Structured JSON data
    faqs JSONB,
    structured_data JSONB,
    
    -- Content metadata
    content_score INTEGER DEFAULT 0,
    last_enhanced TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one AI content per drug
    UNIQUE(drug_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_drugs_drug_name ON drugs(drug_name);
CREATE INDEX IF NOT EXISTS idx_drugs_set_id ON drugs(set_id);
CREATE INDEX IF NOT EXISTS idx_drugs_slug ON drugs(slug);
CREATE INDEX IF NOT EXISTS idx_drugs_labeler ON drugs(labeler);
CREATE INDEX IF NOT EXISTS idx_drugs_generic_name ON drugs(generic_name);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_drugs_name_gin ON drugs USING gin(drug_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_drugs_labeler_gin ON drugs USING gin(labeler gin_trgm_ops);

-- Drug labels indexes
CREATE INDEX IF NOT EXISTS idx_drug_labels_drug_id ON drug_labels(drug_id);
CREATE INDEX IF NOT EXISTS idx_drug_labels_generic_name ON drug_labels(generic_name);
CREATE INDEX IF NOT EXISTS idx_drug_labels_product_type ON drug_labels(product_type);

-- Full-text search on drug label content
CREATE INDEX IF NOT EXISTS idx_drug_labels_indications_gin ON drug_labels USING gin(to_tsvector('english', COALESCE(indications_and_usage, '')));
CREATE INDEX IF NOT EXISTS idx_drug_labels_content_gin ON drug_labels USING gin(
    to_tsvector('english', 
        COALESCE(indications_and_usage, '') || ' ' ||
        COALESCE(dosage_and_administration, '') || ' ' ||
        COALESCE(contraindications, '') || ' ' ||
        COALESCE(warnings_and_precautions, '')
    )
);

-- AI content indexes
CREATE INDEX IF NOT EXISTS idx_ai_content_drug_id ON ai_enhanced_content(drug_id);
CREATE INDEX IF NOT EXISTS idx_ai_content_score ON ai_enhanced_content(content_score);
CREATE INDEX IF NOT EXISTS idx_ai_content_last_enhanced ON ai_enhanced_content(last_enhanced);

-- JSONB indexes for FAQ and structured data search
CREATE INDEX IF NOT EXISTS idx_ai_content_faqs_gin ON ai_enhanced_content USING gin(faqs);
CREATE INDEX IF NOT EXISTS idx_ai_content_structured_data_gin ON ai_enhanced_content USING gin(structured_data);

-- Array search indexes for MCP server tools
CREATE INDEX IF NOT EXISTS idx_ai_content_related_conditions_gin ON ai_enhanced_content USING gin(related_conditions);
CREATE INDEX IF NOT EXISTS idx_ai_content_related_drugs_gin ON ai_enhanced_content USING gin(related_drugs);

-- Full-text search indexes for AI enhanced content fields used by MCP server
CREATE INDEX IF NOT EXISTS idx_ai_content_patient_friendly_gin ON ai_enhanced_content USING gin(to_tsvector('english', COALESCE(patient_friendly_description, '')));
CREATE INDEX IF NOT EXISTS idx_ai_content_provider_friendly_gin ON ai_enhanced_content USING gin(to_tsvector('english', COALESCE(provider_friendly_explanation, '')));

-- Update triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers to all tables
CREATE TRIGGER update_drugs_updated_at BEFORE UPDATE ON drugs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drug_labels_updated_at BEFORE UPDATE ON drug_labels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_enhanced_content_updated_at BEFORE UPDATE ON ai_enhanced_content
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create a view for complete drug information (useful for APIs)
CREATE OR REPLACE VIEW complete_drug_info AS
SELECT 
    d.id,
    d.drug_name,
    d.set_id,
    d.slug,
    d.labeler,
    d.created_at,
    d.updated_at,
    
    -- Label information
    dl.generic_name,
    dl.labeler_name,
    dl.product_type,
    dl.effective_time,
    dl.title,
    dl.indications_and_usage,
    dl.dosage_and_administration,
    dl.dosage_forms_and_strengths,
    dl.contraindications,
    dl.warnings_and_precautions,
    dl.adverse_reactions,
    dl.clinical_pharmacology,
    dl.mechanism_of_action,
    
    -- AI enhanced content
    ai.seo_title,
    ai.meta_description,
    ai.enhanced_indications,
    ai.patient_friendly_description,
    ai.provider_friendly_explanation,
    ai.related_conditions,
    ai.related_drugs,
    ai.faqs,
    ai.structured_data,
    ai.content_score,
    ai.last_enhanced
    
FROM drugs d
LEFT JOIN drug_labels dl ON d.id = dl.drug_id
LEFT JOIN ai_enhanced_content ai ON d.id = ai.drug_id;

-- Create a function for full-text search across drugs and labels
CREATE OR REPLACE FUNCTION search_drugs(search_term TEXT)
RETURNS TABLE(
    drug_id UUID,
    drug_name VARCHAR,
    generic_name VARCHAR,
    labeler VARCHAR,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.drug_name,
        dl.generic_name,
        d.labeler,
        GREATEST(
            ts_rank_cd(to_tsvector('english', d.drug_name), plainto_tsquery('english', search_term)),
            ts_rank_cd(to_tsvector('english', COALESCE(dl.generic_name, '')), plainto_tsquery('english', search_term)),
            ts_rank_cd(to_tsvector('english', d.labeler), plainto_tsquery('english', search_term)),
            ts_rank_cd(to_tsvector('english', COALESCE(dl.indications_and_usage, '')), plainto_tsquery('english', search_term))
        ) as rank
    FROM drugs d
    LEFT JOIN drug_labels dl ON d.id = dl.drug_id
    WHERE 
        to_tsvector('english', d.drug_name) @@ plainto_tsquery('english', search_term)
        OR to_tsvector('english', COALESCE(dl.generic_name, '')) @@ plainto_tsquery('english', search_term)
        OR to_tsvector('english', d.labeler) @@ plainto_tsquery('english', search_term)
        OR to_tsvector('english', COALESCE(dl.indications_and_usage, '')) @@ plainto_tsquery('english', search_term)
    ORDER BY rank DESC;
END;
$$ LANGUAGE plpgsql;

-- Insert some initial configuration data if needed
INSERT INTO drugs (drug_name, set_id, slug, labeler) VALUES
('Sample Drug', 'sample-001', 'sample-drug-001', 'Sample Pharmaceuticals')
ON CONFLICT (set_id) DO NOTHING;

-- Grant permissions (adjust as needed for your environment)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO your_app_user;

-- Database initialization completed
SELECT 'Database initialization completed successfully!' as status;