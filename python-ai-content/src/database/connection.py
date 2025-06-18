"""
Database connection and management for the MCP server.
"""

import os
import logging
from typing import Dict, Any, List, Optional
from contextlib import asynccontextmanager

try:
    import asyncpg  # type: ignore
except ImportError:
    asyncpg = None  # Optional dependency for performance
    
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import text

logger = logging.getLogger(__name__)


class DatabaseManager:
    """Manages database connections and operations."""
    
    def __init__(self):
        self.engine = None
        self.session_factory = None
        self.pool = None
        
        # Database configuration from environment
        self.config = {
            'host': os.getenv('DB_HOST', 'localhost'),
            'port': int(os.getenv('DB_PORT', '5432')),
            'username': os.getenv('DB_USERNAME', 'postgres'),
            'password': os.getenv('DB_PASSWORD', 'password'),
            'database': os.getenv('DB_NAME', 'druginfo')
        }
        
        self.connection_string = (
            f"postgresql+asyncpg://{self.config['username']}:{self.config['password']}"
            f"@{self.config['host']}:{self.config['port']}/{self.config['database']}"
        )
    
    async def connect(self):
        """Establish database connections."""
        try:
            # Create SQLAlchemy async engine
            self.engine = create_async_engine(
                self.connection_string,
                echo=False,  # Set to True for SQL logging
                pool_size=10,
                max_overflow=20,
                pool_timeout=30,
                pool_recycle=3600,  # Recycle connections after 1 hour
            )
            
            # Create session factory
            self.session_factory = async_sessionmaker(
                self.engine,
                class_=AsyncSession,
                expire_on_commit=False
            )
            
            # Create direct asyncpg connection pool for raw queries (if available)
            if asyncpg:
                self.pool = await asyncpg.create_pool(
                    host=self.config['host'],
                    port=self.config['port'],
                    user=self.config['username'],
                    password=self.config['password'],
                    database=self.config['database'],
                    min_size=5,
                    max_size=20,
                    command_timeout=60
                )
            else:
                logger.warning("asyncpg not available, using SQLAlchemy only")
                self.pool = None
            
            # Test the connection
            await self.health_check()
            logger.info("✅ Database connections established successfully")
            
        except Exception as e:
            logger.error(f"❌ Failed to connect to database: {e}")
            raise
    
    async def disconnect(self):
        """Close database connections."""
        try:
            if self.pool:
                await self.pool.close()
                logger.info("Closed asyncpg pool")
            
            if self.engine:
                await self.engine.dispose()
                logger.info("Disposed SQLAlchemy engine")
                
        except Exception as e:
            logger.error(f"Error closing database connections: {e}")
    
    @asynccontextmanager
    async def get_session(self):
        """Get an async SQLAlchemy session."""
        if not self.session_factory:
            raise RuntimeError("Database not connected")
        
        async with self.session_factory() as session:
            try:
                yield session
            except Exception as e:
                await session.rollback()
                logger.error(f"Database session error: {e}")
                raise
            finally:
                await session.close()
    
    @asynccontextmanager
    async def get_connection(self):
        """Get a raw asyncpg connection."""
        if not self.pool:
            raise RuntimeError("Database pool not initialized or asyncpg not available")
        
        async with self.pool.acquire() as connection:
            yield connection
    
    async def health_check(self) -> bool:
        """Check database connectivity."""
        try:
            if self.pool:
                # Use asyncpg if available
                async with self.get_connection() as conn:
                    result = await conn.fetchval("SELECT 1")
                    return result == 1
            else:
                # Use SQLAlchemy as fallback
                async with self.get_session() as session:
                    result = await session.execute(text("SELECT 1"))
                    return result.scalar() == 1
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return False
    
    async def execute_query(self, query: str, *args) -> List[Dict[str, Any]]:
        """Execute a query and return results as list of dictionaries."""
        try:
            if self.pool:
                # Use asyncpg if available
                async with self.get_connection() as conn:
                    rows = await conn.fetch(query, *args)
                    return [dict(row) for row in rows]
            else:
                # Use SQLAlchemy as fallback
                async with self.get_session() as session:
                    result = await session.execute(text(query), args)
                    return [dict(row._mapping) for row in result]
        except Exception as e:
            logger.error(f"Query execution failed: {e}")
            raise
    
    async def execute_single(self, query: str, *args) -> Optional[Dict[str, Any]]:
        """Execute a query and return a single result."""
        try:
            if self.pool:
                # Use asyncpg if available
                async with self.get_connection() as conn:
                    row = await conn.fetchrow(query, *args)
                    return dict(row) if row else None
            else:
                # Use SQLAlchemy as fallback
                async with self.get_session() as session:
                    result = await session.execute(text(query), args)
                    row = result.first()
                    return dict(row._mapping) if row else None
        except Exception as e:
            logger.error(f"Single query execution failed: {e}")
            raise
    
    async def execute_scalar(self, query: str, *args) -> Any:
        """Execute a query and return a scalar value."""
        try:
            if self.pool:
                # Use asyncpg if available
                async with self.get_connection() as conn:
                    return await conn.fetchval(query, *args)
            else:
                # Use SQLAlchemy as fallback
                async with self.get_session() as session:
                    result = await session.execute(text(query), args)
                    return result.scalar()
        except Exception as e:
            logger.error(f"Scalar query execution failed: {e}")
            raise
    
    async def get_drug_by_id(self, drug_id: str) -> Optional[Dict[str, Any]]:
        """Get complete drug information by ID."""
        query = """
        SELECT 
            d.*,
            dl.indications_and_usage,
            dl.dosage_and_administration,
            dl.warnings_and_precautions,
            dl.adverse_reactions,
            dl.contraindications,
            dl.clinical_pharmacology,
            dl.how_supplied,
            dl.mechanism_of_action,
            dl.pharmacokinetics
        FROM drugs d
        LEFT JOIN drug_labels dl ON d.id = dl.drug_id
        WHERE d.id = $1
        """
        return await self.execute_single(query, drug_id)
    
    async def search_drugs(
        self,
        query: str = "",
        indication: str = "",
        manufacturer: str = "",
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Search drugs with various filters."""
        base_query = """
        SELECT 
            d.id,
            d.drug_name,
            d.generic_name,
            d.brand_name,
            d.manufacturer,
            d.dosage_form,
            d.strength,
            d.route,
            dl.indications_and_usage
        FROM drugs d
        LEFT JOIN drug_labels dl ON d.id = dl.drug_id
        WHERE 1=1
        """
        
        params = []
        param_count = 0
        
        if query:
            param_count += 1
            base_query += f" AND (d.drug_name ILIKE ${param_count} OR d.generic_name ILIKE ${param_count})"
            params.append(f"%{query}%")
        
        if indication:
            param_count += 1
            base_query += f" AND dl.indications_and_usage ILIKE ${param_count}"
            params.append(f"%{indication}%")
        
        if manufacturer:
            param_count += 1
            base_query += f" AND d.manufacturer ILIKE ${param_count}"
            params.append(f"%{manufacturer}%")
        
        param_count += 1
        base_query += f" ORDER BY d.drug_name LIMIT ${param_count}"
        params.append(limit)
        
        return await self.execute_query(base_query, *params)
    
    async def get_similar_drugs(
        self,
        drug_id: str,
        similarity_type: str = "indication",
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """Find similar drugs based on various criteria."""
        if similarity_type == "indication":
            query = """
            WITH target_drug AS (
                SELECT dl.indications_and_usage
                FROM drugs d
                JOIN drug_labels dl ON d.id = dl.drug_id
                WHERE d.id = $1
            )
            SELECT 
                d.id,
                d.drug_name,
                d.generic_name,
                d.manufacturer,
                d.dosage_form,
                similarity(dl.indications_and_usage, target_drug.indications_and_usage) as similarity_score
            FROM drugs d
            JOIN drug_labels dl ON d.id = dl.drug_id
            CROSS JOIN target_drug
            WHERE d.id != $1
                AND dl.indications_and_usage IS NOT NULL
                AND target_drug.indications_and_usage IS NOT NULL
            ORDER BY similarity_score DESC
            LIMIT $2
            """
        elif similarity_type == "manufacturer":
            query = """
            SELECT 
                d.id,
                d.drug_name,
                d.generic_name,
                d.manufacturer,
                d.dosage_form
            FROM drugs d
            WHERE d.manufacturer = (
                SELECT manufacturer FROM drugs WHERE id = $1
            )
            AND d.id != $1
            ORDER BY d.drug_name
            LIMIT $2
            """
        else:
            query = """
            SELECT 
                d.id,
                d.drug_name,
                d.generic_name,
                d.manufacturer,
                d.dosage_form
            FROM drugs d
            WHERE d.id != $1
            ORDER BY d.drug_name
            LIMIT $2
            """
        
        return await self.execute_query(query, drug_id, limit)
    
    async def get_database_stats(self) -> Dict[str, Any]:
        """Get database statistics for monitoring."""
        try:
            stats = {}
            
            # Get table counts
            tables = ["drugs", "drug_labels", "ai_enhanced_content"]
            for table in tables:
                count = await self.execute_scalar(f"SELECT COUNT(*) FROM {table}")
                stats[f"{table}_count"] = count
            
            # Get recent activity
            recent_drugs = await self.execute_scalar(
                "SELECT COUNT(*) FROM drugs WHERE created_at > NOW() - INTERVAL '24 hours'"
            )
            stats["recent_drugs_24h"] = recent_drugs
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting database stats: {e}")
            return {"error": str(e)}