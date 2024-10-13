import { QueryTypes } from "sequelize";
import { getChildCategories } from "./StockgroupQuery.js";
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

export const getStaffOthers = async () => {
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
};
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
  let transaction = await db.transaction();
  let currentDate = new Date();

  data.merchant_type = 1;
  data.price_level_id = 1;
  data.account_id = 11;
  data.credit_limit = 0;
  data.due_days = 0;
  data.township_id = 7;
  data.allow_credit = 1;
  data.created_date = currentDate;
  data.modified_date = currentDate;

  try {
    let sql = `insert into merchants (code,name,phone,email,address,merchant_type,
        price_level_id,account_id,credit_limit,due_days,township_id,allow_credit,
        created_date,modified_date) values ($code,$name,$phone,$email,$address,
        $merchant_type,$price_level_id,$account_id,$credit_limit,$due_days,
        $township_id,$allow_credit,$created_date,$modified_date)`;
    let result = await db.query(sql, {
      type: QueryTypes.INSERT,
      bind: data,
      transaction,
    });
    let merchant_id = result[0];
    sql = `insert into merchant_branches (branch_id,merchant_id,created_date,modified_date)
            values ($branch_id,$merchant_id,$created_date,$modified_date)`;
    // await data.branches.forEach(async (branch) => {
    // if (branch.id) {
    await db.query(sql, {
      type: QueryTypes.INSERT,
      bind: {
        branch_id: 1,
        merchant_id: merchant_id,
        created_date: currentDate,
        modified_date: currentDate,
      },
      transaction,
    });
    // }
    // });
    transaction.commit();
    return result;
  } catch (error) {
    transaction.rollback();
    throw new CustomError("Database error", 500);
  }
};

export const updateMerchant = async (data) => {
  let transaction = await db.transaction();
  let currentDate = new Date();
  data.modified_date = currentDate;
  try {
    let sql = `update merchants set code=$code,name=$name,phone=$phone,email=$email,address=$address,
              modified_date=$modified_date where id=$id`;
    let result = await db.query(sql, {
      type: QueryTypes.UPDATE,
      bind: data,
      transaction,
    });
    transaction.commit();
    return result;
  } catch (error) {
    transaction.rollback();
    console.log(error);
    throw new CustomError("Database error", 500);
  }
};

export const deleteMerchant = async (id) => {
  try {
    let sql = `delete from merchants where id = $id`;
    let result = await db.query(sql, {
      type: QueryTypes.DELETE,
      bind: { id },
    });
    return result;
  } catch (error) {
    transaction.rollback();
    console.log(error);
    throw new CustomError("Database error", 500);
  }
};
