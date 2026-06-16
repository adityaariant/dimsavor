import re

class WaOrderParser:
    def __init__(self, alias_map: dict[str, dict], area_keywords: dict[str, str], active_slots: list[dict]):
        """
        alias_map: {kata_kunci: {'nama_produk_baku': str, 'kitchen_code': str}}
        area_keywords: {keyword: area_tag}
        active_slots: [{'id_slot': int, 'jadwal_teks': str, 'is_free_ongkir': bool}]
        """
        self.alias_map = {k.lower(): v for k, v in alias_map.items()}
        self.area_keywords = {k.lower(): v for k, v in area_keywords.items()}
        self.active_slots = active_slots

    def parse(self, raw_text: str) -> dict:
        fields = self._split_fields(raw_text)
        tokens = self._tokenize_pesanan(fields.get('pesanan', ''))
        items, unmatched_tokens = self._match_items(tokens)
        area = self._detect_area(fields.get('alamat', ''))
        slot = self._match_slot(fields.get('waktu', ''))
        ongkir, rule = self._calc_ongkir(area, slot)
        
        return self._build_review_form(fields, items, area, slot, ongkir, rule, unmatched_tokens)

    def _split_fields(self, raw_text: str) -> dict:
        fields = {}
        current_key = None
        current_val = []
        
        for line in raw_text.strip().split('\n'):
            line_str = line.strip()
            if not line_str:
                continue
            
            match = re.match(r'^(Nama|Pesanan|Alamat|Bayar|Waktu)\s*[:\-]\s*(.*)', line_str, re.IGNORECASE)
            if match:
                if current_key:
                    fields[current_key] = '\n'.join(current_val).strip()
                current_key = match.group(1).lower()
                current_val = [match.group(2).strip()]
            elif current_key:
                current_val.append(line_str)
                
        if current_key:
            fields[current_key] = '\n'.join(current_val).strip()
            
        return fields

    def _tokenize_pesanan(self, pesanan_text: str) -> list[str]:
        tokens = re.split(r'[,\n]', pesanan_text)
        return [t.strip() for t in tokens if t.strip()]

    def _match_items(self, tokens: list[str]) -> tuple[list[dict], list[str]]:
        items = []
        unmatched_tokens = []
        
        for token in tokens:
            lower_token = token.lower()
            
            qty = 1
            qty_match = re.search(r'(?:x\s*)?(\d+)\s*(?:pcs|box|x)?', lower_token)
            if qty_match:
                qty = int(qty_match.group(1))
                lower_token = lower_token.replace(qty_match.group(0), '').strip()
            
            topping = None
            if 'regal' in lower_token:
                topping = 'Regal'
                lower_token = lower_token.replace('regal', '').replace('topping', '').strip()
            elif 'oreo' in lower_token:
                topping = 'Oreo'
                lower_token = lower_token.replace('oreo', '').replace('topping', '').strip()
            
            matched = False
            for keyword, data in self.alias_map.items():
                if keyword in lower_token:
                    price = self._get_price(data['nama_produk_baku'])
                    subtotal = qty * price
                    if topping:
                        subtotal += qty * 1000
                        
                    items.append({
                        'nama_produk': data['nama_produk_baku'],
                        'qty': qty,
                        'topping': topping,
                        'subtotal': subtotal,
                        '_unmatched': False
                    })
                    matched = True
                    break
            
            if not matched:
                items.append({
                    'nama_produk': token,
                    'qty': qty,
                    'topping': topping,
                    'subtotal': 0,
                    '_unmatched': True
                })
                unmatched_tokens.append(token)
                
        return items, unmatched_tokens

    def _get_price(self, product_name: str) -> int:
        prices = {
            'Dimsum Original': 15000,
            'Dimsum Mentai 6pcs': 24000, # inference based on ratio
            'Dimsum Mentai 4pcs': 16000,
            'Bacar Kecil 120ml': 16000, # Bacar 4pcs
            'Bacar Besar 150ml': 24000, # Bacar 6pcs
            'BSweet': 35000,
            'BAdil': 55000
        }
        return prices.get(product_name, 0)

    def _detect_area(self, alamat: str) -> str:
        lower_alamat = alamat.lower()
        for keyword, area_tag in self.area_keywords.items():
            if keyword in lower_alamat:
                return area_tag
        return "Lainnya"

    def _match_slot(self, waktu_text: str) -> dict | None:
        if not waktu_text:
            return None
        lower_waktu = waktu_text.lower()
        for slot in self.active_slots:
            if lower_waktu in slot['jadwal_teks'].lower() or slot['jadwal_teks'].lower() in lower_waktu:
                return slot
        return None

    def _calc_ongkir(self, area: str, slot: dict | None) -> tuple[int, str]:
        if area in ['Gunung Anyar', 'Rungkut']:
            return 0, 'Area'
        if area == 'ITS' and slot and slot.get('is_free_ongkir', False):
            return 0, 'Slot'
        return 2000, 'Flat'

    def _build_review_form(self, fields: dict, items: list[dict], area: str, slot: dict | None, ongkir: int, rule: str, unmatched_tokens: list[str]) -> dict:
        total = sum(i['subtotal'] for i in items if not i['_unmatched']) + ongkir
        
        quota_impact = 0
        for item in items:
            if not item['_unmatched']:
                name = item['nama_produk']
                if name in ['Dimsum Original', 'Dimsum Mentai 6pcs', 'Dimsum Mentai 4pcs', 'BAdil']:
                    quota_impact += item['qty']
        
        return {
            'nama_pelanggan': fields.get('nama', ''),
            'alamat': fields.get('alamat', ''),
            'area_tag': area,
            'jadwal_kirim_request': fields.get('waktu', ''),
            'matched_slot': slot,
            'metode_bayar': fields.get('bayar', ''),
            'ongkir': ongkir,
            'ongkir_rule': rule,
            'items': items,
            'total': total,
            'quota_impact': quota_impact,
            'unmatched_tokens': unmatched_tokens
        }
