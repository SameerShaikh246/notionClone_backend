import JWT from "jsonwebtoken";

export const generateAccessToken = (user) => {
  return JWT.sign({ id: user._id }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
  });
};

export const generateTokens = async (user) => {
  try {
    const payload = { _id: user._id, roles: user.roles };
    const accessToken = JWT.sign(
      payload,
      process.env.ACCESS_TOKEN_PRIVATE_KEY,
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    );
    const refreshToken = JWT.sign(
      payload,
      process.env.REFRESH_TOKEN_PRIVATE_KEY,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
    );
    return Promise.resolve({ accessToken, refreshToken });
  } catch (err) {
    return Promise.reject(err);
  }
};
