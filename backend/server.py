from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pydantic import BaseModel, ConfigDict
from typing import List
from datetime import datetime, timezone
from enum import Enum

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("API")

app = FastAPI()


origins = [
    "https://app-gestao-semanal-2wc9.vercel.app",
    "https://app-gestao-semanal-2wc9-ke4g23pjo-jhonatas-monteiros-projects.vercel.app",
    "https://app-gestao-semanal-2wc9-mt23smy5z-jhonatas-monteiros-projects.vercel.app",
    "http://localhost:3000"
]
raw_origins = os.environ.get('CORS_ORIGINS', '').split(',')
if raw_origins:
    origins.extend([o.strip() for o in raw_origins if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Conexão Mongo
mongo_url = os.environ.get('MONGO_URI')
db_name = os.environ.get('DB_NAME', 'test_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# --- MODELOS ---
class DemandUpdate(BaseModel):
    category: str

class BulkDeleteRequest(BaseModel):
    ids: List[str]

# (Mesmos modelos de antes...)
class DemandCreate(BaseModel):
    description: str
    priority: str
    responsible: str
    subgroup: str
    category: str = "this_week"

class Demand(BaseModel):
    id: str
    description: str
    priority: str
    responsible: str
    subgroup: str
    category: str
    created_at: str
    updated_at: str

api_router = APIRouter(prefix="/api")

@api_router.get("/demands", response_model=List[Demand])
async def get_demands():
    demands = await db.demands.find({}, {"_id": 0}).to_list(1000)
    return demands

@api_router.post("/demands", response_model=Demand)
async def create_demand(demand: DemandCreate):
    now = datetime.now(timezone.utc).isoformat()
    count = await db.demands.count_documents({})
    demand_id = f"DMD-{count + 1:04d}"
    demand_dict = demand.model_dump()
    demand_dict.update({'id': demand_id, 'created_at': now, 'updated_at': now})
    await db.demands.insert_one(demand_dict)
    return demand_dict

# ROTA DE ATUALIZAÇÃO (Para o Drag and Drop)
@api_router.put("/demands/{demand_id}")
async def update_demand(demand_id: str, update_data: DemandUpdate):
    now = datetime.now(timezone.utc).isoformat()
    result = await db.demands.update_one(
        {"id": demand_id},
        {"$set": {"category": update_data.category, "updated_at": now}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Demanda não encontrada")
    return {"status": "success"}

# ROTA DE DELETE EM LOTE
@api_router.post("/demands/bulk-delete")
async def bulk_delete(request: BulkDeleteRequest):
    result = await db.demands.delete_many({"id": {"$in": request.ids}})
    return {"deleted_count": result.deleted_count}

app.include_router(api_router)
