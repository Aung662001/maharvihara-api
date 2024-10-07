import { QueryTypes } from "sequelize";
import { query } from "express";
import db from "../database/db.js";

export const fexecsql = async (query) => {
  let result = await db.query(query, {
    type: QueryTypes.SELECT,
  });
  return result[0].return1;
};
export const firstOrDefault = async (query, id) => {
  let result = await db.query(query, {
    bind: [id],
    type: QueryTypes.SELECT,
  });
  if (!result.length) {
    return null;
  }
  return result[0];
};

export const Delete = async (table, condition, transaction = null) => {
  let sql = `delete from ${table} where ${condition}`;
  let result = await db.query(sql, {
    type: QueryTypes.DELETE,
    transaction: transaction,
  });
  return result;
};

export const SelectQueryWithoutParams = async (sql) => {
  let result = await db.query(sql, {
    type: QueryTypes.SELECT,
  });
  return result;
};
export const UpdateQeuryWithoutParams = async (sql) =>{
  let result = await db.query(sql,{
    type:QueryTypes.UPDATE,
  })
  return result;
}