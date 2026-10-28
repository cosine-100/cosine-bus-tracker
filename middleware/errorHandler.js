function notFound(req, res) {
  res.status(404).render('errors/error', { title: 'Page not found', active: '', code: 404, message: 'The page you are looking for does not exist or has moved.' });
}
function errorHandler(err, req, res, next) {
  const status = Number.isInteger(err.status) && err.status >= 400 && err.status < 500 ? err.status : 500;
  if (status === 500) console.error(JSON.stringify({level: 'error', path: req.path, message: err.message}));
  if (req.path.startsWith('/api/')) return res.status(status).json({ error: status === 400 ? 'Invalid JSON request.' : status === 413 ? 'Request is too large.' : 'The server could not complete the request.' });
  res.status(status).render('errors/error', { title: 'Something went wrong', active: '', code: status, message: 'We could not load this page. Please try again in a moment.' });
}
module.exports = { notFound, errorHandler };
