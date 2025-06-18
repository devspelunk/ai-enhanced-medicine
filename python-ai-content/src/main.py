"""
MCP Server for AI-Powered Drug Content Generation

This server provides tools and resources for generating SEO-optimized content
from FDA drug label data using AI models.
"""

import asyncio
import logging
from typing import Dict, Any, List, Optional

try:
    from fastmcp import FastMCP  # type: ignore
except ImportError:
    FastMCP = None

from pydantic import BaseModel

from database.connection import DatabaseManager
from tools.seo_optimizer import SEOOptimizer
from tools.content_transformer import ContentTransformer
from tools.faq_generator import FAQGenerator
from tools.related_content import RelatedContentEngine
from resources.drug_resources import DrugResources

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastMCP server
if FastMCP is None:
    raise ImportError("FastMCP package not installed. Install with: pip install fastmcp")

mcp = FastMCP("Drug AI Content Server")

# Global components with proper typing
db_manager: Optional[DatabaseManager] = None
seo_optimizer: Optional[SEOOptimizer] = None
content_transformer: Optional[ContentTransformer] = None
faq_generator: Optional[FAQGenerator] = None
related_engine: Optional[RelatedContentEngine] = None
drug_resources: Optional[DrugResources] = None

# Pydantic models for request/response validation
class DrugContentRequest(BaseModel):
    drug_id: str
    content_type: str = "seo"

class SEOContentResponse(BaseModel):
    title: str
    meta_description: str
    keywords: List[str]
    structured_data: Dict[str, Any]

class ProviderContentResponse(BaseModel):
    simplified_indications: str
    usage_instructions: str
    key_warnings: List[str]
    readability_score: float

class FAQResponse(BaseModel):
    faqs: List[Dict[str, str]]
    categories: List[str]

class RelatedContentResponse(BaseModel):
    similar_drugs: List[Dict[str, Any]]
    related_conditions: List[str]
    alternative_treatments: List[Dict[str, Any]]


async def initialize_components():
    """Initialize all server components."""
    global db_manager, seo_optimizer, content_transformer, faq_generator, related_engine, drug_resources
    
    try:
        # Initialize database connection
        db_manager = DatabaseManager()
        await db_manager.connect()
        logger.info("✅ Database connection established")
        
        # Initialize AI-powered tools
        seo_optimizer = SEOOptimizer()
        content_transformer = ContentTransformer()
        faq_generator = FAQGenerator()
        related_engine = RelatedContentEngine(db_manager)
        
        # Initialize resources
        drug_resources = DrugResources(db_manager)
        
        logger.info("✅ All components initialized successfully")
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize components: {e}")
        raise


# MCP Resources - Data access endpoints
@mcp.resource("drugs/{drug_id}")
async def get_drug_info(drug_id: str) -> Dict[str, Any]:
    """Get complete drug information by ID."""
    if drug_resources is None:
        return {"error": "Drug resources not initialized"}
    try:
        return await drug_resources.get_drug_by_id(drug_id)
    except Exception as e:
        logger.error(f"Error fetching drug {drug_id}: {e}")
        return {"error": str(e)}

@mcp.resource("drugs/{drug_id}/label")
async def get_drug_label(drug_id: str) -> Dict[str, Any]:
    """Get FDA label data for a specific drug."""
    if drug_resources is None:
        return {"error": "Drug resources not initialized"}
    try:
        return await drug_resources.get_drug_label(drug_id)
    except Exception as e:
        logger.error(f"Error fetching label for drug {drug_id}: {e}")
        return {"error": str(e)}


# MCP Tools - AI-powered content generation
@mcp.tool()
async def search_drugs(
    query: str = "",
    indication: str = "",
    manufacturer: str = "",
    limit: int = 10
) -> Dict[str, Any]:
    """
    Search drugs by various criteria.
    
    Args:
        query: Search term for drug name or generic name
        indication: Filter by medical indication
        manufacturer: Filter by manufacturer
        limit: Maximum number of results to return
    
    Returns:
        Dictionary containing search results and metadata
    """
    if drug_resources is None:
        raise RuntimeError("Drug resources not initialized")
    
    try:
        return await drug_resources.search_drugs(
            query=query,
            indication=indication,
            manufacturer=manufacturer,
            limit=limit
        )
    except Exception as e:
        logger.error(f"Error searching drugs: {e}")
        raise

@mcp.tool()
async def generate_seo_content(
    drug_id: str,
    target_audience: str = "healthcare_providers"
) -> SEOContentResponse:
    """
    Generate SEO-optimized title, meta description, and keywords for a drug.
    
    Args:
        drug_id: The drug identifier
        target_audience: Target audience (healthcare_providers, patients, researchers)
    
    Returns:
        SEO-optimized content including title, meta description, keywords
    """
    if drug_resources is None or seo_optimizer is None:
        raise RuntimeError("Required components not initialized")
    
    try:
        # Get drug data
        drug_data = await drug_resources.get_drug_by_id(drug_id)
        if "error" in drug_data:
            raise ValueError(f"Drug not found: {drug_id}")
        
        # Generate SEO content
        seo_content = await seo_optimizer.generate_seo_content(
            drug_data, target_audience
        )
        
        return SEOContentResponse(**seo_content)
        
    except Exception as e:
        logger.error(f"Error generating SEO content for {drug_id}: {e}")
        raise

@mcp.tool()
async def create_provider_friendly_content(
    drug_id: str,
    complexity_level: str = "intermediate"
) -> ProviderContentResponse:
    """
    Transform FDA drug information into provider-friendly content.
    
    Args:
        drug_id: The drug identifier
        complexity_level: Content complexity (basic, intermediate, advanced)
    
    Returns:
        Provider-friendly content with improved readability
    """
    if drug_resources is None or content_transformer is None:
        raise RuntimeError("Required components not initialized")
    
    try:
        # Get drug data
        drug_data = await drug_resources.get_drug_by_id(drug_id)
        if "error" in drug_data:
            raise ValueError(f"Drug not found: {drug_id}")
        
        # Transform content
        provider_content = await content_transformer.create_provider_content(
            drug_data, complexity_level
        )
        
        return ProviderContentResponse(**provider_content)
        
    except Exception as e:
        logger.error(f"Error creating provider content for {drug_id}: {e}")
        raise

@mcp.tool()
async def generate_drug_faqs(
    drug_id: str,
    audience: str = "healthcare_providers",
    max_questions: int = 10
) -> FAQResponse:
    """
    Generate structured FAQ sections from drug label information.
    
    Args:
        drug_id: The drug identifier
        audience: Target audience for FAQs
        max_questions: Maximum number of questions to generate
    
    Returns:
        Structured FAQ content with categories
    """
    if drug_resources is None or faq_generator is None:
        raise RuntimeError("Required components not initialized")
    
    try:
        # Get drug data
        drug_data = await drug_resources.get_drug_by_id(drug_id)
        if "error" in drug_data:
            raise ValueError(f"Drug not found: {drug_id}")
        
        # Generate FAQs
        faq_content = await faq_generator.generate_faqs(
            drug_data, audience, max_questions
        )
        
        return FAQResponse(**faq_content)
        
    except Exception as e:
        logger.error(f"Error generating FAQs for {drug_id}: {e}")
        raise

@mcp.tool()
async def find_related_content(
    drug_id: str,
    relation_types: List[str] = ["similar_drugs", "related_conditions"]
) -> RelatedContentResponse:
    """
    Find related drugs, conditions, and alternative treatments.
    
    Args:
        drug_id: The drug identifier
        relation_types: Types of relations to find
    
    Returns:
        Related content suggestions
    """
    if drug_resources is None or related_engine is None:
        raise RuntimeError("Required components not initialized")
    
    try:
        # Get drug data
        drug_data = await drug_resources.get_drug_by_id(drug_id)
        if "error" in drug_data:
            raise ValueError(f"Drug not found: {drug_id}")
        
        # Find related content
        related_content = await related_engine.find_related_content(
            drug_data, relation_types
        )
        
        return RelatedContentResponse(**related_content)
        
    except Exception as e:
        logger.error(f"Error finding related content for {drug_id}: {e}")
        raise

@mcp.tool()
async def batch_generate_content(
    drug_ids: List[str],
    content_types: List[str] = ["seo", "provider", "faq"]
) -> Dict[str, Any]:
    """
    Generate multiple types of content for multiple drugs in batch.
    
    Args:
        drug_ids: List of drug identifiers
        content_types: Types of content to generate
    
    Returns:
        Batch processing results
    """
    try:
        results = {}
        
        for drug_id in drug_ids:
            drug_results = {}
            
            if "seo" in content_types:
                try:
                    seo_content = await generate_seo_content(drug_id)
                    drug_results["seo"] = seo_content.model_dump()
                except Exception as e:
                    drug_results["seo"] = {"error": str(e)}
            
            if "provider" in content_types:
                try:
                    provider_content = await create_provider_friendly_content(drug_id)
                    drug_results["provider"] = provider_content.model_dump()
                except Exception as e:
                    drug_results["provider"] = {"error": str(e)}
            
            if "faq" in content_types:
                try:
                    faq_content = await generate_drug_faqs(drug_id)
                    drug_results["faq"] = faq_content.model_dump()
                except Exception as e:
                    drug_results["faq"] = {"error": str(e)}
            
            results[drug_id] = drug_results
        
        return {
            "status": "completed",
            "processed": len(drug_ids),
            "results": results
        }
        
    except Exception as e:
        logger.error(f"Error in batch generation: {e}")
        raise


# Health check tool (no parameters needed for tools)
@mcp.tool()
async def health_check() -> Dict[str, Any]:
    """Health check endpoint for monitoring."""
    try:
        # Check database connection
        db_status = await db_manager.health_check() if db_manager else False
        
        return {
            "status": "healthy" if db_status else "unhealthy",
            "database": "connected" if db_status else "disconnected",
            "timestamp": asyncio.get_event_loop().time(),
            "components": {
                "seo_optimizer": seo_optimizer is not None,
                "content_transformer": content_transformer is not None,
                "faq_generator": faq_generator is not None,
                "related_engine": related_engine is not None,
                "drug_resources": drug_resources is not None
            }
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "timestamp": asyncio.get_event_loop().time()
        }


def main():
    """Main server startup function."""
    logger.info("🚀 Starting Drug AI Content MCP Server...")
    
    try:
        # Initialize all components first
        async def init_components():
            await initialize_components()
            logger.info("✅ Components initialized successfully")
        
        # Run initialization in asyncio context
        asyncio.run(init_components())
        
        # Start the MCP server
        logger.info("🌐 MCP server ready to accept connections")
        logger.info("📋 Available tools: search_drugs, generate_seo_content, create_provider_friendly_content, generate_drug_faqs, find_related_content, batch_generate_content, health_check")
        logger.info("📚 Available resources: drugs/{drug_id}, drugs/{drug_id}/label")
        
        # Run the server in HTTP mode for API connections
        # Default stdio mode won't work for API connections
        mcp.run(
            transport="streamable-http",
            host="0.0.0.0",  # Allow connections from any host (needed for Docker)
            port=8000,
            path="/mcp"
        )
        
    except KeyboardInterrupt:
        logger.info("⏸️  Server shutdown requested")
    except Exception as e:
        logger.error(f"❌ Server startup failed: {e}")
        raise
    finally:
        # Cleanup
        if db_manager:
            async def cleanup():
                await db_manager.disconnect()
            asyncio.run(cleanup())
        logger.info("🔚 Server shutdown complete")

if __name__ == "__main__":
    main()