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
  let count = 0;
  for (const item of items) {
    const name = item.nama_produk || '';
    const qty = item.qty || 1;
    if (name.includes('Dimsum') || name.includes('Bacar')) {
      count += qty;
    } else if (name === 'BSweet') {
      count += 2 * qty;
    } else if (name === 'BAdil') {
      count += 3 * qty;
    }
  }
  return count;
}
