 class CustomError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = "CustomError";
    this.status = statusCode;
  }
}

const ErrorResponse = (error, req, res, next) => {
  let customError = { ...error };

  customError.message = error.message;

  if (error.name === "TokenExpiredError") {
    customError = new CustomError("JWT token has expired", 401);
  } else if (error.name === "JsonWebTokenError") {
    customError = new CustomError("Invalid JWT token", 401);
  } else if (error.name === "TooManyRequestsError") {
    customError = new CustomError(
      "Too many requests, please try again later",
      429
    );
  }
  res.status(customError.status || 500).json({
    success: false,
    error: customError.message || "Server Error",
  });
};

export  { CustomError, ErrorResponse };
