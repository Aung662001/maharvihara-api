import { QueryTypes } from "sequelize";
import db from "../database/db.js";
import { DeleteQuery } from "./HelperQuery.js";

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
export const createUnitPair = async (data, product_id) => {
  let transaction = await db.transaction();
  try {
    await DeleteQuery(`delete from product_units where product_id=${product_id}`); //delete previous unit package

    let sql = `insert into product_units (product_id,unit_qty,unit_id,unit_type,to_unit_qty,to_unit_id,
    purchase_price,sale_price,sale_price2,sale_price3,sale_price4) values ($product_id,$unit_qty,$unit_id,
    $unit_type,$to_unit_qty,$to_unit_id,$purchase_price,$sale_price,$sale_price2,$sale_price3,sale_price4)`;
    await Promise.all(
      data.map(async (item, index) => {
        let sqldata = {
          product_id,
          unit_qty: 1,
          unit_id: item.unit_id,
          unit_type: index + 1,
          to_unit_qty: item.to_unit_qty,
          to_unit_id: item.to_unit_id,
          purchase_price: item.purchase_price,
          sale_price: 0,
          sale_price2: 0,
          sale_price3: 0,
          sale_price4: 0,
        };
        await db.query(sql, {
          type: QueryTypes.INSERT,
          bind: sqldata,
          transaction,
        });
      })
    );
    await transaction.commit();
    //update_smallest_unit_qty and prices from products
    sql = `SELECT * FROM product_units WHERE product_id=${product_id} ORDER BY unit_type DESC`;
    let unitdata = await db.query(sql, {
      type: QueryTypes.SELECT,
    });
    let smallest_qty = 1;
    let tmpqty = 1;
    await Promise.all(
      unitdata.map(async (item) => {
        if (item.to_unit_qty != 0) {
          tmpqty = item.to_unit_qty;
        }
        smallest_qty = smallest_qty * tmpqty;
        sql = `UPDATE product_units SET smallest_unit_qty=${smallest_qty} WHERE product_id=${product_id}  AND unit_type= ${item.unit_type}`;
        await db.query(sql, { type: QueryTypes.UPDATE });
      })
    );
    sql = `UPDATE products p JOIN product_units u ON p.id=u.product_id 
				SET p.sale_price=u.sale_price,p.sale_price2=u.sale_price2,
				p.sale_price3=u.sale_price3,p.sale_price4=u.sale_price4  
				WHERE u.unit_type=1`;
    await db.query(sql, { type: QueryTypes.UPDATE });
    return true;
  } catch (err) {
    console.log(err);
    transaction && transaction.rollback();
    throw new CustomError("Database Error", 500);
  }
};
export const getProductUnitData = async (id) => {
  try {
    let sql = ``;
    if (id) {
      sql = `SELECT pv.*,from_unit.short_name as from_unit_name,to_unit.short_name as to_unit_name FROM productunitviews pv 
            left join 
              (select * from units) as from_unit on pv.unit_id = from_unit.id 
            left join 
              (select * from units) as to_unit on pv.to_unit_id = to_unit.id 
            WHERE pv.product_id=${id}
            ORDER BY unit_type`;
      let result = await db.query(sql, { type: QueryTypes.SELECT });
      return result;
    } else {
      sql = `SELECT * FROM productunitviews ORDER BY product_id,unit_type`;
      let result = await db.query(sql, { type: QueryTypes.SELECT });
      return result;
    }
  } catch (err) {
    console.log(err);
    throw new CustomError("Database Error", 500);
  }
};

