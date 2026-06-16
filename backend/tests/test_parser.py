import unittest
from app.parser import WaOrderParser

class TestParser(unittest.TestCase):
    def setUp(self):
        self.alias_map = {
            'dimsum': {'nama_produk_baku': 'Dimsum Original', 'kitchen_code': 'O'},
            'mentai': {'nama_produk_baku': 'Dimsum Mentai 6pcs', 'kitchen_code': 'M6'},
            'bk': {'nama_produk_baku': 'Bacar Kecil 120ml', 'kitchen_code': 'bk'},
            'badil': {'nama_produk_baku': 'BAdil', 'kitchen_code': 'BD'}
        }
        self.area_keywords = {
            'tekkim': 'ITS',
            'gunung anyar': 'Gunung Anyar',
            'rungkut': 'Rungkut'
        }
        self.active_slots = [
            {'id_slot': 1, 'jadwal_teks': 'Senin 10.00', 'is_free_ongkir': True},
            {'id_slot': 2, 'jadwal_teks': 'Selasa 12.00', 'is_free_ongkir': False}
        ]
        self.parser = WaOrderParser(self.alias_map, self.area_keywords, self.active_slots)

    def test_normal_wa_text_and_free_slot(self):
        raw_text = """
Nama: Adit
Pesanan: 2 dimsum, 1 bk topping regal
Alamat: Tekkim ITS
Bayar: QRIS
Waktu: Senin 10.00
"""
        result = self.parser.parse(raw_text)
        self.assertEqual(result['nama_pelanggan'], 'Adit')
        self.assertEqual(result['area_tag'], 'ITS')
        self.assertEqual(result['matched_slot']['id_slot'], 1)
        self.assertEqual(result['ongkir'], 0)
        self.assertEqual(result['ongkir_rule'], 'Slot')
        self.assertEqual(len(result['items']), 2)
        
        item1 = result['items'][0]
        self.assertEqual(item1['nama_produk'], 'Dimsum Original')
        self.assertEqual(item1['qty'], 2)
        
        item2 = result['items'][1]
        self.assertEqual(item2['nama_produk'], 'Bacar Kecil 120ml')
        self.assertEqual(item2['qty'], 1)
        self.assertEqual(item2['topping'], 'Regal')
        self.assertEqual(item2['subtotal'], 9000) # 8000 + 1000

    def test_slang_inputs_and_flat_ongkir(self):
        raw_text = """
Nama: Kila
Pesanan: x2 badil
Alamat: Mulyosari
Waktu: Selasa 12.00
"""
        result = self.parser.parse(raw_text)
        self.assertEqual(result['area_tag'], 'Lainnya')
        self.assertEqual(result['matched_slot']['id_slot'], 2)
        self.assertEqual(result['ongkir'], 2000)
        self.assertEqual(result['ongkir_rule'], 'Flat')
        self.assertEqual(result['items'][0]['nama_produk'], 'BAdil')
        self.assertEqual(result['items'][0]['qty'], 2)

    def test_missing_fields_and_unmatched_product(self):
        raw_text = """
Pesanan: 1 produkaneh
"""
        result = self.parser.parse(raw_text)
        self.assertEqual(result['nama_pelanggan'], '')
        self.assertIsNone(result['matched_slot'])
        self.assertEqual(result['ongkir'], 2000)
        self.assertTrue(result['items'][0]['_unmatched'])
        self.assertEqual(result['unmatched_tokens'][0], '1 produkaneh')
        
    def test_priority_1_ongkir(self):
        raw_text = """
Alamat: Gunung anyar utara
"""
        result = self.parser.parse(raw_text)
        self.assertEqual(result['area_tag'], 'Gunung Anyar')
        self.assertEqual(result['ongkir'], 0)
        self.assertEqual(result['ongkir_rule'], 'Area')

if __name__ == '__main__':
    unittest.main()
