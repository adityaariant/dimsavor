from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from app.database import get_db

router = APIRouter(prefix="/kitchen", tags=["kitchen"])

@router.get("/")
def get_kitchen_board(session_id: Optional[int] = None, date: Optional[str] = None, db = Depends(get_db)):
    # Basic fetch for now, will integrate with decomposer utility
    query = db.table("orders").select("id_order, id_slot, delivery_slots(jadwal_teks)").neq("status_bayar", "CANCELLED")
    if session_id:
        query = query.eq("id_po", session_id)
    orders = query.execute()
    
    order_ids = [o["id_order"] for o in orders.data]
    bundles = db.table("bundle_components").select("*").execute()
    aliases = db.table("alias_menu").select("*").execute()

    if not order_ids:
        return {"orders": [], "items": [], "bundles": bundles.data, "aliases": aliases.data}
        
    items = db.table("order_items").select("*").in_("id_order", order_ids).execute()
    
    return {
        "orders": orders.data,
        "items": items.data,
        "bundles": bundles.data,
        "aliases": aliases.data
    }
