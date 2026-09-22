# NexCart - Simple E-commerce Store

A college-level full stack e-commerce project built with:

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js + Express.js
- Database: SQLite
- Authentication: Express Session + bcryptjs

## Main Features

1. Product listing
2. Product search
3. Category filtering
4. Product details page
5. Shopping cart
6. User registration
7. User login/logout
8. Order checkout
9. Delivery address
10. Order processing
11. My Orders page
12. SQLite database for users, products and orders
13. Stock validation and stock reduction
14. Responsive UI

## Project Structure

```text
simple-ecommerce-store/
├── package.json
├── server.js
├── frontend/
│   ├── index.html
│   ├── product.html
│   ├── login.html
│   ├── register.html
│   ├── cart.html
│   ├── orders.html
│   ├── css/style.css
│   ├── js/
│   └── assets/
├── backend/
│   ├── config/database.js
│   ├── middleware/
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   └── utils/
├── database/
│   ├── store.db           # created or migrated automatically
│   ├── schema.sql
│   └── seed.js
├── admin/
│   ├── index.html
│   ├── products.html
│   ├── orders.html
│   ├── users.html
│   ├── categories.html
│   ├── css/admin.css
│   └── js/
├── README.md
└── .gitignore
```

## How to Run

### 1. Install Node.js

Install a current LTS version of Node.js.

### 2. Open the project in VS Code

Open this folder:

```text
simple-ecommerce-store
```

### 3. Open Terminal

Run:

```bash
npm install
```

### 4. Start the server

```bash
npm start
```

### 5. Open the website

Visit:

```text
http://localhost:3000
```

The SQLite database `store.db` is created automatically and sample products are inserted on the first run.

## Database Design

### users

- id - Primary key
- name
- email - Unique
- password - Hashed password
- created_at

### products

- id - Primary key
- name
- description
- price
- category
- image
- stock

### orders

- id - Primary key
- user_id - Foreign key
- total
- status
- address
- created_at

### order_items

- id - Primary key
- order_id - Foreign key
- product_id - Foreign key
- quantity
- price

## Project Flow

User opens the home page -> products are loaded from Express API -> user opens product details -> adds product to cart -> cart is stored in browser localStorage -> user registers/logs in -> user enters delivery address -> Express validates cart and stock -> order and order items are inserted into SQLite -> product stock is reduced -> user sees order in My Orders.

## Important API Endpoints

### Products

- `GET /api/products`
- `GET /api/products/:id`
- `GET /api/categories`

### Authentication

- `POST /api/register`
- `POST /api/login`
- `POST /api/logout`
- `GET /api/me`

### Orders

- `POST /api/orders`
- `GET /api/orders`

## Viva Questions

### 1. What is Express.js?
Express.js is a lightweight Node.js framework used to create web servers and REST APIs.

### 2. Why did you use SQLite?
SQLite is simple, lightweight and suitable for a college project because it does not require a separate database server.

### 3. What is an API?
An API is an interface that allows the frontend and backend to communicate.

### 4. What is REST?
REST is an architectural style commonly used for HTTP-based APIs.

### 5. Why is bcrypt used?
bcrypt is used to hash passwords so the original password is not stored directly in the database.

### 6. What is a session?
A session stores information about a logged-in user between requests.

### 7. What is localStorage?
localStorage is browser storage used in this project to temporarily store cart items.

### 8. What happens when an order is placed?
The backend verifies the user, validates products and stock, creates the order and order items, and reduces stock.

### 9. What are foreign keys?
Foreign keys connect related records between database tables.

### 10. Why are order_items stored separately?
One order can contain multiple products, so a separate table is used to represent the relationship.

## Future Scope

- Payment gateway
- Product reviews and ratings
- Wishlist
- Email notifications
- Advanced inventory management
- Coupon system
- Product image upload
- Deployment to a cloud platform

## Note

This project is designed for learning and college submission. For a production application, use environment variables for secrets, a production session store, stronger validation, CSRF protection, HTTPS, rate limiting and a production-grade database.
