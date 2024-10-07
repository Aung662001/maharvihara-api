import jwt from "jsonwebtoken";
import { secretKey } from "../auth/VerifyJwt.js";

const getAccessToken = async (user) =>{
    let token = jwt.sign(
        {
          data: user,
        },
        secretKey,
        { expiresIn: "1d" }
      );
      // let ver=jwt.verify(token,secretKey,{ expiresIn: "3h" })
      return token;
};
export default getAccessToken;