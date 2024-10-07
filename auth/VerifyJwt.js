import jwt from "jsonwebtoken";

export const secretKey = "maharvihara-app-to-use-at-store-%#";
export default function verifyJwtToken(req, res, next) {
  try {
    let header = req.headers.authorization;
    if (!header) {
      header = req.body.headers.Authorization;
    }
    const accessToken = header.split(" ")[1];
    if (accessToken == null) return res.sendStatus(403);
    const decoded = jwt.verify(accessToken, secretKey, {
      expiresIn: "1d",
    });
    if (!decoded) {
      console.log("jwt verification failed");
      return res.sendStatus(403);
    }
    next();
  } catch (err) {
    console.log("jwt verification failed in catch block", err.message);
    return res.status(403).json({ message: err.message });
    //  throw new Error("JWT verification failed")
  }
}

