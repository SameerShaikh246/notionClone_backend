import bcrypt from "bcrypt";
import documentsModel from "../models/documentsModel.js";

export const hashPassword = async (password) => {
  try {
    const hashedPassword = await bcrypt.hash(password, process.env.SALT_ROUNDS);
    return hashedPassword;
  } catch (error) {
    console.log(error);
  }
};

export const comparePassword = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword);
};
export const isAuthorized = async (doc, userId) => {
  let res;
  if (doc.type === "teamspace") {
    res = doc?.accessUsers?.some((user) => user.userId.equals(userId));
  } else {
    const teamspace = await documentsModel.findById(doc?.teamspaceId);
    res = teamspace?.accessUsers?.some((user) => user.userId.equals(userId));
  }
  console.log("isAuthorized", res);
  return res;
};
