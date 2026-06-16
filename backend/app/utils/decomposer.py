def decompose_items(
    items: list[dict],
    bundle_map: dict[str, list[dict]]  # {bundle_name: [{'nama_produk_komponen', 'qty_komponen'}]}
) -> list[dict]:
    """
    Expands bundle items into constituent components.
    Used ONLY for kitchen board and quota calculation.
    Original order_items rows are NOT modified.
    """
    result = []
    for item in items:
        # Check if the item is a bundle and exists in the bundle map
        is_bundle = item.get('is_bundle', False)
        # Sometimes is_bundle might not be explicitly passed, so we check if it's in bundle_map anyway
        if (is_bundle or item.get('nama_produk') in bundle_map) and item.get('nama_produk') in bundle_map:
            for component in bundle_map[item['nama_produk']]:
                result.append({
                    'nama_produk': component['nama_produk_komponen'],
                    'qty': component['qty_komponen'] * item['qty'],
                    'topping': item.get('topping'),
                    'source_order_id': item.get('id_order'),
                    'source_bundle': item['nama_produk']
                })
        else:
            result.append(item)
    return result
