import { createRequire } from 'module';
import * as fs from 'fs';
import * as path from 'path';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx') as typeof import('xlsx');

// Types
export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  stock: number;
  imageUrl: string;
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

const DB_FILE = path.join(process.cwd(), 'ecommerce_db.xlsx');

// Default Seed Data
const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'P101',
    name: 'Wireless Noise-Canceling Headphones',
    category: 'Electronics',
    price: 199.99,
    description: 'Premium over-ear wireless headphones with active noise cancellation and 30-hour battery life.',
    stock: 45,
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80'
  },
  {
    id: 'P102',
    name: 'Minimalist Leather Backpack',
    category: 'Fashion',
    price: 79.50,
    description: 'Durable and water-resistant laptop backpack crafted from genuine full-grain leather.',
    stock: 25,
    imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&q=80'
  },
  {
    id: 'P103',
    name: 'Ergonomic Mechanical Keyboard',
    category: 'Electronics',
    price: 129.00,
    description: 'Hot-swappable mechanical keyboard with RGB backlighting, brown switches, and wireless capability.',
    stock: 30,
    imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500&q=80'
  },
  {
    id: 'P104',
    name: 'Smart Fitness Watch',
    category: 'Electronics',
    price: 149.99,
    description: 'Waterproof fitness smartwatch with advanced heart rate monitor, blood oxygen tracker, and sleep analyzer.',
    stock: 60,
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80'
  },
  {
    id: 'P105',
    name: 'Insulated Stainless Steel Bottle',
    category: 'Home & Kitchen',
    price: 24.99,
    description: 'Double-wall vacuum-insulated water bottle keeping drinks cold for 24 hours or hot for 12 hours.',
    stock: 100,
    imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500&q=80'
  },
  {
    id: 'P106',
    name: 'Professional Chef Knife',
    category: 'Home & Kitchen',
    price: 89.00,
    description: '8-inch professional kitchen chef knife, forged from high-carbon German steel with ergonomic handle.',
    stock: 15,
    imageUrl: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500&q=80'
  },
  {
    id: 'P107',
    name: 'Premium Eco-Friendly Yoga Mat',
    category: 'Fitness',
    price: 39.99,
    description: 'Extra thick, non-slip, eco-friendly TPE yoga mat with alignment lines and carrying strap.',
    stock: 50,
    imageUrl: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=500&q=80'
  },
  {
    id: 'P108',
    name: 'The Productivity Habit (Hardcover)',
    category: 'Books',
    price: 14.95,
    description: 'A best-selling guide detailing high-impact daily behaviors to unlock peak focus and time management.',
    stock: 120,
    imageUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500&q=80'
  }
];

const DEFAULT_CART: CartItem[] = [];

/**
 * Initializes the Excel file with seed data if it does not exist.
 */
export function ensureDatabaseExists(): void {
  if (!fs.existsSync(DB_FILE)) {
    console.log(`Database Excel file not found. Creating a new one at ${DB_FILE}...`);
    saveAllToExcel(DEFAULT_PRODUCTS, DEFAULT_CART);
  }
}

/**
 * Saves both Products and Cart to the Excel workbook.
 */
function saveAllToExcel(products: Product[], cart: CartItem[]): void {
  try {
    const wb = XLSX.utils.book_new();

    // Map data to sheet format
    const wsProducts = XLSX.utils.json_to_sheet(products);
    const wsCart = XLSX.utils.json_to_sheet(cart);

    XLSX.utils.book_append_sheet(wb, wsProducts, 'Products');
    XLSX.utils.book_append_sheet(wb, wsCart, 'Cart');

    XLSX.writeFile(wb, DB_FILE);
  } catch (error) {
    console.error('Failed to write database.xlsx file:', error);
  }
}

/**
 * Reads products from the Excel sheet.
 */
export function getProducts(): Product[] {
  ensureDatabaseExists();
  try {
    const wb = XLSX.readFile(DB_FILE);
    const sheet = wb.Sheets['Products'];
    if (!sheet) return [];

    const rawData = XLSX.utils.sheet_to_json(sheet) as any[];
    return rawData.map(item => ({
      id: String(item.id || ''),
      name: String(item.name || ''),
      category: String(item.category || ''),
      price: Number(item.price || 0),
      description: String(item.description || ''),
      stock: Number(item.stock || 0),
      imageUrl: String(item.imageUrl || '')
    }));
  } catch (error) {
    console.error('Error reading products from Excel:', error);
    return [];
  }
}

/**
 * Saves products to the Excel sheet while keeping cart data.
 */
export function saveProducts(products: Product[]): void {
  const currentCart = getCart();
  saveAllToExcel(products, currentCart);
}

/**
 * Reads cart items from the Excel sheet.
 */
export function getCart(): CartItem[] {
  ensureDatabaseExists();
  try {
    const wb = XLSX.readFile(DB_FILE);
    const sheet = wb.Sheets['Cart'];
    if (!sheet) return [];

    const rawData = XLSX.utils.sheet_to_json(sheet) as any[];
    return rawData.map(item => ({
      productId: String(item.productId || ''),
      name: String(item.name || ''),
      price: Number(item.price || 0),
      quantity: Number(item.quantity || 0),
      imageUrl: String(item.imageUrl || '')
    }));
  } catch (error) {
    console.error('Error reading cart from Excel:', error);
    return [];
  }
}

/**
 * Saves cart to the Excel sheet while keeping products.
 */
export function saveCart(cart: CartItem[]): void {
  const currentProducts = getProducts();
  saveAllToExcel(currentProducts, cart);
}

/**
 * Resets the entire Excel workbook to defaults.
 */
export function resetDatabase(): void {
  saveAllToExcel(DEFAULT_PRODUCTS, DEFAULT_CART);
}

/**
 * Gets info about the database file.
 */
export function getDatabaseMeta() {
  try {
    const stats = fs.statSync(DB_FILE);
    return {
      filePath: DB_FILE,
      fileName: 'ecommerce_db.xlsx',
      fileSize: `${(stats.size / 1024).toFixed(2)} KB`,
      lastModified: stats.mtime,
      exists: true,
    };
  } catch (error) {
    return {
      filePath: DB_FILE,
      fileName: 'ecommerce_db.xlsx',
      fileSize: '0 KB',
      lastModified: new Date(),
      exists: false,
    };
  }
}
