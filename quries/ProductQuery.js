import { QueryTypes } from "sequelize";
import db from "../database/db.js";
import { Delete } from "../helper/QueryHelper.js";
import { CustomError } from "../helper/ErrorResponse.js";
import { getChildCategories } from "./StockgroupQuery.js";
import { getDefaultUnit } from "./UnitQuery.js";

export const getProductDataByCategory = async (
  category_id,
  search = "",
  user
) => {
  let filter = "";
  try {
    if (search) {
      filter += `AND his.name LIKe '%${search}%'`;
    }
    if (category_id != 0 && category_id != -1 && category_id != -2) {
      // retrieve products of given category id and child categories ids
      let category_ids = await getChildCategories(category_id);
      let sql = `SELECT his.*,'' unit_name,sum(s.qty) AS qty FROM products his
                 LEFT JOIN stockbalanceviews s ON his.id=s.product_id 
                 WHERE category_id in (${category_ids}) ${filter}
                 GROUP BY his.id, s.product_id`;
      let result = await db.query(sql, {
        type: QueryTypes.SELECT,
      });
      return result;
    } else if (category_id == -1) {
      // retrieve all products
      let sql = `SELECT *,'' unit_name FROM products his 
                 ORDER BY his.code,his.name DESC`;
      let result = await db.query(sql, {
        type: QueryTypes.SELECT,
      });
      return result;
    } else if (category_id == -2 && search !== "") {
      // retrieve products with search parameters
      //  let branch_id = user.branch_id;
      //  let user_type = user.user_type;
      let sql = `SELECT his.*,'' unit_name,sum(s.qty) AS qty FROM products his 
                 LEFT JOIN stockbalanceviews s ON his.id=s.product_id
                 WHERE 1=1 ${filter} 
                 GROUP BY his.id, s.product_id
                 ORDER BY his.code,his.name DESC`;
      let result = await db.query(sql, {
        type: QueryTypes.SELECT,
      });
      return result;
    } else if (category_id == 0) {
      // retrieve products with category id 0 , but product can't be cteate without category id , i can't find the usage of this
      let sql = `SELECT his.*,'' unit_name,sum(s.qty) AS qty FROM products his 
                 LEFT JOIN stockbalanceviews s ON his.id=s.product_id
                 WHERE category_id=0 ${filter}
                 GROUP BY his.id, s.product_id
                 ORDER BY his.code,his.name DESC`;
      let result = await db.query(sql, {
        type: QueryTypes.SELECT,
      });
      return result;
    }
  } catch (error) {
    throw new CustomError("Database error", 500);
  }
};
export const create = async (data) => {
  let transaction = await db.transaction();
  let default_unit = await getDefaultUnit();
  let sale_prices = {
    sale_price: 0,
    sale_price2: 0,
    sale_price3: 0,
    sale_price4: 0,
  };
  let productData = {
    ...data,
    ...sale_prices,
    purchase_price: data.purchaseprice,
    category_id: (data.category && data.category.id) ? data.category.id : 0,
    availability: data.status.value,
  };
  let unitData = {
    ...sale_prices,
    ...data,
    unit_id: default_unit.id,
    purchase_price: data.purchaseprice,
    unit_qty: 1,
    unit_type: 1,
  };
  try {
    let sql = `insert into products (name,code,purchase_price,sale_price,sale_price2,sale_price3
              ,sale_price4,category_id,availability) values ($name,$code,$purchase_price,$sale_price
              ,$sale_price2,$sale_price3,$sale_price4,$category_id,$availability)`;
    let result = await db.query(sql, {
      type: QueryTypes.INSERT,
      bind: productData,
      transaction,
    });
    let product_id = result[0];
    sql = `insert into product_units (product_id,unit_qty,unit_id,unit_type,purchase_price,sale_price,
            sale_price2,sale_price3,sale_price4) values ($product_id,$unit_qty,$unit_id,$unit_type,$purchase_price
            ,$sale_price,$sale_price2,$sale_price3,$sale_price4)`;
    result = await db.query(sql, {
      type: QueryTypes.INSERT,
      bind: { ...unitData, product_id },
      transaction,
    });
    await updateSmallestUnitQty(product_id, transaction);
    //set smallest unit qty and prices in product_units table
    await transaction.commit();
    return result;
  } catch (error) {
    console.log(error);
    await transaction.rollback();
    throw new CustomError("Database error", 500);
  }
};
export const remove = async (id) => {
  try {
    let sql = `delete from products where id = $id`;
    let result = await db.query(sql, {
      type: QueryTypes.DELETE,
      bind: { id },
    });
    return result;
  } catch (error) {
    console.log(error);
    throw new CustomError("Database error", 500);
  }
};
let updateSmallestUnitQty = async (product_id, transaction) => {
  let sql = `SELECT * FROM product_units WHERE product_id=${product_id} ORDER BY unit_type DESC`;
  let result = await db.query(sql, {
    type: QueryTypes.SELECT,
  });
  let smallestqty = 1;
  let tmpqty = 1;
  result.forEach(async (item) => {
    if (item.to_unit_qty != 0) {
      tmpqty = item.to_unit_qty;
    }
    smallestqty = smallestqty * tmpqty;
    let sql = `UPDATE product_units SET smallest_unit_qty=${smallestqty} WHERE product_id=${product_id}  AND unit_type= ${item.unit_type}`;
    let result = await db.query(sql, {
      type: QueryTypes.UPDATE,
      transaction,
    });
    sql = `UPDATE products p JOIN product_units u ON p.id=u.product_id 
				SET p.sale_price=u.sale_price,p.sale_price2=u.sale_price2,
				p.sale_price3=u.sale_price3,p.sale_price4=u.sale_price4  
				WHERE u.unit_type=1`;
    result = await db.query(sql, {
      type: QueryTypes.UPDATE,
      transaction,
    });
  });
};
export const getProductDataByCode = async (code) => {
  try {
    let filter = `WHERE his.code='${code}' AND availability=1 `;

    let sql = `SELECT * FROM products his ${filter} `;
    let result = await db.query(sql, { type: QueryTypes.SELECT });
    return result;
  } catch (err) {
    console.log(err);
    throw new CustomError("Database Error", 500);
  }
};

export const getProductUnitData = async (id) => {
  try {
    let sql = ``;
    if (id) {
      sql = `SELECT * FROM productunitviews  WHERE product_id=${id} ORDER BY unit_type`;
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

export const getProductDataByName = async (name, user, limit = null) => {
  try {
    let user_type = user.user_type;
    let branch_id = user.branch_id;
    let sql = ``;
    let filter = "";
    let limitfilter = "";
    let locfilter = "";
    if (user_type == 2) {
      filter += ` WHERE his.name LIKE '%${name}%' OR his.code LIKE '%${name}%' AND availability=1 AND his.category_id in 
							( SELECT id FROM categories WHERE branch_id=${branch_id} )`;
    } else {
      filter += `WHERE his.name LIKE '%${name}%'  AND availability=1`;
    }
    if (limit) {
      limitfilter += `limit ${limit}`;
    }
    sql = `SELECT his.id,his.code,his.name,his.purchase_price,his.sale_price,his.sale_price2,his.sale_price3,
				his.sale_price4,sum(ifnull(s.qty,0)) bal FROM products his LEFT JOIN stockbalanceviews s
				ON his.id=s.product_id ${filter} ${locfilter} GROUP BY his.code,his.name ${limitfilter}`;
    let result = await db.query(sql, {
      type: QueryTypes.SELECT,
    });
    return result;
  } catch (err) {
    console.log(err);
    throw new CustomError("Database Error", 500);
  }
};

export const createPackageSizePair = async (data, product_id) => {
  let transaction = await db.transaction();
  try {
    await Delete("product_units", "product_id=" + product_id, transaction); //delete previous unit package

    let sql = `insert into product_units (product_id,unit_qty,unit_id,unit_type,to_unit_qty,to_unit_id,
    purchase_price,sale_price,sale_price2,sale_price3,sale_price4) values ($product_id,$unit_qty,$unit_id,
    $unit_type,$to_unit_qty,$to_unit_id,$purchase_price,$sale_price,$sale_price2,$sale_price3,sale_price4)`;
    await Promise.all(
      data.map(async (item, index) => {
        let sqldata = {
          product_id,
          unit_qty: 1,
          unit_id: item.fromUnit.id,
          unit_type: index + 1,
          to_unit_qty: item.qty,
          to_unit_id: item.toUnit && item.toUnit.id ? item.toUnit.id : 0,
          purchase_price: item.purchase_price,
          sale_price: item.sale_price,
          sale_price2: item.sale_price2,
          sale_price3: item.sale_price3,
          sale_price4: item.sale_price4,
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
export const getProductUnitDataForBalance = async (product_id) => {
  if (product_id) {
    let sql = `select * from productunitviews where product_id = $product_id order by unit_type`;
    let result = await db.query(sql, {
      type: QueryTypes.SELECT,
      bind: { product_id },
    });
    return result;
  }
  let sql = `select * from productunitviews order by product_id,unit_type`;
  let result = await db.query(sql, {
    type: QueryTypes.SELECT,
  });
  return result;
};

export const updateProduct = async (product_id, data) => {
  if (product_id) {
    let transaction = await db.transaction();
    let sale_prices = {
      sale_price: 0,
      sale_price2: 0,
      sale_price3: 0,
      sale_price4: 0,
      id: product_id,
    };
    let productData = {
      ...data,
      ...sale_prices,
      purchase_price: data.purchaseprice,
      category_id: (data.category && data.category.id) ? data.category.id : 0,
      availability: data.status.value,
    };

    try {
      let sql = `update products set name=$name,code=$code,purchase_price=$purchase_price,sale_price=$sale_price,
                sale_price2=$sale_price2,sale_price3=$sale_price3
                ,sale_price4=$sale_price4,category_id=$category_id,availability=$availability where id=$id`;
      let result = await db.query(sql, {
        type: QueryTypes.UPDATE,
        bind: productData,
        transaction,
      });
      await transaction.commit();
      return result;
    } catch (error) {
      console.log(error);
      await transaction.rollback();
      throw new CustomError("Database error", 500);
    }
  }
};
