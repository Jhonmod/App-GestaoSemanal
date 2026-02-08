from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone
from enum import Enum

# Configuração básica de logs
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("API")

app = FastAPI()

# --- CONFIGURAÇÃO DE CORS (Obrigatório vir ANTES do Router) ---
# Lista de origens sem espaços e bem definida
raw_origins = os.environ.get('CORS_ORIGINS', '').split(',')
origins = [
    "https://app-gestao-semanal-2wc9.vercel.app",
    "https://app-gestao-semanal-2wc9-ke4g23pjo-jhonatas-monteiros-projects.vercel.app",
    "https://app-gestao-semanal-2wc9-mt23smy5z-jhonatas-monteiros-projects.vercel.app",
    "http://localhost:3000"
]

# Adiciona as origens da ENV limpando espaços em branco acidentais
if raw_origins:
    origins.extend([o.strip() for o in raw_origins if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # Garante que OPTIONS, POST, GET sejam aceitos
    allow_headers=["*"],
)

# --- CONEXÃO MONGO ---
mongo_url = os.environ.get('MONGO_URI')
db_name = os.environ.get('DB_NAME', 'test_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# --- MODELOS ---
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

class DemandCreate(BaseModel):
    description: str
    priority: PriorityEnum
    responsible: str
    subgroup: SubgroupEnum
    category: CategoryEnum = CategoryEnum.this_week

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

# --- ROUTER ---
api_router = APIRouter(prefix="/api")

@api_router.get("/")
async def root():
    return {"message": "API Online"}

@api_router.post("/demands", response_model=Demand)
async def create_demand(demand: DemandCreate):
    now = datetime.now(timezone.utc).isoformat()
    count = await db.demands.count_documents({})
    demand_id = f"DMD-{count + 1:04d}"
    
    demand_dict = demand.model_dump()
    demand_dict.update({'id': demand_id, 'created_at': now, 'updated_at': now})
    
    await db.demands.insert_one(demand_dict)
    return Demand(**demand_dict)

@api_router.get("/demands", response_model=List[Demand])
async def get_demands():
    demands = await db.demands.find({}, {"_id": 0}).to_list(1000)
    return [Demand(**d) for d in demands]


app.include_router(api_router)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
