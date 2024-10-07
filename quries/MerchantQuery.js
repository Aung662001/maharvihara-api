import { QueryTypes } from "sequelize";
import { getChildCategories } from "./CategoryQuery.js";
import { CustomError } from "../helper/ErrorResponse.js";
import { fexecsql } from "../helper/QueryHelper.js";
import db from "../database/db.js";

export const getActiveMerchant = async () => {
  let sql = `SELECT * FROM merchants `;
  try {
    let result = await db.query(sql, { type: QueryTypes.SELECT });
    return result;
  } catch (err) {
    console.log(err);
    throw new CustomError("Database Error", 500);
  }
};
export const getSuppliers = async () => {
  try {
    let sql = `SELECT his.*,t.name AS township_name 
				FROM merchants his LEFT JOIN townships t ON his.township_id=t.id
				WHERE merchant_type=1 or merchant_type=3 `;
    let result = await db.query(sql, { type: QueryTypes.SELECT });
    return result;
  } catch (err) {
    console.log(err);
    throw new CustomError("Database Error", 500);
  }
};
export const getCustomers = async () => {
  try {
    let sql = `SELECT his.*,t.name AS township_name 
				FROM merchants his LEFT JOIN townships t ON his.township_id=t.id
				WHERE merchant_type=2 or merchant_type=3 `;
    let result = await db.query(sql, { type: QueryTypes.SELECT });
    return result;
  } catch (err) {
    console.log(err);
    throw new CustomError("Database Error", 500);
  }
};

export const getStaffOthers = async () =>{
  try {
    let sql = `SELECT his.*,t.name AS township_name 
				FROM merchants his LEFT JOIN townships t ON his.township_id=t.id
				WHERE merchant_type=4 `;
    let result = await db.query(sql, { type: QueryTypes.SELECT });
    return result;
  } catch (err) {
    console.log(err);
    throw new CustomError("Database Error", 500);
  }
}
export const getMerchantDataByBranch = async (user) => {
  try {
    let branch_id = user.branch_id;
    let sql = `SELECT * FROM merchants 
                                  WHERE id IN (SELECT merchant_id FROM merchant_branches
                                  WHERE branch_id=${branch_id})`;
    let result = await db.query(sql, { type: QueryTypes.SELECT });
    return result;
  } catch (error) {
    console.log(error);
    throw new CustomError("Database error", 500);
  }
};

export const createMerchant = async (data) => {
  let transaction = new db.transaction();
  try {
    let sql = `insert into merchants (code,name,phone,email,address,merchant_type,
        price_level_id,account_id,credit_limit,due_days,township_id,allow_credit,
        created_date,modified_date) values ($code,$name,$phone,$email,$address,
        $merchant_type,$price_level_id,$account_id,$credit_limit,$due_days,
        $township_id,$allow_credit,$created_date,$modified_date)`;
    let result = await db.query(
      sql,
      {
        type: QueryTypes.INSERT,
        bind: data,
        transaction
      },
    );
    let merchant_id = result[0];
    sql = `insert into merchant_branches (branch_id,merchant_id,created_date,modified_date)
            values ($branch_id,$merchant_id,$created_date,$modified_date)`;
    let currentDate = new Date();
    await data.branches.forEach(async (branch) => {
      if (branch.id) {
        await db.query(
          sql,
          {
            type: QueryTypes.INSERT,
            bind: {
              branch_id: branch.id,
              merchant_id: merchant_id,
              created_date: currentDate,
              modified_date: currentDate,
            },
            transaction
          },
        );
      }
    });
    transaction.commit();
    return result;
  } catch (error) {
    transaction.rollback();
    throw new CustomError("Database error", 500);
  }
};
