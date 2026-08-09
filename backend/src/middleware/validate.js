/**
 * Wraps a Zod schema into an Express middleware.
 * Validates req.body by default; pass { source: 'query' | 'params' } to change.
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return res.status(400).json({
        message: 'Validation error',
        errors: result.error.flatten().fieldErrors,
      });
    }
    req[source] = result.data;
    next();
  };
}

module.exports = validate;
