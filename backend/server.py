from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pydantic import BaseModel, ConfigDict
from typing import List, Union, Optional
from datetime import datetime, timezone
from enum import Enum

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("API")

app = FastAPI()

# Configuração de CORS
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
    allow_origin_regex=r"https://.*\.vercel\.app", # Garante funcionamento com qualquer Preview do Vercel
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

# Modelo para atualização (suporta mudar categoria ou qualquer outro campo na edição)
class DemandUpdate(BaseModel):
    description: Optional[str] = None
    priority: Optional[str] = None
    responsible: Optional[str] = None
    subgroup: Optional[Union[List[str], str]] = None
    category: Optional[str] = None

class BulkDeleteRequest(BaseModel):
    ids: List[str]

class DemandCreate(BaseModel):
    description: str
    priority: str
    responsible: str
    subgroup: Union[List[str], str] # Aceita lista do Front ou String
    category: str = "this_week"

class Demand(BaseModel):
    id: str
    description: str
    priority: str
    responsible: str
    subgroup: Union[List[str], str] # Retorna como string ou lista conforme o banco
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
    
    # CONVERSÃO: Se subgroup for lista, transforma em string para o banco
    if isinstance(demand_dict['subgroup'], list):
        demand_dict['subgroup'] = ", ".join(demand_dict['subgroup'])
        
    demand_dict.update({'id': demand_id, 'created_at': now, 'updated_at': now})
    await db.demands.insert_one(demand_dict)
    return demand_dict

@api_router.put("/demands/{demand_id}")
async def update_demand(demand_id: str, update_data: DemandUpdate):
    now = datetime.now(timezone.utc).isoformat()
    
    # Prepara os dados para atualização
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    # CONVERSÃO: Se subgroup estiver sendo atualizado e for lista
    if 'subgroup' in update_dict and isinstance(update_dict['subgroup'], list):
        update_dict['subgroup'] = ", ".join(update_dict['subgroup'])
        
    update_dict["updated_at"] = now
    
    result = await db.demands.update_one(
        {"id": demand_id},
        {"$set": update_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Demanda não encontrada")
    return {"status": "success"}

@api_router.post("/demands/bulk-delete")
async def bulk_delete(request: BulkDeleteRequest):
    result = await db.demands.delete_many({"id": {"$in": request.ids}})
    return {"deleted_count": result.deleted_count}

app.include_router(api_router)
