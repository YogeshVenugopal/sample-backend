import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import {
  ensureDatabaseExists,
  getProducts,
  saveProducts,
  getCart,
  saveCart,
  resetDatabase,
  getDatabaseMeta,
  Product,
  CartItem
} from './db';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize DB Excel file if not present
  ensureDatabaseExists();

  // Middleware
  app.use(express.json());

  // Log requests for diagnostic purposes (great for verifying Postman/UI calls)
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // CORS headers for testing from anywhere
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // ==========================================
  // PRODUCTS API ENDPOINTS
  // ==========================================

  // GET /api/products - Get all products (supports query parameters for filtering)
  app.get('/api/products', (req: Request, res: Response) => {
    try {
      let products = getProducts();
      const { category, search, minPrice, maxPrice, inStock } = req.query;

      // Filter by category
      if (category && typeof category === 'string' && category !== 'All') {
        products = products.filter(p => p.category.toLowerCase() === category.toLowerCase());
      }

      // Filter by search text (name / description)
      if (search && typeof search === 'string' && search.trim() !== '') {
        const query = search.toLowerCase();
        products = products.filter(p =>
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query)
        );
      }

      // Filter by min price
      if (minPrice) {
        const min = parseFloat(minPrice as string);
        if (!isNaN(min)) {
          products = products.filter(p => p.price >= min);
        }
      }

      // Filter by max price
      if (maxPrice) {
        const max = parseFloat(maxPrice as string);
        if (!isNaN(max)) {
          products = products.filter(p => p.price <= max);
        }
      }

      // Filter by stock availability
      if (inStock === 'true') {
        products = products.filter(p => p.stock > 0);
      }

      res.json({
        success: true,
        count: products.length,
        data: products
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/products/stats - Get database and product statistics
  app.get('/api/products/stats', (req: Request, res: Response) => {
    try {
      const products = getProducts();
      const totalProducts = products.length;

      const categories = [...new Set(products.map(p => p.category))];
      const totalStock = products.reduce((acc, p) => acc + p.stock, 0);
      const totalValue = products.reduce((acc, p) => acc + (p.price * p.stock), 0);
      const avgPrice = totalProducts > 0
        ? products.reduce((acc, p) => acc + p.price, 0) / totalProducts
        : 0;

      res.json({
        success: true,
        stats: {
          totalProducts,
          categoriesCount: categories.length,
          categoriesList: categories,
          totalStockCount: totalStock,
          totalInventoryValue: parseFloat(totalValue.toFixed(2)),
          averageProductPrice: parseFloat(avgPrice.toFixed(2))
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/products/:id - Get a specific product by ID
  app.get('/api/products/:id', (req: Request, res: Response) => {
    try {
      const products = getProducts();
      const product = products.find(p => p.id === req.params.id);

      if (!product) {
        return res.status(404).json({ success: false, message: `Product with ID ${req.params.id} not found.` });
      }

      res.json({ success: true, data: product });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/products - Create a new product (no authentication required)
  app.post('/api/products', (req: Request, res: Response) => {
    try {
      const { id, name, category, price, description, stock, imageUrl } = req.body;

      if (!id || !name || !category || price === undefined || stock === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Missing required product fields: id, name, category, price, stock.'
        });
      }

      const products = getProducts();

      // Check if product with ID already exists
      if (products.some(p => p.id === id)) {
        return res.status(400).json({
          success: false,
          message: `Product with ID ${id} already exists. Please choose a unique ID.`
        });
      }

      const newProduct: Product = {
        id,
        name,
        category,
        price: parseFloat(price),
        description: description || '',
        stock: parseInt(stock),
        imageUrl: imageUrl || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=500'
      };

      products.push(newProduct);
      saveProducts(products);

      res.status(201).json({
        success: true,
        message: 'Product created successfully in the Excel database.',
        data: newProduct
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // PUT /api/products/:id - Update an existing product
  app.put('/api/products/:id', (req: Request, res: Response) => {
    try {
      const products = getProducts();
      const index = products.findIndex(p => p.id === req.params.id);

      if (index === -1) {
        return res.status(404).json({ success: false, message: `Product with ID ${req.params.id} not found.` });
      }

      const { name, category, price, description, stock, imageUrl } = req.body;
      const updatedProduct = {
        ...products[index],
        ...(name !== undefined && { name }),
        ...(category !== undefined && { category }),
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(description !== undefined && { description }),
        ...(stock !== undefined && { stock: parseInt(stock) }),
        ...(imageUrl !== undefined && { imageUrl })
      };

      products[index] = updatedProduct;
      saveProducts(products);

      res.json({
        success: true,
        message: 'Product updated successfully in the Excel database.',
        data: updatedProduct
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // DELETE /api/products/:id - Delete a product
  app.delete('/api/products/:id', (req: Request, res: Response) => {
    try {
      const products = getProducts();
      const filtered = products.filter(p => p.id !== req.params.id);

      if (products.length === filtered.length) {
        return res.status(404).json({ success: false, message: `Product with ID ${req.params.id} not found.` });
      }

      saveProducts(filtered);
      res.json({
        success: true,
        message: `Product with ID ${req.params.id} deleted successfully from the Excel database.`
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });


  // ==========================================
  // CART MANAGEMENT API ENDPOINTS
  // ==========================================

  // GET /api/cart - View cart and pricing breakdown
  app.get('/api/cart', (req: Request, res: Response) => {
    try {
      const cart = getCart();

      const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
      const shipping = subtotal > 100 || subtotal === 0 ? 0 : 9.99;
      const tax = parseFloat((subtotal * 0.08).toFixed(2)); // 8% sales tax
      const total = parseFloat((subtotal + shipping + tax).toFixed(2));

      res.json({
        success: true,
        count: cart.reduce((acc, item) => acc + item.quantity, 0),
        data: cart,
        summary: {
          subtotal: parseFloat(subtotal.toFixed(2)),
          shipping,
          tax,
          total
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/cart - Add product to cart or increment quantity
  app.post('/api/cart', (req: Request, res: Response) => {
    try {
      const { productId, quantity } = req.body;
      const qtyToAdd = parseInt(quantity || 1);

      if (!productId) {
        return res.status(400).json({ success: false, message: 'Missing productId in request body.' });
      }

      const products = getProducts();
      const product = products.find(p => p.id === productId);

      if (!product) {
        return res.status(404).json({ success: false, message: `Product with ID ${productId} does not exist.` });
      }

      const cart = getCart();
      const cartIndex = cart.findIndex(item => item.productId === productId);

      const currentQtyInCart = cartIndex !== -1 ? cart[cartIndex].quantity : 0;
      const totalTargetQty = currentQtyInCart + qtyToAdd;

      // Check stock availability
      if (product.stock < totalTargetQty) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock! Product has ${product.stock} available. Current quantity in cart is ${currentQtyInCart}.`
        });
      }

      if (cartIndex !== -1) {
        cart[cartIndex].quantity = totalTargetQty;
      } else {
        cart.push({
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: qtyToAdd,
          imageUrl: product.imageUrl
        });
      }

      saveCart(cart);

      res.json({
        success: true,
        message: `Product '${product.name}' added/updated in the cart inside Excel sheet database.`,
        data: cart
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // PUT /api/cart/:productId - Update cart quantity for a specific product
  app.put('/api/cart/:productId', (req: Request, res: Response) => {
    try {
      const { quantity } = req.body;
      if (quantity === undefined) {
        return res.status(400).json({ success: false, message: 'Missing quantity in request body.' });
      }

      const qty = parseInt(quantity);
      const { productId } = req.params;

      const products = getProducts();
      const product = products.find(p => p.id === productId);

      if (!product) {
        return res.status(404).json({ success: false, message: `Product with ID ${productId} does not exist.` });
      }

      let cart = getCart();
      const index = cart.findIndex(item => item.productId === productId);

      if (index === -1) {
        return res.status(404).json({ success: false, message: `Product ${productId} is not currently in the cart.` });
      }

      if (qty <= 0) {
        // Remove item if quantity is 0 or less
        cart = cart.filter(item => item.productId !== productId);
      } else {
        // Check stock availability
        if (product.stock < qty) {
          return res.status(400).json({
            success: false,
            message: `Cannot set quantity to ${qty}. Only ${product.stock} items are in stock.`
          });
        }
        cart[index].quantity = qty;
      }

      saveCart(cart);
      res.json({
        success: true,
        message: 'Cart item quantity updated successfully.',
        data: cart
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // DELETE /api/cart/:productId - Delete a product from the cart
  app.delete('/api/cart/:productId', (req: Request, res: Response) => {
    try {
      const { productId } = req.params;
      const cart = getCart();
      const filtered = cart.filter(item => item.productId !== productId);

      if (cart.length === filtered.length) {
        return res.status(404).json({ success: false, message: `Product ${productId} is not in the cart.` });
      }

      saveCart(filtered);
      res.json({
        success: true,
        message: 'Product removed from cart successfully.',
        data: filtered
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/cart/clear - Clear the entire cart
  app.post('/api/cart/clear', (req: Request, res: Response) => {
    try {
      saveCart([]);
      res.json({
        success: true,
        message: 'Cart cleared successfully in the Excel database.',
        data: []
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/cart/checkout - Process order, deduct inventory stocks, clear cart
  app.post('/api/cart/checkout', (req: Request, res: Response) => {
    try {
      const cart = getCart();
      if (cart.length === 0) {
        return res.status(400).json({ success: false, message: 'Your cart is empty. Cannot checkout.' });
      }

      const products = getProducts();

      // Verify all items are in stock first (all-or-nothing check)
      for (const item of cart) {
        const product = products.find(p => p.id === item.productId);
        if (!product) {
          return res.status(400).json({
            success: false,
            message: `Product ID ${item.productId} in your cart no longer exists in our products database.`
          });
        }
        if (product.stock < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Checkout failed! Product '${product.name}' is out of stock or has insufficient stock. Available: ${product.stock}, in cart: ${item.quantity}.`
          });
        }
      }

      // Deduct stocks
      const updatedProducts = products.map(p => {
        const cartItem = cart.find(item => item.productId === p.id);
        if (cartItem) {
          return {
            ...p,
            stock: p.stock - cartItem.quantity
          };
        }
        return p;
      });

      // Save updated products and empty cart
      saveProducts(updatedProducts);
      saveCart([]);

      // Generate a simple receipts
      const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
      const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
      const tax = parseFloat((subtotal * 0.08).toFixed(2));
      const shipping = subtotal > 100 ? 0 : 9.99;
      const total = parseFloat((subtotal + shipping + tax).toFixed(2));

      res.json({
        success: true,
        message: 'Order processed successfully. Inventory stocks deducted in Excel database!',
        orderSummary: {
          orderId,
          dateTime: new Date().toISOString(),
          items: cart,
          pricing: {
            subtotal,
            shipping,
            tax,
            total
          }
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });


  // ==========================================
  // EXCEL DATABASE FILES & RAW EXPORT ENDPOINTS
  // ==========================================

  // GET /api/database/raw - Returns raw products + cart rows + spreadsheet stats
  app.get('/api/database/raw', (req: Request, res: Response) => {
    try {
      const products = getProducts();
      const cart = getCart();
      const metadata = getDatabaseMeta();

      res.json({
        success: true,
        metadata,
        sheets: {
          Products: products,
          Cart: cart
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/database/reset - Reset the database file to factory state
  app.post('/api/database/reset', (req: Request, res: Response) => {
    try {
      resetDatabase();
      res.json({
        success: true,
        message: 'Database reset successfully to seed products!',
        data: {
          products: getProducts(),
          cart: getCart()
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/database/download - Downloads the raw Excel database spreadsheet file
  app.get('/api/database/download', (req: Request, res: Response) => {
    try {
      const meta = getDatabaseMeta();
      if (!fs.existsSync(meta.filePath)) {
        return res.status(404).json({ success: false, message: 'Excel database file does not exist.' });
      }
      res.download(meta.filePath, meta.fileName);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });


  // ==========================================
  // VITE DEV SERVER OR STATIC SERVING IN PRODUCTION
  // ==========================================

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`E-Commerce Excel Database Backend running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start full-stack server:', err);
});
