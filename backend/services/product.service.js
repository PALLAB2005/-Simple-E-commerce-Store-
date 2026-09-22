const { db } = require("../config/database");
function findProduct(id) { return db.prepare("SELECT * FROM products WHERE id = ?").get(id); }
module.exports = { findProduct };
