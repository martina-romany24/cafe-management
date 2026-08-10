function notFoundHandler(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

function errorHandler(err, req, res, next) {
  console.error('Error occurred:', err);
  console.error('Error message:', err.message);
  console.error('Error status:', err.status);
  console.error('Error stack:', err.stack);

  if (err.code === 'P2002') {
    return res.status(409).json({ message: 'A record with this unique value already exists' });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ message: 'Record not found' });
  }

  const status = err.status || 500;
  
  // Include error details in response for debugging
  const response = {
    message: err.message || 'Internal server error',
  };
  
  if (err.errors) {
    response.errors = err.errors;
  }
  
  res.status(status).json(response);
}

module.exports = { notFoundHandler, errorHandler };
