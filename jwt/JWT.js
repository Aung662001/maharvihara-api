import jwt from "jsonwebtoken";

let secretKey = "maharviharabhonebhone"
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