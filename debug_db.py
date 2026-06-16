import sys
import os
from pprint import pprint

# Add the backend dir to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from app.database import get_db

db = get_db()

try:
    order_data = {
        "id_po": 4, 
        "nama_pelanggan": "Test User",
        "alamat": "Test Alamat",
        "metode_bayar": "BCA",
        "ongkir": 0
    }
    
    res = db.table("orders").insert(order_data).execute()
    new_order = res.data[0]
    id_order = new_order["id_order"]
    
    items_data = [
        {
            "id_order": id_order,
            "nama_produk": "Dimsum Mentai 4pcs",
            "qty": 1,
            "is_bundle": False,
            "topping": None,
            "subtotal": 15000
        }
    ]
    
    res_items = db.table("order_items").insert(items_data).execute()
    print("Items insert success:")
    pprint(res_items.data)
except Exception as e:
    print(f"Error inserting order items: {e}")
