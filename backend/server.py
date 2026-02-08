from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URI']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Enums
class PriorityEnum(str, Enum):
    alta = "alta"
    media = "media"
    baixa = "baixa"

class CategoryEnum(str, Enum):
    last_week = "last_week"
    this_week = "this_week"
    stalled = "stalled"

class SubgroupEnum(str, Enum):
    gestao_territorios = "Gestão de territórios"
    bi_analytics = "BI Analytics"
    setor_autonomos = "Setor Autônomos"
    agendas_incentivos = "Agendas e Incentivos"
    help_desk = "Help Desk"

# Models
class DemandCreate(BaseModel):
    description: str
    priority: PriorityEnum
    responsible: str
    subgroup: SubgroupEnum
    category: CategoryEnum = CategoryEnum.this_week

class DemandUpdate(BaseModel):
    description: Optional[str] = None
    priority: Optional[PriorityEnum] = None
    responsible: Optional[str] = None
    subgroup: Optional[SubgroupEnum] = None
    category: Optional[CategoryEnum] = None

class Demand(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    description: str
    priority: PriorityEnum
    responsible: str
    subgroup: SubgroupEnum
    category: CategoryEnum
    created_at: str
    updated_at: str

class BulkDeleteRequest(BaseModel):
    ids: List[str]

# Routes
@api_router.get("/")
async def root():
    return {"message": "Weekly Demand Management API"}

@api_router.post("/demands", response_model=Demand)
async def create_demand(demand: DemandCreate):
    now = datetime.now(timezone.utc).isoformat()
    
    # Get the count to generate a simple incremental ID
    count = await db.demands.count_documents({})
    demand_id = f"DMD-{count + 1:04d}"
    
    demand_dict = demand.model_dump()
    demand_dict['id'] = demand_id
    demand_dict['created_at'] = now
    demand_dict['updated_at'] = now
    
    await db.demands.insert_one(demand_dict)
    
    return Demand(**demand_dict)

@api_router.get("/demands", response_model=List[Demand])
async def get_demands(
    priority: Optional[PriorityEnum] = None,
    subgroup: Optional[SubgroupEnum] = None,
    category: Optional[CategoryEnum] = None
):
    # Build filter
    filters = {}
    if priority:
        filters['priority'] = priority
    if subgroup:
        filters['subgroup'] = subgroup
    if category:
        filters['category'] = category
    
    demands = await db.demands.find(filters, {"_id": 0}).to_list(1000)
    return [Demand(**d) for d in demands]

@api_router.get("/demands/{demand_id}", response_model=Demand)
async def get_demand(demand_id: str):
    demand = await db.demands.find_one({"id": demand_id}, {"_id": 0})
    if not demand:
        raise HTTPException(status_code=404, detail="Demand not found")
    return Demand(**demand)

@api_router.put("/demands/{demand_id}", response_model=Demand)
async def update_demand(demand_id: str, demand_update: DemandUpdate):
    # Check if demand exists
    existing = await db.demands.find_one({"id": demand_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Demand not found")
    
    # Update only provided fields
    update_data = {k: v for k, v in demand_update.model_dump().items() if v is not None}
    
    if update_data:
        update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
        await db.demands.update_one(
            {"id": demand_id},
            {"$set": update_data}
        )
    
    # Fetch updated demand
    updated_demand = await db.demands.find_one({"id": demand_id}, {"_id": 0})
    return Demand(**updated_demand)

@api_router.delete("/demands/{demand_id}")
async def delete_demand(demand_id: str):
    result = await db.demands.delete_one({"id": demand_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Demand not found")
    return {"message": "Demand deleted successfully"}

@api_router.post("/demands/bulk-delete")
async def bulk_delete_demands(request: BulkDeleteRequest):
    result = await db.demands.delete_many({"id": {"$in": request.ids}})
    return {"message": f"{result.deleted_count} demands deleted successfully"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
