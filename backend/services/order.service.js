const { db } = require("../config/database");
function findOrder(id) { return db.prepare("SELECT * FROM orders WHERE id = ?").get(id); }
module.exports = { findOrder };
