from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from app.database import get_db
from app.utils.decomposer import decompose_items

router = APIRouter(prefix="/kitchen", tags=["kitchen"])

@router.get("/")
def get_kitchen_board(session_id: Optional[int] = None, date: Optional[str] = None, db = Depends(get_db)):
    # Fetch orders including nama_pelanggan for grouping on the frontend
    query = db.table("orders").select("id_order, id_slot, nama_pelanggan, delivery_slots(jadwal_teks)").neq("status_bayar", "CANCELLED")
    if session_id:
        query = query.eq("id_po", session_id)
    orders = query.execute()
    
    order_ids = [o["id_order"] for o in orders.data]
    bundles = db.table("bundle_components").select("*").execute()
    aliases = db.table("alias_menu").select("*").execute()

    if not order_ids:
        return {"orders": [], "items": [], "bundles": bundles.data, "aliases": aliases.data}
        
    items = db.table("order_items").select("*").in_("id_order", order_ids).execute()
    
    # Build bundle map: {bundle_name: [{'nama_produk_komponen', 'qty_komponen'}]}
    bundle_map = {}
    for b in bundles.data:
        b_name = b["nama_bundle"]
        if b_name not in bundle_map:
            bundle_map[b_name] = []
        bundle_map[b_name].append(b)
        
    # Decompose items
    decomposed_items = decompose_items(items.data, bundle_map)
    
    return {
        "orders": orders.data,
        "items": decomposed_items,
        "bundles": bundles.data,
        "aliases": aliases.data
    }
