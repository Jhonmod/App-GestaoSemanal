from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from typing import List, Union, Optional
from datetime import datetime, timezone
import os
import uuid
import logging

# ================= LOG =================

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("API")

# ================= APP =================

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://app-gestao-semanal-2wc9.vercel.app",
        "http://localhost:3000",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ================= DATABASE =================

mongo_url = os.environ.get("MONGO_URI")
db_name = os.environ.get("DB_NAME", "test_db")

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# ================= MODELS =================

class DemandCreate(BaseModel):
    description: str
    priority: str
    responsible: Union[List[str], str]
    subgroup: Union[List[str], str]
    category: str = "this_week"
    observation: Optional[str] = ""
    deliveryDate: Optional[str] = ""

class DemandUpdate(BaseModel):
    description: Optional[str] = None
    priority: Optional[str] = None
    responsible: Optional[Union[List[str], str]] = None
    subgroup: Optional[Union[List[str], str]] = None
    category: Optional[str] = None
    observation: Optional[str] = None
    deliveryDate: Optional[str] = None

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

class GeneralNoticeCreate(BaseModel):
    text: str

class GeneralNotice(BaseModel):
    id: str
    text: str
    created_at: str

# ================= ROUTER =================

api = APIRouter(prefix="/api")

# ================= HEALTH =================

@app.get("/")
async def health():
    return {"status": "ok"}

# ================= DEMANDS =================

@api.get("/demands", response_model=List[Demand])
async def get_demands():
    return await db.demands.find({}, {"_id": 0}).to_list(1000)

@api.post("/demands", status_code=201)
async def create_demand(demand: DemandCreate):
    now = datetime.now(timezone.utc).isoformat()

    data = demand.model_dump()

    if isinstance(data["responsible"], list):
        data["responsible"] = ", ".join(data["responsible"])
    if isinstance(data["subgroup"], list):
        data["subgroup"] = ", ".join(data["subgroup"])

    demand_id = f"DMD-{uuid.uuid4().hex[:8].upper()}"

    data.update({
        "id": demand_id,
        "created_at": now,
        "updated_at": now
    })

    await db.demands.insert_one(data)

    return {
        "success": True,
        "id": demand_id
    }

@api.put("/demands/{demand_id}")
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

    return {"success": True}

@api.post("/demands/bulk-delete")
async def bulk_delete_demands(req: BulkDeleteRequest):
    result = await db.demands.delete_many({"id": {"$in": req.ids}})
    return {"deleted": result.deleted_count}

# ================= GENERAL NOTICES =================

@api.get("/general-notices", response_model=List[GeneralNotice])
async def get_general_notices():
    return await db.general_notices.find({}, {"_id": 0}).to_list(1000)

@api.post("/general-notices", status_code=201)
async def create_general_notice(data: GeneralNoticeCreate):
    now = datetime.now(timezone.utc).isoformat()
    notice_id = f"NOTICE-{uuid.uuid4().hex[:8].upper()}"

    notice = {
        "id": notice_id,
        "text": data.text,
        "created_at": now
    }

    await db.general_notices.insert_one(notice)

    return {
        "success": True,
        "id": notice_id
    }

@api.post("/general-notices/bulk-delete")
async def delete_general_notices(req: BulkDeleteRequest):
    result = await db.general_notices.delete_many({"id": {"$in": req.ids}})
    return {"deleted": result.deleted_count}

# ================= REGISTER ROUTER =================

app.include_router(api)
