import { QueryTypes } from "sequelize";
import db from "../database/db.js";
import { CustomError } from "../helper/ErrorResponse.js";
export const getCurrencyData = async (id = null) => {
  try {
    let sql = ``;
    if (id) {
      sql = `SELECT * FROM currencies WHERE id = ${id}`;
    } else {
      sql = `SELECT * FROM currencies`;
    }
    let result = await db.query(sql, { type: QueryTypes.SELECT });
    return result;
  } catch (e) {
    console.log(e);
    throw new CustomError("Database error", 500);
  }
};
