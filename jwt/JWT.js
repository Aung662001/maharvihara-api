import jwt from "jsonwebtoken";
import { secretKey } from "../auth/VerifyJwt.js";

// export type User = {
//   id: number;
//   username: string;
//   password: string;
//   email: string;
//   firstname: string;
//   lastname: string;
//   phone: string;
//   gender: number;
//   branch_id: number;
//   default_location_id: number;
//   cashbook_id: number;
//   user_type: number;
//   purchase_price_change: number;
//   sale_price_change: number;
//   hide_purchase_price: number;
//   multiple_cashbook: number;
//   update_days: number;
//   voucher_type: number;
//   voucher_header: string;
//   user_id: number;
//   group_id: number;
//   group_name: string;
//   permission: string;
// };
const getAccessToken = async (user) => {
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
