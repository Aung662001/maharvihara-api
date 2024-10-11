import { QueryTypes } from "sequelize";
import db from "../database/db.js";
import { getVoucherNo } from "../helper/Voucher_no.js";
import { fexecsql } from "../helper/QueryHelper.js";
import { CustomError } from "../helper/ErrorResponse.js";

export const getCategoryName = async (parent_id) => {
    try {
      let sql = "";
      if (parent_id == 0) {
        sql = "SELECT * FROM categories WHERE ifnull(parent_id,0)=$parent_id ";
      } else if (parent_id == -1) {
        sql = "SELECT * FROM categories WHERE ifnull(parent_id,0)!=$parent_id";
      } else if (parent_id != 0) {
        sql = "SELECT * FROM categories WHERE ifnull(parent_id,0)=$parent_id ";
      }
      let categories = await sequelize.query(sql, {
        bind: { parent_id: parent_id },
        type: QueryTypes.SELECT,
      });
      return categories;
    } catch (error) {
      console.log(error);
      throw new Error("Database Error");
    }
  };
  