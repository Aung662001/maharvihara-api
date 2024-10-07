import { QueryTypes } from "sequelize";
import db from "../database/db.js";
import { CustomError } from "../helper/ErrorResponse.js";
import { getChildAccountGroups } from "./AccountGroupQuery.js";

export const getCashBankAccountData = async (multi_cb = 1, user) => {
  try {
    let sql = "";
    let cashbooks = "";
    if (multi_cb == 1) {
      sql = `SELECT his.name as label,his.id as value,his.* FROM accounts his WHERE account_group_id 
            IN (SELECT account_group_id FROM system_accountgroups WHERE name in ('CASH','BANK')) `;
      cashbooks = await db.query(sql, {
        type: QueryTypes.SELECT,
      });
    } else {
      let cashbook_id = user.cashbook_id;
      sql = `SELECT * FROM accounts WHERE id= ${cashbook_id} `;
      cashbooks = await db.query(sql, {
        type: QueryTypes.SELECT,
      });
    }
    return cashbooks;
  } catch (error) {
    throw new Error("Database Error");
  }
};

export const getAccountData = async (group_id = 0) => {
  try {
    let sql = "";
    if (group_id) {
      let group_ids = await getChildAccountGroups(group_id);
      sql = `SELECT his.*,g.name AS group_name, 
					CASE WHEN ifnull(sa.account_id,0)=0 THEN 0 ELSE 1 END AS sys
					FROM accounts his 
					LEFT JOIN account_groups g ON his.account_group_id=g.id
					LEFT JOIN system_accounts sa ON his.id=sa.account_id 
					WHERE his.account_group_id = $group_id OR  g.parent_id in($group_ids)  
					ORDER BY g.name,his.code,his.name `;
      let accounts = await db.query(sql, {
        bind: { group_id, group_ids },
        type: QueryTypes.SELECT,
      });
      return accounts;
    }
    sql = `SELECT his.*, CASE WHEN ifnull(sa.account_id,0)=0 THEN 0 ELSE 1 END AS sys 
				FROM accounts his LEFT JOIN system_accounts sa ON his.id=sa.account_id
				ORDER BY code,name`;
    let accounts = await db.query(sql, {
      type: QueryTypes.SELECT,
    });
    return accounts;
  } catch (error) {
    console.log(error)
    throw new CustomError("Database Error", 500);
  }
};
