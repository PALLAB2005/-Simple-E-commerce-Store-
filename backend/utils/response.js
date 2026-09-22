function sendSuccess(res, data) { return res.json(data); }
function sendError(res, status, message) { return res.status(status).json({ message }); }
module.exports = { sendSuccess, sendError };
