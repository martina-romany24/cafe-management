/**
 * Wraps a Zod schema into an Express middleware.
 * Validates req.body by default; pass { source: 'query' | 'params' } to change.
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    console.log('Validation middleware - source:', source);
    console.log('Validation middleware - data to validate:', JSON.stringify(req[source], null, 2));
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      console.log('Validation failed:', JSON.stringify(result.error.flatten(), null, 2));
      const flattened = result.error.flatten();
      const error = new Error('Validation error');
      error.status = 400;
      error.errors = flattened.fieldErrors;
      return next(error);
    }
    console.log('Validation passed');
    req[source] = result.data;
    next();
  };
}

module.exports = validate;
