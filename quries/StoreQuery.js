import { QueryTypes } from "sequelize";
import { CustomError } from "../helper/ErrorResponse.js";
import db from "../database/db.js";

export const getActiveStore = async () => {
  let sql =
    "SELECT his.name as label,his.id as value FROM stores his WHERE his.active = $active";
  let stores = await db.query(sql, {
    bind: { active: true },
    type: QueryTypes.SELECT,
  });
  return stores;
};

export const getStoreData = async (id = null) => {
  let sql = ``;
  try {
    if (id) {
      sql = `SELECT * FROM stores where id = ${id}`;
    } else {
      sql = `SELECT * FROM stores`;
    }
    let result = await db.query(sql, { type: QueryTypes.SELECT });
    return result;
  } catch (error) {
    console.log(error);
    await transaction.rollback();
    throw new CustomError("Database error", 500);
  }
};
export const getStoresDataByBranchId = async (branch_id = -1) => {
  let sql = "";
  if (branch_id != -1) {
    sql = "SELECT * FROM stores where branch_id in ($branch_ids)";
    let stores = await db.query(sql, {
      bind: { branch_ids: branch_id },
      type: QueryTypes.SELECT,
    });
    return stores;
  } else {
    sql = "SELECT * FROM stores";
    let stores = await db.query(sql, {
      type: QueryTypes.SELECT,
    });
    return stores;
  }
};

export const createStore = async (branch_id, name, active) => {
  try {
    let sql = "insert into stores (branch_id, name , active) values ($1,$2,$3)";
    let create = await db.query(sql, {
      bind: [branch_id, name, active],
      type: QueryTypes.INSERT,
    });
    return create;
  } catch (error) {
    throw new CustomError("Database error", 500);
  }
};
export const deleteStore = async (store_id) => {
  try {
    const sql = "DELETE FROM stores WHERE id = $1";
    const [deleted] = await db.query(sql, {
      bind: [store_id],
    });
    if ((deleted.affectedRows = 1)) {
      console.log(`Successfully deleted ${deleted.affectedRows} row(s).`);
    }
  } catch (error) {
    throw new CustomError("Database error", 500);
  }
};
export const updateStore = async (store_id, data) => {
  try {
    let sql =
      "UPDATE stores SET  branch_id= $1, name=$2,active= $3 WHERE id = $4";
    let [update] = await db.query(sql, {
      bind: [data.parentBranch, data.storeName, data.active, store_id],
      // type: QueryTypes.UPDATE,
    });

    // if(update.affectedRows == 0) {
    //   throw new CustomError("Already Updated",400);
    // }
    // console.log("Updated store .Row count:",update.affectedRows)
  } catch (error) {
    throw new CustomError("Database error", 500);
  }
};
