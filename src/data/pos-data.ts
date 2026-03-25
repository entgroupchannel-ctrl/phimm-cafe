export const menuItems = [
  { id: 1,  name: "ข้าวผัดกุ้ง",     price: 89,  cat: "อาหารจานเดียว", img: "🍛", popular: true  },
  { id: 2,  name: "ต้มยำกุ้ง",       price: 159, cat: "อาหารจานเดียว", img: "🍲", popular: true  },
  { id: 3,  name: "ส้มตำ",           price: 69,  cat: "อาหารจานเดียว", img: "🥗", popular: false },
  { id: 4,  name: "ผัดไทย",          price: 79,  cat: "อาหารจานเดียว", img: "🍜", popular: true  },
  { id: 5,  name: "แกงเขียวหวาน",    price: 99,  cat: "อาหารจานเดียว", img: "🍛", popular: false },
  { id: 6,  name: "ข้าวมันไก่",      price: 65,  cat: "อาหารจานเดียว", img: "🍗", popular: true  },
  { id: 7,  name: "ชาเย็น",          price: 45,  cat: "เครื่องดื่ม",   img: "🧋", popular: true  },
  { id: 8,  name: "กาแฟเย็น",        price: 55,  cat: "เครื่องดื่ม",   img: "☕", popular: false },
  { id: 9,  name: "น้ำมะนาว",        price: 35,  cat: "เครื่องดื่ม",   img: "🍋", popular: false },
  { id: 10, name: "ข้าวเหนียวมะม่วง", price: 89,  cat: "ของหวาน",      img: "🥭", popular: true  },
  { id: 11, name: "ไอศกรีมกะทิ",     price: 49,  cat: "ของหวาน",      img: "🍨", popular: false },
  { id: 12, name: "บัวลอย",          price: 45,  cat: "ของหวาน",      img: "🍡", popular: false },
];

export type MenuItem = typeof menuItems[number];

export const kdsOrders = [
  { id: "#0247", table: "T3", items: ["ต้มยำกุ้ง x1", "ผัดไทย x2"],        time: "2 นาที", status: "cooking",  delivery: false },
  { id: "#0248", table: "T7", items: ["ข้าวผัดกุ้ง x1", "ชาเย็น x2"],      time: "5 นาที", status: "cooking",  delivery: false },
  { id: "#0249", table: "D1", items: ["ข้าวมันไก่ x3", "ส้มตำ x1"],        time: "1 นาที", status: "new",      delivery: true  },
  { id: "#0250", table: "T1", items: ["แกงเขียวหวาน x2"],                   time: "8 นาที", status: "ready",    delivery: false },
];

export const stockItems = [
  { name: "กุ้ง",       qty: 2.1, unit: "kg",    min: 3,  status: "low"      },
  { name: "ไข่ไก่",    qty: 48,  unit: "ฟอง",   min: 30, status: "ok"       },
  { name: "น้ำมันพืช", qty: 1,   unit: "ขวด",   min: 2,  status: "low"      },
  { name: "ข้าวสาร",   qty: 15,  unit: "kg",    min: 5,  status: "ok"       },
  { name: "เส้นผัดไทย", qty: 8,  unit: "kg",    min: 3,  status: "ok"       },
  { name: "กะทิ",       qty: 0.5, unit: "ลิตร", min: 2,  status: "critical" },
  { name: "พริก",       qty: 3,   unit: "kg",    min: 1,  status: "ok"       },
  { name: "มะนาว",      qty: 12,  unit: "ลูก",  min: 20, status: "low"      },
];
