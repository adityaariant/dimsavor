FREE_AREA_TAGS = {'Gunung Anyar', 'Rungkut'}
ITS_AREA_TAG   = 'ITS'

def calculate_ongkir(area_tag: str, slot: dict | None) -> tuple[int, str]:
    """
    Returns (ongkir_amount, rule_label).
    Rule labels: 'Area', 'Slot', 'Flat'
    """
    if area_tag in FREE_AREA_TAGS:
        return (0, 'Area')
    if area_tag == ITS_AREA_TAG and slot and slot.get('is_free_ongkir'):
        return (0, 'Slot')
    return (2000, 'Flat')
