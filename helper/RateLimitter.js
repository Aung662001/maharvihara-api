import rateLimit from "express-rate-limit";

const limiter = rateLimit({
  windowMs: 2 * 60 * 1000,
  max: 100,
  handler: (req, res, next) => {
    next(new CustomError("Too many requests, please try again later", 429));
  },
});