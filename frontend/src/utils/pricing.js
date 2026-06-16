export const MENU_PRICES = {
  "Dimsum Original": 16000,
  "Dimsum Mentai 6pcs": 19000,
  "Dimsum Mentai 4pcs": 15000,
  "Bacar Kecil 120ml": 8000,
  "Bacar Besar 150ml": 10000,
  "BSweet": 27000,
  "BAdil": 27000
};

export const TOPPING_PRICE = 1000;

export function calculateSubtotal(nama_produk, qty, topping) {
  const basePrice = MENU_PRICES[nama_produk] || 0;
  let toppingPrice = 0;
  
  if (topping) {
    toppingPrice = TOPPING_PRICE; // default 1000
    
    // Check for custom prices in topping string, e.g., "Oreo 2k", "+2000", "Regal 3k"
    const matchK = topping.match(/(\d+(?:\.\d+)?)k/i);
    if (matchK) {
      toppingPrice = parseFloat(matchK[1]) * 1000;
    } else {
      const matchNum = topping.match(/\+?(\d{3,})/);
      if (matchNum) {
        toppingPrice = parseInt(matchNum[1], 10);
      }
    }
  }
  
  return (basePrice + toppingPrice) * qty;
}

export function countDimsumBoxes(items) {
  let total_boxes = 0;
  let total_pcs = 0;

  for (const item of items) {
    const name = item.nama_produk || '';
    const qty = item.qty || 1;
    const lower = name.toLowerCase();

    if (name === 'BAdil') {
      total_boxes += qty; // BAdil contains 1 box of dimsum
    } else if (name === 'BSweet') {
      // BSweet is Bacar only, 0 boxes of dimsum
    } else if (lower === 'dimsum original' || lower === 'dimsum mentai 6pcs' || lower === 'dimsum mentai 4pcs') {
      total_boxes += qty;
    } else if (lower.includes('original') || lower.includes('mentai') || lower.includes('ori')) {
      // Custom pieces
      total_pcs += qty;
    }
  }

  return total_boxes + Math.floor(total_pcs / 6);
}

export function countDimsumBoxesDecomposed(decomposedItems) {
  let total_boxes = 0;
  let total_pcs = 0;

  for (const item of decomposedItems) {
    const name = item.nama_produk || '';
    const qty = item.qty || 0;
    const lower = name.toLowerCase();

    if (lower === 'dimsum original' || lower === 'dimsum mentai 6pcs' || lower === 'dimsum mentai 4pcs') {
      total_boxes += qty;
    } else if (lower.includes('original') || lower.includes('mentai') || lower.includes('ori')) {
      total_pcs += qty;
    }
  }

  return total_boxes + Math.floor(total_pcs / 6);
}

export function calculateProductionSummary(decomposedItems) {
  let box_mentai = 0;
  let box_ori = 0;
  let box_mix = 0;
  let pcs_mentai = 0;
  let pcs_ori = 0;
  let cup_bb = 0;
  let cup_bk = 0;

  for (const item of decomposedItems) {
    const name = item.nama_produk || '';
    const qty = item.qty || 0;
    const lowerName = name.toLowerCase();
    const sourceBundle = item.source_bundle || '';

    if (sourceBundle === 'BAdil') {
      if (lowerName.includes('bacar besar')) {
        box_mix += qty;
        cup_bb += qty;
      } else if (lowerName.includes('original')) {
        pcs_ori += qty;
      } else if (lowerName.includes('mentai')) {
        pcs_mentai += qty;
      }
    } else if (sourceBundle === 'BSweet') {
      if (lowerName.includes('bacar besar')) {
        cup_bb += qty;
      }
    } else {
      if (lowerName === 'dimsum mentai 6pcs' || (lowerName.includes('mentai') && lowerName.includes('6pcs'))) {
        box_mentai += qty;
        pcs_mentai += qty * 6;
      } else if (lowerName === 'dimsum mentai 4pcs' || (lowerName.includes('mentai') && lowerName.includes('4pcs'))) {
        box_mentai += qty;
        pcs_mentai += qty * 4;
      } else if (lowerName === 'dimsum original' || (lowerName.includes('original') && !lowerName.includes('pcs') && !lowerName.includes('('))) {
        box_ori += qty;
        pcs_ori += qty * 6;
      } else if (lowerName.includes('bacar besar') || lowerName.includes('bb')) {
        cup_bb += qty;
      } else if (lowerName.includes('bacar kecil') || lowerName.includes('bk')) {
        cup_bk += qty;
      } else {
        if (lowerName.includes('mentai')) {
          pcs_mentai += qty;
        } else if (lowerName.includes('original') || lowerName.includes('ori')) {
          pcs_ori += qty;
        }
      }
    }
  }

  return {
    box_mentai,
    box_ori,
    box_mix,
    pcs_mentai,
    pcs_ori,
    cup_bb,
    cup_bk
  };
}

