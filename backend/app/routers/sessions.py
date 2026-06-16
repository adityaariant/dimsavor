from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from datetime import date
from app.database import get_db

router = APIRouter(prefix="/sessions", tags=["sessions"])

class SessionCreate(BaseModel):
    tanggal_buka: date
    tanggal_tutup: date
    kuota_maksimal: int

@router.get("/")
def list_sessions(db = Depends(get_db)):
    res = db.table("po_sessions").select("*").order("created_at", desc=True).execute()
    return res.data

@router.post("/")
def create_session(session: SessionCreate, db = Depends(get_db)):
    active = db.table("po_sessions").select("id_po").eq("status", "Active").execute()
    if active.data:
        raise HTTPException(status_code=409, detail="An active session already exists")
    
    res = db.table("po_sessions").insert({
        "tanggal_buka": session.tanggal_buka.isoformat(),
        "tanggal_tutup": session.tanggal_tutup.isoformat(),
        "kuota_maksimal": session.kuota_maksimal,
        "status": "Active"
    }).execute()
    return res.data[0]

@router.get("/{id_po}")
def get_session(id_po: int, db = Depends(get_db)):
    session = db.table("po_sessions").select("*").eq("id_po", id_po).single().execute()
    slots = db.table("delivery_slots").select("*").eq("id_po", id_po).execute()
    orders = db.table("orders").select("id_order").eq("id_po", id_po).execute()
    
    # Quota logic will be handled more thoroughly with decomposer later
    return {
        "session": session.data,
        "slots": slots.data,
        "order_count": len(orders.data)
    }

@router.patch("/{id_po}/close")
def close_session(id_po: int, db = Depends(get_db)):
    unpaid = db.table("orders").select("id_order").eq("id_po", id_po).eq("status_bayar", "UNPAID").execute()
    if unpaid.data:
        raise HTTPException(status_code=400, detail="Cannot close session with UNPAID orders")
    
    res = db.table("po_sessions").update({"status": "Closed"}).eq("id_po", id_po).execute()
    return res.data[0]
