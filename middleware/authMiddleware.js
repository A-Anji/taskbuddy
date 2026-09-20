const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Authentication token is required.",
    });
  }

  const token = authorization.slice("Bearer ".length).trim();

  if (!token) {
    return res.status(401).json({
      message: "Authentication token is required.",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.userId) {
      return res.status(401).json({
        message: "Invalid authentication token.",
      });
    }

    req.userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({
      message: "Invalid or expired authentication token.",
    });
  }
};

module.exports = authMiddleware;
