import os
import sys
import pytest
from fastapi.testclient import TestClient

# Add parent directory to path so 'app' and 'main' can be imported
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from app.database import get_db

client = TestClient(app)

def test_full_lifecycle():
    print("0. Cleaning up any previous active sessions...")
    try:
        db = get_db()
        db.table("po_sessions").update({"status": "Closed"}).eq("status", "Active").execute()
    except Exception as e:
        print(f"Cleanup failed, continuing: {e}")

    print("1. Create a PO session...")
    res_session = client.post("/sessions/", json={
        "tanggal_buka": "2026-06-16",
        "tanggal_tutup": "2026-06-18",
        "kuota_maksimal": 50
    })
    assert res_session.status_code == 200, res_session.text
    session_data = res_session.json()
    id_po = session_data["id_po"]

    print("2. Add two delivery slots (one free, one paid ongkir)...")
    res_slot1 = client.post(f"/sessions/{id_po}/slots", json={
        "jadwal_teks": "Jumat Sore - FREE",
        "kapasitas": 20,
        "is_free_ongkir": True
    })
    assert res_slot1.status_code == 200, res_slot1.text
    slot1_id = res_slot1.json()["id_slot"]
    slot1_teks = res_slot1.json()["jadwal_teks"]

    res_slot2 = client.post(f"/sessions/{id_po}/slots", json={
        "jadwal_teks": "Sabtu Pagi - BERBAYAR",
        "kapasitas": 20,
        "is_free_ongkir": False
    })
    assert res_slot2.status_code == 200

    print("3. POST to /parse with a sample WA text...")
    wa_text = f"""
    Pesanan: 1 BAdil, 1 Dimsum Mentai
    Alamat: its
    Waktu: {slot1_teks}
    """
    
    res_parse = client.post("/parse", json={
        "raw_text": wa_text,
        "id_po": id_po
    })
    assert res_parse.status_code == 200, res_parse.text
    parsed_data = res_parse.json()
    
    print("4. Assert parsed ongkir = 0 and rule = 'Slot'...")
    assert parsed_data["ongkir"] == 0, f"Expected 0, got {parsed_data['ongkir']}"
    assert parsed_data["ongkir_rule"] == "Slot", f"Expected 'Slot', got {parsed_data['ongkir_rule']}"
    
    print("5. Confirm the order via POST /orders...")
    res_order = client.post("/orders/", json={
        "id_po": id_po,
        "nama_pelanggan": "Smoke Tester",
        "alamat": "its",
        "area_tag": parsed_data.get("area_tag", "ITS"),
        "id_slot": slot1_id,
        "metode_bayar": "QRIS",
        "ongkir": parsed_data["ongkir"],
        "ongkir_rule": parsed_data["ongkir_rule"],
        "items": [
            {
                "nama_produk": "BAdil",
                "qty": 1,
                "is_bundle": True,
                "subtotal": 55000
            }
        ]
    })
    assert res_order.status_code == 200, res_order.text
    id_order = res_order.json()["id_order"]

    print("6. Toggle to PAID via PATCH /orders/{id}/pay...")
    res_pay = client.patch(f"/orders/{id_order}/pay")
    assert res_pay.status_code == 200

    print("7. Add one expense...")
    res_expense = client.post("/expenses", json={
        "id_po": id_po,
        "nama_bahan": "Tepung",
        "nominal": 20000,
        "dibayar_oleh": "Adit"
    })
    assert res_expense.status_code == 200

    print("8. GET /finance/preview and assert Adit and Kila amounts are non-zero...")
    res_finance = client.get(f"/finance/preview?session_id={id_po}")
    assert res_finance.status_code == 200
    finance_data = res_finance.json()
    assert finance_data["adit_receives"] > 0, "Adit receives should be > 0"
    assert finance_data["kila_receives"] > 0, "Kila receives should be > 0"

    print("9. POST /finance/close and assert session status = Closed...")
    res_close = client.post(f"/finance/close?session_id={id_po}")
    assert res_close.status_code == 200
    assert res_close.json()["session"]["status"] == "Closed"

    print("\n✅ Smoke test passed successfully! Full lifecycle works perfectly.")

if __name__ == "__main__":
    test_full_lifecycle()
