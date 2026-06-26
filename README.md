# 🛒 E-Commerce Excel Spreadsheet REST API Backend

A production-ready e-commerce RESTful API backend built with **Node.js, Express, and TypeScript**, using an **Excel Spreadsheet (.xlsx)** as the persistent storage database engine.

This backend features **no authentication barriers**, allowing you to test full functional flows (product queries, filters, cart management, inventory deduction, checkout, database operations) instantly using **Postman**, `curl`, or your favorite HTTP client.

---

## 🚀 Live Interactive REST Client & Spreadsheet Monitor
The application serves a built-in visual playground dashboard at the root URL:
- **Root URL / Host**: `http://localhost:3000` (or your active AI Studio deployment domain)
- This playground contains:
  1. A **built-in REST Client Playground** where you can trigger the endpoints instantly.
  2. A **Live Spreadsheet Monitor** showing the exact tabular row state of Sheet 1 (`Products`) and Sheet 2 (`Cart`) within `ecommerce_db.xlsx`.
  3. A **Live Server Traffic Logs Terminal** recording your active requests.
  4. A **Download button** to grab the actual, raw physical `ecommerce_db.xlsx` file currently being updated by your API calls!

---

## 📂 Database Schema (Excel Sheets Structure)
The persistent store `ecommerce_db.xlsx` contains two sheet tabs:

### 1. Tab Sheet: `Products`
Maps out the available warehouse product catalog with rows matching:
* `id` (String, Primary Key) - e.g., `"P101"`
* `name` (String) - e.g., `"Wireless Headphones"`
* `category` (String) - e.g., `"Electronics"`
* `price` (Number) - e.g., `199.99`
* `description` (String) - Detailed product text
* `stock` (Number) - Available inventory count
* `imageUrl` (String) - Product thumbnail image URL

### 2. Tab Sheet: `Cart`
Saves temporary active cart rows for shopping calculations:
* `productId` (String) - Foreign key reference to Products tab
* `name` (String) - Cached product name
* `price` (Number) - Cached single unit price
* `quantity` (Number) - Number of items ordered
* `imageUrl` (String) - Cached product thumbnail image URL

---

## 📡 REST API Endpoint Specifications

All endpoints return JSON responses. No token authorization header, cookies, or headers are required.

### 📦 1. Product Catalog Endpoints

#### `GET /api/products`
Fetch all products. Includes comprehensive database filtering capabilities.
* **Query Parameters (All Optional):**
  * `category` (String): Filter strictly by category name (e.g. `Electronics`, `Fashion`, `Home & Kitchen`).
  * `search` (String): Perform keyword matching on both the product's `name` and `description` (case-insensitive).
  * `minPrice` (Number): Filter products with price $\ge$ `minPrice`.
  * `maxPrice` (Number): Filter products with price $\le$ `maxPrice`.
  * `inStock` (`true`/`false`): Set to `true` to exclude out-of-stock items (`stock` is 0).
* **Sample URL with Filters:**
  `GET /api/products?category=Electronics&search=wireless&minPrice=50&maxPrice=300&inStock=true`
* **Response Code:** `200 OK`
* **Response Payload:**
  ```json
  {
    "success": true,
    "count": 1,
    "data": [
      {
        "id": "P101",
        "name": "Wireless Noise-Canceling Headphones",
        "category": "Electronics",
        "price": 199.99,
        "description": "Premium over-ear wireless headphones with active noise cancellation and 30-hour battery life.",
        "stock": 45,
        "imageUrl": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80"
      }
    ]
  }
  ```

#### `GET /api/products/stats`
Retrieves live global database insights, valuation, count, and active tags.
* **Response Code:** `200 OK`
* **Response Payload:**
  ```json
  {
    "success": true,
    "stats": {
      "totalProducts": 8,
      "categoriesCount": 5,
      "categoriesList": ["Electronics", "Fashion", "Home & Kitchen", "Fitness", "Books"],
      "totalStockCount": 445,
      "totalInventoryValue": 25740.35,
      "averageProductPrice": 90.93
    }
  }
  ```

#### `GET /api/products/:id`
Fetch a specific product record by its unique ID.
* **Path Parameter:** `id` (e.g. `P101`)
* **Response Code:** `200 OK` (or `404 Not Found` if missing)

#### `POST /api/products`
Appends a completely new product row onto the bottom of the Excel sheet.
* **Request Header:** `Content-Type: application/json`
* **Request Body Payload (Required):**
  ```json
  {
    "id": "P109",
    "name": "Ultra HD Pro Projector",
    "category": "Electronics",
    "price": 549.99,
    "stock": 12,
    "description": "Next-generation 4K short-throw projector.",
    "imageUrl": "https://images.unsplash.com/photo-1535016120720-40c646be5580?w=500&q=80"
  }
  ```
* **Response Code:** `201 Created`

#### `PUT /api/products/:id`
Updates product cells in the Excel table for matching `id`. You only need to send fields you want to change.
* **Path Parameter:** `id` of product to update
* **Request Body Payload (Optional):**
  ```json
  {
    "price": 189.99,
    "stock": 40
  }
  ```
* **Response Code:** `200 OK`

#### `DELETE /api/products/:id`
Surgically deletes a product row entirely from the `Products` sheet.
* **Path Parameter:** `id` of target product
* **Response Code:** `200 OK`

---

### 🛒 2. Cart Management Endpoints

#### `GET /api/cart`
Reads the `Cart` sheet tab and computes a full order summary (subtotal, shipping, 8% tax, total).
* **Response Code:** `200 OK`
* **Response Payload:**
  ```json
  {
    "success": true,
    "count": 2,
    "data": [
      {
        "productId": "P101",
        "name": "Wireless Noise-Canceling Headphones",
        "price": 199.99,
        "quantity": 2,
        "imageUrl": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e"
      }
    ],
    "summary": {
      "subtotal": 399.98,
      "shipping": 0,
      "tax": 32.00,
      "total": 431.98
    }
  }
  ```

#### `POST /api/cart`
Adds a product to the cart row. If the item already exists in the cart, it increments its quantity. Matches database stock level automatically to prevent overselling.
* **Request Body Payload:**
  ```json
  {
    "productId": "P101",
    "quantity": 1
  }
  ```
* **Response Code:** `200 OK` (or `400 Bad Request` if stock is exceeded)

#### `PUT /api/cart/:productId`
Explicitly sets the quantity cell of an item in the Cart sheet. If `quantity` is set to `0` or less, the item is removed.
* **Path Parameter:** `productId` of target item
* **Request Body Payload:**
  ```json
  {
    "quantity": 3
  }
  ```
* **Response Code:** `200 OK`

#### `DELETE /api/cart/:productId`
Removes a specific product row from the Cart sheet.
* **Path Parameter:** `productId` of target item
* **Response Code:** `200 OK`

#### `POST /api/cart/clear`
Wipes the entire `Cart` sheet tab empty.
* **Response Code:** `200 OK`

#### `POST /api/cart/checkout`
Executes an atomic checkout process:
1. Validates all cart quantities against actual spreadsheet stock reserves.
2. Deducts purchased quantities from each matching product's `stock` column in the `Products` sheet.
3. Completely clears out the `Cart` sheet rows.
4. Generates a sales receipt invoice.
* **Response Code:** `200 OK` (or `400 Bad Request` if any item is out of stock)
* **Response Payload Example:**
  ```json
  {
    "success": true,
    "message": "Order processed successfully. Inventory stocks deducted in Excel database!",
    "orderSummary": {
      "orderId": "ORD-682144",
      "dateTime": "2026-06-26T15:43:02.122Z",
      "items": [...],
      "pricing": {
        "subtotal": 199.99,
        "shipping": 0,
        "tax": 16.00,
        "total": 215.99
      }
    }
  }
  ```

---

### 💾 3. Spreadsheet File & Management Endpoints

#### `GET /api/database/raw`
Returns raw sheet data representation and server file attributes (size, location, modified time).
* **Response Code:** `200 OK`

#### `GET /api/database/download`
Downloads the actual physical binary Excel workbook (`ecommerce_db.xlsx`) directly to your local file explorer!
* **Response Code:** `200 OK (Binary Attachment Stream)`

#### `POST /api/database/reset`
Restores the default seed products dataset and empties all active cart rows. Perfect for restarting tests with a clean plate.
* **Response Code:** `200 OK`

---

## 🛠️ Launching the Server Backend

### Local Development Startup
To run the server locally on port 3000:
```bash
npm install
npm run dev
```

### Production Build compilation
To build and bundle the backend using Vite & Esbuild:
```bash
npm run build
npm start
```
The application compiles into a unified `dist/server.cjs` file which runs natively on any Node.js environment!
