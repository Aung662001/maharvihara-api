import { QueryTypes } from "sequelize";
import { CustomError } from "../helper/ErrorResponse.js";
import db from "../database/db.js";

export const getPayType = async () => {
  try {
    let sql = `SELECT * FROM pay_types`;
    let result = await db.query(sql,{type:QueryTypes.SELECT});
    return result;
  } catch (e) {
    console.log(e);
    throw new CustomError("Database error", 500);
  }
};
