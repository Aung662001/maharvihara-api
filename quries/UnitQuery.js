import { QueryTypes } from "sequelize";
import db from "../database/db.js";

export const getUnitData = async () => {
  try {
    let sql = "select * from units";
    let units = await db.query(sql, {
      type: QueryTypes.SELECT,
    });
    return units;
  } catch (error) {
    console.log(error);
    throw new Error("Database Error");
  }
};

export const addUnit = async (data) => {
  try {
    let sql =
      "insert into units (short_name,name,created_date) values ($short_name,$name,$created_date)";
    let create = await db.query(sql, {
      type: QueryTypes.INSERT,
      bind: {...data,created_date:Date.now()},
    });
    return create;
  } catch (err) {
    console.log(err);
    throw new Error("Database Error");
  }
};

export const updateUnit = async (data) => {
  try {
    let sql =
      "update units set short_name=$short_name,name=$name,modified_date=$modified_date where id=$id";
    let update = await db.query(sql, {
      type: QueryTypes.UPDATE,
      bind: {...data,modified_date:Date.now()},
    });
    return update;
  } catch (err) {
    console.log(err);
    throw new Error("Database Error");
  }
};

export const deleteUnit = async (id) => {
  try {
    let sql = `delete from units where id = ${id}`;
    let deleted = await db.query(sql, {
      type: QueryTypes.DELETE,
      bind: { id: id },
    });
    console.log(deleted);
    return deleted;
  } catch (error) {
    console.log(error);
    throw new Error("Database Error");
  }
};
export const getDefaultUnit = async () => {
  try {
    let sql = `select * from units where short_name like '%Pcs%' or short_name like '%pcs%' limit 1`;
    let result = await db.query(sql,{
      type:QueryTypes.SELECT
    });
    if(result[0]){
      return result[0];
    }
    sql = `select * from units limit 1`;
    result = await db.query(sql,{
      type:QueryTypes.SELECT
    });
    if(result[0]) return result[0];
  } catch (error) {
    console.log(error);
    throw new Error("Database Error");
  }
};