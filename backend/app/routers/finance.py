from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.database import get_db

router = APIRouter(tags=["finance"])

class ExpenseCreate(BaseModel):
    id_po: int
    nama_bahan: str
    nominal: int
    dibayar_oleh: str

@router.get("/expenses")
def list_expenses(session_id: int, db = Depends(get_db)):
    res = db.table("expenses").select("*").eq("id_po", session_id).execute()
    return res.data

@router.post("/expenses")
def create_expense(expense: ExpenseCreate, db = Depends(get_db)):
    res = db.table("expenses").insert(expense.model_dump()).execute()
    return res.data[0]

@router.delete("/expenses/{id_expense}")
def delete_expense(id_expense: int, db = Depends(get_db)):
    db.table("expenses").delete().eq("id_expense", id_expense).execute()
    return {"message": "Expense deleted"}

@router.get("/finance/preview")
def finance_preview(session_id: int, db = Depends(get_db)):
    orders = db.table("orders").select("id_order, ongkir").eq("id_po", session_id).eq("status_bayar", "PAID").execute()
    expenses = db.table("expenses").select("*").eq("id_po", session_id).execute()
    
    total_revenue = 0
    for order in orders.data:
        items = db.table("order_items").select("subtotal").eq("id_order", order["id_order"]).execute()
        subtotal_items = sum(i["subtotal"] for i in items.data)
        total_revenue += subtotal_items + order["ongkir"]
        
    total_modal = sum(e["nominal"] for e in expenses.data)
    laba_bersih = total_revenue - total_modal
    
    adit_modal = sum(e["nominal"] for e in expenses.data if e["dibayar_oleh"] == "Adit")
    kila_modal = sum(e["nominal"] for e in expenses.data if e["dibayar_oleh"] == "Kila")
    
    return {
        "total_revenue": total_revenue,
        "total_modal": total_modal,
        "laba_bersih": laba_bersih,
        "adit_receives": adit_modal + (laba_bersih // 2),
        "kila_receives": kila_modal + (laba_bersih // 2)
    }

@router.post("/finance/close")
def finance_close(session_id: int, db = Depends(get_db)):
    unpaid = db.table("orders").select("id_order").eq("id_po", session_id).eq("status_bayar", "UNPAID").execute()
    if unpaid.data:
        raise HTTPException(status_code=400, detail="Cannot close session with UNPAID orders")
    
    res = db.table("po_sessions").update({"status": "Closed"}).eq("id_po", session_id).execute()
    return {"message": "Session closed", "session": res.data[0]}
