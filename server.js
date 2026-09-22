const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const path = require("path");
const { db, insertCategory } = require("./backend/config/database");
const { requireLogin } = require("./backend/middleware/auth.middleware");
const { requireAdmin } = require("./backend/middleware/admin.middleware");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: "college-project-secret-change-this",
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 4 }
}));

app.use(express.static(path.join(__dirname, "frontend")));
app.use("/admin", express.static(path.join(__dirname, "admin")));

app.get("/api/products", (req, res) => {
  const search = (req.query.search || "").trim();
  const category = (req.query.category || "").trim();

  let sql = "SELECT * FROM products WHERE 1=1";
  const params = [];

  if (search) {
    sql += " AND (name LIKE ? OR description LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }

  if (category && category !== "All") {
    sql += " AND category = ?";
    params.push(category);
  }

  sql += " ORDER BY id DESC";
  res.json(db.prepare(sql).all(...params));
});

app.get("/api/products/:id", (req, res) => {
  const product = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
  if (!product) return res.status(404).json({ message: "Product not found." });
  res.json(product);
});

app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must contain at least 6 characters." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(normalizedEmail);

    if (existing) {
      return res.status(409).json({ message: "Email is already registered." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = db.prepare(
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?)"
    ).run(name.trim(), normalizedEmail, hashedPassword);

    req.session.user = {
      id: result.lastInsertRowid,
      name: name.trim(),
      email: normalizedEmail,
      role: "user",
      is_active: 1
    };

    res.json({ message: "Registration successful.", user: req.session.user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Registration failed." });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(
      (email || "").trim().toLowerCase()
    );

    if (!user || !(await bcrypt.compare(password || "", user.password))) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    if (user.is_active === 0) {
      return res.status(403).json({ message: "This account is deactivated." });
    }

    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      is_active: user.is_active
    };

    res.json({ message: "Login successful.", user: req.session.user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Login failed." });
  }
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ message: "Logged out successfully." });
  });
});

app.get("/api/me", (req, res) => {
  res.json({ user: req.session.user || null });
});

app.post("/api/orders", requireLogin, (req, res) => {
  const { items, address } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "Cart is empty." });
  }

  if (!address || address.trim().length < 10) {
    return res.status(400).json({ message: "Please enter a valid delivery address." });
  }

  try {
    const createOrder = db.transaction(() => {
      let total = 0;
      const verifiedItems = [];

      for (const item of items) {
        const product = db.prepare("SELECT * FROM products WHERE id = ?").get(item.id);
        const quantity = Number(item.quantity);

        if (!product) throw new Error("A product in your cart no longer exists.");
        if (!Number.isInteger(quantity) || quantity < 1) {
          throw new Error("Invalid quantity.");
        }
        if (quantity > product.stock) {
          throw new Error(`${product.name} has only ${product.stock} item(s) in stock.`);
        }

        total += product.price * quantity;
        verifiedItems.push({ product, quantity });
      }

      const orderResult = db.prepare(`
        INSERT INTO orders (user_id, total, status, address)
        VALUES (?, ?, 'Placed', ?)
      `).run(req.session.user.id, total, address.trim());

      const orderId = orderResult.lastInsertRowid;

      const insertItem = db.prepare(`
        INSERT INTO order_items (order_id, product_id, quantity, price)
        VALUES (?, ?, ?, ?)
      `);

      const reduceStock = db.prepare(`
        UPDATE products SET stock = stock - ? WHERE id = ?
      `);

      for (const item of verifiedItems) {
        insertItem.run(orderId, item.product.id, item.quantity, item.product.price);
        reduceStock.run(item.quantity, item.product.id);
      }

      return { orderId, total };
    });

    const result = createOrder();
    res.status(201).json({
      message: "Order placed successfully.",
      orderId: result.orderId,
      total: result.total
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: error.message || "Could not place order." });
  }
});

app.get("/api/orders", requireLogin, (req, res) => {
  const orders = db.prepare(`
    SELECT id, total, status, address, created_at
    FROM orders
    WHERE user_id = ?
    ORDER BY id DESC
  `).all(req.session.user.id);

  for (const order of orders) {
    order.items = db.prepare(`
      SELECT p.name, oi.quantity, oi.price
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = ?
    `).all(order.id);
  }

  res.json(orders);
});

app.get("/api/categories", (req, res) => {
  res.json(db.prepare("SELECT name FROM categories ORDER BY name").all().map(x => x.name));
});

app.post("/api/admin/login", async (req, res) => {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    const user = db.prepare("SELECT * FROM users WHERE email = ? AND role = 'admin'").get(email);
    if (!user || user.is_active === 0 || !(await bcrypt.compare(req.body.password || "", user.password))) {
      return res.status(401).json({ message: "Invalid admin credentials." });
    }
    req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role, is_active: user.is_active };
    res.json({ message: "Admin login successful.", user: req.session.user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Admin login failed." });
  }
});

app.post("/api/admin/logout", (req, res) => {
  req.session.destroy(() => res.json({ message: "Logged out successfully." }));
});

app.get("/api/admin/me", requireAdmin, (req, res) => res.json({ user: req.session.user }));

app.get("/api/admin/stats", requireAdmin, (req, res) => {
  const stats = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM products) AS totalProducts,
      (SELECT COUNT(*) FROM users) AS totalUsers,
      (SELECT COUNT(*) FROM orders) AS totalOrders,
      (SELECT COALESCE(SUM(total), 0) FROM orders WHERE status != 'Cancelled') AS totalRevenue,
      (SELECT COUNT(*) FROM orders WHERE status IN ('Placed', 'Pending')) AS pendingOrders,
      (SELECT COUNT(*) FROM orders WHERE status IN ('Delivered', 'Completed')) AS completedOrders
  `).get();
  const sales = db.prepare(`
    SELECT substr(created_at, 1, 10) AS label, COALESCE(SUM(total), 0) AS total
    FROM orders WHERE status != 'Cancelled'
    GROUP BY substr(created_at, 1, 10) ORDER BY label DESC LIMIT 14
  `).all().reverse();
  res.json({ ...stats, sales });
});

app.get("/api/admin/products", requireAdmin, (req, res) => {
  res.json(db.prepare("SELECT * FROM products ORDER BY id DESC").all());
});

app.post("/api/admin/products", requireAdmin, (req, res) => {
  const { name, description, price, category, stock, image, status } = req.body;
  if (!name || !description || !category || !image || !Number.isFinite(Number(price)) || !Number.isInteger(Number(stock))) {
    return res.status(400).json({ message: "Please provide valid product details." });
  }
  insertCategory.run(category.trim());
  const result = db.prepare(`INSERT INTO products (name, description, price, category, image, stock, status) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(name.trim(), description.trim(), Number(price), category.trim(), image.trim(), Number(stock), status || "Active");
  res.status(201).json(db.prepare("SELECT * FROM products WHERE id = ?").get(result.lastInsertRowid));
});

app.put("/api/admin/products/:id", requireAdmin, (req, res) => {
  const { name, description, price, category, stock, image, status } = req.body;
  if (!name || !description || !category || !image || !Number.isFinite(Number(price)) || !Number.isInteger(Number(stock))) {
    return res.status(400).json({ message: "Please provide valid product details." });
  }
  insertCategory.run(category.trim());
  const result = db.prepare(`UPDATE products SET name = ?, description = ?, price = ?, category = ?, stock = ?, image = ?, status = ? WHERE id = ?`)
    .run(name.trim(), description.trim(), Number(price), category.trim(), Number(stock), image.trim(), status || "Active", req.params.id);
  if (!result.changes) return res.status(404).json({ message: "Product not found." });
  res.json(db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id));
});

app.delete("/api/admin/products/:id", requireAdmin, (req, res) => {
  const result = db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
  if (!result.changes) return res.status(404).json({ message: "Product not found." });
  res.json({ message: "Product deleted." });
});

app.get("/api/admin/categories", requireAdmin, (req, res) => {
  res.json(db.prepare("SELECT * FROM categories ORDER BY name").all());
});

app.post("/api/admin/categories", requireAdmin, (req, res) => {
  const name = (req.body.name || "").trim();
  if (!name) return res.status(400).json({ message: "Category name is required." });
  try {
    const result = db.prepare("INSERT INTO categories (name) VALUES (?)").run(name);
    res.status(201).json(db.prepare("SELECT * FROM categories WHERE id = ?").get(result.lastInsertRowid));
  } catch (error) {
    res.status(409).json({ message: "Category already exists." });
  }
});

app.put("/api/admin/categories/:id", requireAdmin, (req, res) => {
  const name = (req.body.name || "").trim();
  const category = db.prepare("SELECT * FROM categories WHERE id = ?").get(req.params.id);
  if (!name || !category) return res.status(404).json({ message: "Category not found." });
  try {
    db.transaction(() => {
      db.prepare("UPDATE categories SET name = ? WHERE id = ?").run(name, req.params.id);
      db.prepare("UPDATE products SET category = ? WHERE category = ?").run(name, category.name);
    })();
    res.json(db.prepare("SELECT * FROM categories WHERE id = ?").get(req.params.id));
  } catch (error) {
    res.status(409).json({ message: "Category already exists." });
  }
});

app.delete("/api/admin/categories/:id", requireAdmin, (req, res) => {
  const category = db.prepare("SELECT * FROM categories WHERE id = ?").get(req.params.id);
  if (!category) return res.status(404).json({ message: "Category not found." });
  const products = db.prepare("SELECT COUNT(*) AS count FROM products WHERE category = ?").get(category.name).count;
  if (products) return res.status(409).json({ message: "Move or delete products in this category first." });
  db.prepare("DELETE FROM categories WHERE id = ?").run(req.params.id);
  res.json({ message: "Category deleted." });
});

app.get("/api/admin/orders", requireAdmin, (req, res) => {
  const orders = db.prepare(`SELECT o.*, u.name AS customer_name, u.email AS customer_email FROM orders o JOIN users u ON u.id = o.user_id ORDER BY o.id DESC`).all();
  for (const order of orders) order.items = db.prepare(`SELECT p.name, oi.quantity, oi.price FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?`).all(order.id);
  res.json(orders);
});

app.get("/api/admin/orders/:id", requireAdmin, (req, res) => {
  const order = db.prepare(`SELECT o.*, u.name AS customer_name, u.email AS customer_email FROM orders o JOIN users u ON u.id = o.user_id WHERE o.id = ?`).get(req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found." });
  order.items = db.prepare(`SELECT p.name, oi.quantity, oi.price FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?`).all(order.id);
  res.json(order);
});

app.put("/api/admin/orders/:id/status", requireAdmin, (req, res) => {
  const statuses = ["Placed", "Pending", "Processing", "Shipped", "Delivered", "Completed", "Cancelled"];
  if (!statuses.includes(req.body.status)) return res.status(400).json({ message: "Invalid order status." });
  const result = db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(req.body.status, req.params.id);
  if (!result.changes) return res.status(404).json({ message: "Order not found." });
  res.json({ message: "Order status updated." });
});

app.get("/api/admin/users", requireAdmin, (req, res) => {
  res.json(db.prepare("SELECT id, name, email, role, is_active, created_at FROM users ORDER BY id DESC").all());
});

app.get("/api/admin/users/:id", requireAdmin, (req, res) => {
  const user = db.prepare("SELECT id, name, email, role, is_active, created_at FROM users WHERE id = ?").get(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found." });
  user.orders = db.prepare("SELECT id, total, status, created_at FROM orders WHERE user_id = ? ORDER BY id DESC").all(req.params.id);
  res.json(user);
});

app.put("/api/admin/users/:id/role", requireAdmin, (req, res) => {
  if (!["user", "admin"].includes(req.body.role)) return res.status(400).json({ message: "Invalid role." });
  const target = db.prepare("SELECT id, role FROM users WHERE id = ?").get(req.params.id);
  if (!target) return res.status(404).json({ message: "User not found." });
  if (target.role === "admin" && req.body.role !== "admin" && db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND is_active = 1").get().count <= 1) {
    return res.status(409).json({ message: "At least one active administrator is required." });
  }
  db.prepare("UPDATE users SET role = ? WHERE id = ?").run(req.body.role, req.params.id);
  res.json({ message: "User role updated." });
});

app.put("/api/admin/users/:id/status", requireAdmin, (req, res) => {
  const target = db.prepare("SELECT id, role, is_active FROM users WHERE id = ?").get(req.params.id);
  if (!target) return res.status(404).json({ message: "User not found." });
  const isActive = req.body.is_active ? 1 : 0;
  if (!isActive && target.role === "admin" && target.is_active && db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND is_active = 1").get().count <= 1) {
    return res.status(409).json({ message: "At least one active administrator is required." });
  }
  db.prepare("UPDATE users SET is_active = ? WHERE id = ?").run(isActive, req.params.id);
  res.json({ message: "Account status updated." });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Simple E-commerce Store running at http://localhost:${PORT}`);
});