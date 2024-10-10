import { QueryTypes } from "sequelize";
import { fexecsql, firstOrDefault } from "../helper/QueryHelper.js"
import db from "../database/db.js";

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
    let categories = await db.query(sql, {
      bind: { parent_id: parent_id },
      type: QueryTypes.SELECT,
    });
    return categories;
  } catch (error) {
    throw new Error("Database Error");
  }
};

export const getChildCategories = async (id) => {
  // this function only retrieve id and ids of child categories and return by spreating with "," 1,2,3...
  let ids = id + ",";
  ids += await get_node_data(id);
  ids = ids.slice(0, -1);
  return ids
};
const get_node_data = async (parent_id) => {
  let ids = "";
  let categories = await getCategoryName(parent_id);
  categories.forEach(async (cat) => {
    ids += cat.id + ",";
    ids += await get_node_data(cat.id);
  });
  return ids;
};
export const getAllCategories = async () => {
  try {
    let sql = "select * from categories where active != 0";
    let result = await db.query(sql, {
      type: QueryTypes.SELECT,
    });
    return result;
  } catch (error) {
    console.log(error);
    throw new Error("Database Error");
  }
};

export const create = async (data) => {
  try {
    let sql = `insert into categories (name,active,parent_id,created_date,image,stock_location_id,branch_id)
     values ($name,$active,$parent_id,$created_date,$image,$stock_location_id,$branch_id)`;
    let result = await db.query(sql, {
      type: QueryTypes.INSERT,
      bind: data,
    });
    return result;
  } catch (error) {
    console.log(error);
    throw new Error("Database Error");
  }
};
export const update = async (data) => {
  try {
    let sql = `update categories  set name=$name,active=$active,parent_id=$parent_id,
    modified_date=$modified_date,image=$image,stock_location_id=$stock_location_id,branch_id=$branch_id
    where id = $id`;
    let result = await db.query(sql, {
      type: QueryTypes.UPDATE,
      bind: data,
    });
    return result;
  } catch (error) {
    console.log(error);
    throw new Error("Database Error");
  }
};
export const remove = async (id) => {
  try {
    let sql = `delete from categories where id = $id`;
    let result = await db.query(sql, {
      bind: { id },
      type: QueryTypes.DELETE,
    });
    return result;
  } catch (error) {
    console.log(error);
    throw new Error("Database Error");
  }
};
export const getCategoryData = async (user, id = null) => {
  try {
    let sql = "";
    let filter = "";
    if (id) {
      sql = `SELECT * FROM categories his WHERE id = $id`;
      let catetory = await firstOrDefault(sql,id);
      return catetory;
    }
    let branch_id = user.branch_id;
    let user_type = user.user_type;
    if (user_type == 2) {
      filter = `WHERE his.branch_id =${branch_id} `;
    }
    sql = `SELECT his.*,b.name AS branch_name,s.name AS location_name FROM categories his 
				LEFT JOIN branches b ON his.branch_id=b.id 
				LEFT JOIN stores s ON his.stock_location_id=s.id ${filter}`;
    let category = await db.query(sql, {
      type: QueryTypes.SELECT,
    });
    return category;
  } catch (error) {
    console.log(error);
  }
};
