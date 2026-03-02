from fastapi import FastAPI, APIRouter, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pydantic import BaseModel
from typing import List, Union, Optional
from datetime import datetime, timezone

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("API")

app = FastAPI()

origins = [
    "https://app-gestao-semanal-2wc9.vercel.app",
    "http://localhost:3000",
    "https://app-gestaosemanal-1.onrender.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

mongo_url = os.environ.get("MONGO_URI")
db_name = os.environ.get("DB_NAME", "test_db")
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# ================= MODELOS =================

class DemandUpdate(BaseModel):
    description: Optional[str] = None
    priority: Optional[str] = None
    responsible: Optional[Union[List[str], str]] = None
    subgroup: Optional[Union[List[str], str]] = None
    category: Optional[str] = None
    observation: Optional[str] = None
    deliveryDate: Optional[str] = None

class DemandCreate(BaseModel):
    description: str
    priority: str
    responsible: Union[List[str], str]
    subgroup: Union[List[str], str]
    category: str = "this_week"
    observation: Optional[str] = ""
    deliveryDate: str

class Demand(BaseModel):
    id: str
    description: str
    priority: str
    responsible: Union[List[str], str]
    subgroup: Union[List[str], str]
    category: str
    observation: Optional[str]
    deliveryDate: Optional[str]
    created_at: str
    updated_at: str

class BulkDeleteRequest(BaseModel):
    ids: List[str]

# ===== Avisos Gerais =====

class GeneralNoticeCreate(BaseModel):
    text: str

class GeneralNotice(BaseModel):
    id: str
    text: str
    created_at: str

api_router = APIRouter(prefix="/api")

# ================= PRE-FLIGHT CORS (CORREÇÃO) =================

@api_router.options("/demands")
async def options_demands():
    return Response(status_code=200)

# ================= HEALTH =================

@app.get("/")
async def health():
    return {"status": "ok"}

# ================= DEMANDS =================

@api_router.get("/demands", response_model=List[Demand])
async def get_demands():
    return await db.demands.find({}, {"_id": 0}).to_list(1000)

@api_router.post("/demands")
async def create_demand(demand: DemandCreate):
    now = datetime.now(timezone.utc).isoformat()
    count = await db.demands.count_documents({})
    demand_id = f"DMD-{count + 1:04d}"

    data = demand.model_dump()

    if isinstance(data["responsible"], list):
        data["responsible"] = ", ".join(data["responsible"])
    if isinstance(data["subgroup"], list):
        data["subgroup"] = ", ".join(data["subgroup"])

    data.update({
        "id": demand_id,
        "created_at": now,
        "updated_at": now
    })

    await db.demands.insert_one(data)
    return data

@api_router.put("/demands/{demand_id}")
async def update_demand(demand_id: str, update: DemandUpdate):
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}

    if "responsible" in update_data and isinstance(update_data["responsible"], list):
        update_data["responsible"] = ", ".join(update_data["responsible"])
    if "subgroup" in update_data and isinstance(update_data["subgroup"], list):
        update_data["subgroup"] = ", ".join(update_data["subgroup"])

    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    result = await db.demands.update_one({"id": demand_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(404, "Demanda não encontrada")

    return {"status": "ok"}

@api_router.post("/demands/bulk-delete")
async def bulk_delete_demands(req: BulkDeleteRequest):
    result = await db.demands.delete_many({"id": {"$in": req.ids}})
    return {"deleted": result.deleted_count}

# ================= AVISOS GERAIS =================

@api_router.get("/general-notices", response_model=List[GeneralNotice])
async def get_general_notices():
    return await db.general_notices.find({}, {"_id": 0}).to_list(1000)

@api_router.post("/general-notices", response_model=GeneralNotice)
async def create_general_notice(data: GeneralNoticeCreate):
    now = datetime.now(timezone.utc).isoformat()
    count = await db.general_notices.count_documents({})
    notice_id = f"NOTICE-{count + 1:04d}"

    notice = {
        "id": notice_id,
        "text": data.text,
        "created_at": now
    }

    await db.general_notices.insert_one(notice)
    return notice

@api_router.post("/general-notices/bulk-delete")
async def delete_general_notices(req: BulkDeleteRequest):
    result = await db.general_notices.delete_many({"id": {"$in": req.ids}})
    return {"deleted": result.deleted_count}

app.include_router(api_router)
