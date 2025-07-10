export function errorHandler(err, req, res, next) {
  console.error('API Error:', err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
} 