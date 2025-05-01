const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (err) {
    next(err); // Pass the error to the centralized error handler
  }
};

export { asyncHandler };
