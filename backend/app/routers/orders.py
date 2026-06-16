from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from app.database import get_db

router = APIRouter(prefix="/orders", tags=["orders"])

class OrderItemCreate(BaseModel):
    nama_produk: str
    qty: int
    is_bundle: bool = False
    topping: Optional[str] = None
    subtotal: int

class OrderCreate(BaseModel):
    id_po: int
    nama_pelanggan: str
    alamat: str
    area_tag: Optional[str] = None
    jadwal_kirim_request: Optional[str] = None
    id_slot: Optional[int] = None
    metode_bayar: Optional[str] = None
    ongkir: int = 0
    ongkir_rule: Optional[str] = None
    items: List[OrderItemCreate]

@router.get("/")
def list_orders(session_id: Optional[int] = None, status_bayar: Optional[str] = None, status_kirim: Optional[str] = None, search: Optional[str] = None, db = Depends(get_db)):
    query = db.table("orders").select("*, delivery_slots(jadwal_teks)")
    if session_id:
        query = query.eq("id_po", session_id)
    if status_bayar:
        query = query.eq("status_bayar", status_bayar)
    if status_kirim:
        query = query.eq("status_kirim", status_kirim)
    if search:
        query = query.ilike("nama_pelanggan", f"%{search}%")
        
    res = query.order("created_at", desc=True).execute()
    return res.data

@router.post("/")
def create_order(order: OrderCreate, db = Depends(get_db)):
    # Insert order
    order_data = order.model_dump(exclude={"items"})
    res = db.table("orders").insert(order_data).execute()
    new_order = res.data[0]
    id_order = new_order["id_order"]
    
    items_data = []
    for item in order.items:
        item_dict = item.model_dump()
        item_dict["id_order"] = id_order
        items_data.append(item_dict)
        
    if items_data:
        db.table("order_items").insert(items_data).execute()
        
    return new_order

@router.put("/{id_order}")
def update_order(id_order: int, order: OrderCreate, db = Depends(get_db)):
    # Verify order exists
    existing_order = db.table("orders").select("id_order").eq("id_order", id_order).single().execute()
    if not existing_order.data:
        raise HTTPException(status_code=404, detail="Order not found")

    # Update order details
    order_data = order.model_dump(exclude={"items", "id_po"}) # don't change session
    res = db.table("orders").update(order_data).eq("id_order", id_order).execute()
    updated_order = res.data[0]
    
    # Delete old items
    db.table("order_items").delete().eq("id_order", id_order).execute()
    
    # Insert new items
    items_data = []
    for item in order.items:
        item_dict = item.model_dump()
        item_dict["id_order"] = id_order
        items_data.append(item_dict)
        
    if items_data:
        db.table("order_items").insert(items_data).execute()
        
    return updated_order

@router.get("/{id_order}")
def get_order(id_order: int, db = Depends(get_db)):
    order = db.table("orders").select("*").eq("id_order", id_order).single().execute()
    items = db.table("order_items").select("*").eq("id_order", id_order).execute()
    return {
        "order": order.data,
        "items": items.data
    }

@router.patch("/{id_order}/pay")
def toggle_pay(id_order: int, db = Depends(get_db)):
    order = db.table("orders").select("status_bayar").eq("id_order", id_order).single().execute()
    new_status = "PAID" if order.data["status_bayar"] == "UNPAID" else "UNPAID"
    res = db.table("orders").update({"status_bayar": new_status}).eq("id_order", id_order).execute()
    return res.data[0]

@router.patch("/{id_order}/send")
def toggle_send(id_order: int, db = Depends(get_db)):
    order = db.table("orders").select("status_kirim").eq("id_order", id_order).single().execute()
    new_status = "SENT" if order.data["status_kirim"] == "PENDING" else "PENDING"
    res = db.table("orders").update({"status_kirim": new_status}).eq("id_order", id_order).execute()
    return res.data[0]

@router.patch("/{id_order}/cancel")
def cancel_order(id_order: int, db = Depends(get_db)):
    res = db.table("orders").update({
        "status_bayar": "CANCELLED",
        "status_kirim": "CANCELLED"
    }).eq("id_order", id_order).execute()
    return res.data[0]
