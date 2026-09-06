/**
 * Simple authentication for printer service
 * Uses a shared secret token from environment variables
 */
function authenticatePrinter(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: no printer token provided' });
  }

  if (token !== process.env.PRINTER_TOKEN) {
    return res.status(401).json({ message: 'Unauthorized: invalid printer token' });
  }

  next();
}

module.exports = { authenticatePrinter };
