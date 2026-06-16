import os
from supabase import create_client

url = os.environ.get("SUPABASE_URL", "")
key = os.environ.get("SUPABASE_SERVICE_KEY", os.environ.get("SUPABASE_KEY", ""))

if not url or not key:
    print("Missing keys")
    exit(1)

client = create_client(url, key)
try:
    res = client.table("orders").select("*, delivery_slots(jadwal_teks)").eq("id_po", 4).execute()
    print("SUCCESS")
    print(res.data)
except Exception as e:
    print("ERROR")
    print(e)
