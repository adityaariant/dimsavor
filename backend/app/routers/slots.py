from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from app.database import get_db

router = APIRouter(tags=["slots"])

class SlotCreate(BaseModel):
    jadwal_teks: str
    is_free_ongkir: bool = False

class SlotUpdate(BaseModel):
    jadwal_teks: Optional[str] = None
    is_free_ongkir: Optional[bool] = None

@router.get("/sessions/{id_po}/slots")
def list_slots(id_po: int, db = Depends(get_db)):
    res = db.table("delivery_slots").select("*").eq("id_po", id_po).execute()
    return res.data

@router.post("/sessions/{id_po}/slots")
def create_slot(id_po: int, slot: SlotCreate, db = Depends(get_db)):
    res = db.table("delivery_slots").insert({
        "id_po": id_po,
        "jadwal_teks": slot.jadwal_teks,
        "is_free_ongkir": slot.is_free_ongkir
    }).execute()
    return res.data[0]

@router.patch("/slots/{id_slot}")
def update_slot(id_slot: int, slot: SlotUpdate, db = Depends(get_db)):
    update_data = {}
    if slot.jadwal_teks is not None:
        update_data["jadwal_teks"] = slot.jadwal_teks
    if slot.is_free_ongkir is not None:
        update_data["is_free_ongkir"] = slot.is_free_ongkir
        
    res = db.table("delivery_slots").update(update_data).eq("id_slot", id_slot).execute()
    return res.data[0]

@router.delete("/slots/{id_slot}")
def delete_slot(id_slot: int, db = Depends(get_db)):
    orders = db.table("orders").select("id_order").eq("id_slot", id_slot).execute()
    if orders.data:
        raise HTTPException(status_code=400, detail="Cannot delete slot referenced by orders")
    
    db.table("delivery_slots").delete().eq("id_slot", id_slot).execute()
    return {"message": "Slot deleted"}
