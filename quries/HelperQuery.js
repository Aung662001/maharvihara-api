import { QueryTypes } from "sequelize";
import db from "../database/db.js";
export const DeleteQuery = (sql) => {
  return db.query(sql, {
    type: QueryTypes.DELETE,
  });
};
export const InsertQuery = async (tb_name, data) => {
  let keys = Object.keys(data);
  let key_str = keys.slice(0, keys.length).join(",");
  let values = Object.values(data);
  let val_str = values
    .slice(0, values.length)
    .map((item) => `"${item}"`)
    .join(",");

  if (keys.length !== values.length) {
    throw new Error("Keys and values are not matching");
  }

  let sql = `INSERT INTO ${tb_name} (${key_str}) VALUES (${val_str})`;
  let inserted = await db.query(sql, { type: QueryTypes.INSERT });
  return inserted;
};
export const SelectQuery = async (tb_name, id = null) => {
  let sql = `SELECT * FROM ${tb_name}`;
  if (id) {
    sql += `WHERE id = ${id}`;
  }
  let seleted = await db.query(sql, { type: QueryTypes.SELECT });
  return seleted;
};
export const SelectWithSqlQuery = async (sql) => {
  let seleted = await db.query(sql, { type: QueryTypes.SELECT });
  return seleted;
};
export const InsertWithSqlQuery = async (sql) => {
  let insert = await db.query(sql, { type: QueryTypes.INSERT });
  return insert;
};
export const UpdateWithSqlQuery = async (sql) => {
    let update = await db.query(sql, { type: QueryTypes.UPDATE });
    return update;
  };