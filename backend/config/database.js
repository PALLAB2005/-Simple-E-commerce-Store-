const path = require("path");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");

const db = new Database(path.join(__dirname, "..", "..", "database", "store.db"));
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price REAL NOT NULL,
  category TEXT NOT NULL,
  image TEXT NOT NULL,
  stock INTEGER NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'Active'
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  total REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'Placed',
  address TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  price REAL NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);
`);

function addColumnIfMissing(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some(existing => existing.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

addColumnIfMissing("users", "role", "TEXT NOT NULL DEFAULT 'user'");
addColumnIfMissing("users", "is_active", "INTEGER NOT NULL DEFAULT 1");
addColumnIfMissing("products", "status", "TEXT NOT NULL DEFAULT 'Active'");

const insertCategory = db.prepare("INSERT OR IGNORE INTO categories (name) VALUES (?)");
for (const category of ["Electronics", "Fashion", "Grocery", "Beauty", "Home", "Sports", "Books", "Accessories"]) insertCategory.run(category);
for (const product of db.prepare("SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != ''").all()) insertCategory.run(product.category);

const adminEmail = (process.env.ADMIN_EMAIL || "admin@example.com").trim().toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD || "Admin@123";
if (!db.prepare("SELECT id FROM users WHERE email = ?").get(adminEmail)) {
  db.prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'admin')").run("Administrator", adminEmail, bcrypt.hashSync(adminPassword, 10));
}

if (db.prepare("SELECT COUNT(*) AS count FROM products").get().count === 0) {
  const insert = db.prepare("INSERT INTO products (name, description, price, category, image, stock) VALUES (?, ?, ?, ?, ?, ?)");
  db.transaction(() => {
    [
      ["Wireless Headphones", "Comfortable wireless headphones with clear sound and long battery life.", 1499, "Electronics", "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80", 20],
      ["Smart Watch", "Fitness tracking, notifications and everyday activity monitoring.", 2499, "Electronics", "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80", 15],
      ["Running Shoes", "Lightweight everyday running shoes with comfortable cushioning.", 1999, "Fashion", "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80", 25],
      ["Backpack", "Water-resistant backpack suitable for college, office and travel.", 999, "Fashion", "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80", 30],
      ["Coffee Mug", "Minimal ceramic mug for coffee, tea and everyday use.", 399, "Home", "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=800&q=80", 40],
      ["Desk Lamp", "Modern LED desk lamp with adjustable brightness for study tables.", 799, "Home", "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80", 18],
      ["Mechanical Keyboard", "Compact mechanical keyboard designed for coding and gaming.", 2899, "Electronics", "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80", 12],
      ["Cotton T-Shirt", "Soft regular-fit cotton t-shirt for daily wear.", 599, "Fashion", "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80", 35]
    ].forEach(product => insert.run(...product));
  })();
}

module.exports = { db, insertCategory };
