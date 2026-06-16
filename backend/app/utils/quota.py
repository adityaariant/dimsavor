from app.utils.decomposer import decompose_items

def count_dimsum_boxes(items: list[dict], bundle_map: dict) -> int:
    """
    Counts quota units from a list of order items.
    Handles standard boxes and partial pieces from decomposed bundles.
    """
    decomposed_items = decompose_items(items, bundle_map)
    
    total_boxes = 0
    total_pcs = 0
    
    for item in decomposed_items:
        name = item['nama_produk']
        qty = item['qty']
        
        # Standard products (qty represents portions/boxes)
        # Note: Admin confirmed Dimsum Mentai 4pcs consumes 1 full box
        if name in ['Dimsum Original', 'Dimsum Mentai 6pcs', 'Dimsum Mentai 4pcs']:
            total_boxes += qty
            
        # Decomposed pieces from bundles (qty represents individual pieces)
        elif name in ['Dimsum Original (pcs)', 'Dimsum Mentai (pcs)']:
            total_pcs += qty
            
    # Add pieces divided by 6
    total_boxes += (total_pcs // 6)
    
    return total_boxes
