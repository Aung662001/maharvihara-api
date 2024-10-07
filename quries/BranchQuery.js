import { QueryTypes } from "sequelize";
import db from "../database/db.js";

export const getActiveBranches = async (user)=>{
let branch_id = user.branch_id;
let user_type = user.user_type;
let filter = "";
if(user_type == 2){
  filter = ` WHERE his.id= ${branch_id} AND active=1`;
}
  let branches = await db.query(
    `SELECT * FROM branches his ${filter}`,
    {
      type:QueryTypes.SELECT,
    }
  );
  return branches;
}
export const getbranchesData = async (parent_id) => {
  try {
    let sql = "";
    if (parent_id == -1) {
      parent_id = 1; // to use as active when query bindings
      // all active branches
      sql =
        "SELECT his.id as value,his.name as label,his.* FROM branches his WHERE ifnull(active,0)=$parent_id ";
    } else if (parent_id == 0) {
      // branches that don't exist parent | all parents branches
      sql = "SELECT * FROM branches WHERE ifnull(parent_id,0)=$parent_id ";
    } else if (parent_id != 0) {
      // child branches that with parent_id
      sql = "SELECT * FROM branches WHERE ifnull(parent_id,0)=$parent_id ";
    }
    let branches = await db.query(sql, {
      bind: { parent_id: parent_id },
      type: QueryTypes.SELECT,
    });
    return branches;
  } catch (error) {
    throw new Error("Database Error");
  }
};

export const getNodeData = async (parent_id) => {
  let output = [];
  let branches = await getbranchesData(parent_id);

  for (let branch of branches) {
    let obj = {
      id: branch.id,
      name: branch.name,
      code: branch.code,
      parent_id: branch.parent_id,
      active: branch.active,
      phone: branch.phone,
      email: branch.email,
      address: branch.address,
      footer: branch.footer,
      children: await getNodeData(branch.id),
    };
    output.push(obj);
  }
  return output;
};
export const createBranch = async (data) => {
  try {
    let sql = `INSERT INTO branches 
    (code, name, parent_id, active, phone, email, address, footer, created_date, modified_date) VALUES 
    ($1, $2, $3, $4, $5, $6, $7, $8,$9,$10)`;
    // $code,$name,$parent_id,$active,$phone,$email,$address,$footer,$created_date,$modified_date
    const create = await db.query(sql, {
      bind: [
        data.branchCode,
        data.branchName,
        data.parentBranch || 0,
        data.active,
        data.phone || "",
        data.email || "",
        data.address || "",
        data.voucherFooter || "",
        new Date(),
        new Date(),
      ],
    });
    return create;
  } catch (error) {
    console.log(error);
    throw new Error(error.message);
  }
};
export const updateBranch = async (id, data) => {
  try {
    let sql = `UPDATE branches SET  code= $1, name=$2,parent_id= $3,
      active= $4, phone= $5, email= $6,address= $7,footer= $8,modified_date= $9
       WHERE id = $10`;
    let [update] = await db.query(sql, {
      bind: [
        data.branchCode,
        data.branchName,
        data.parentBranch || 0,
        data.active,
        data.phone,
        data.email,
        data.address,
        data.voucherFooter,
        new Date(),
        id,
      ],
      // type: QueryTypes.UPDATE,
    });

    // if(update.affectedRows == 0) {
    //   throw new CustomError("Already Updated",400);
    // }
    // console.log("Updated store .Row count:",update.affectedRows)
  } catch (error) {
    console.log(error);
    throw new CustomError("Database error", 500);
  }
};
export const deleteBranch = async (id) => {
  try {
    const sql = "DELETE FROM branches WHERE id = $1";
    const [deleted] = await db.query(sql, {
      bind: [id],
    });
    if ((deleted.affectedRows = 1)) {
      console.log(`Successfully deleted ${deleted.affectedRows} row(s).`);
    }
  } catch (error) {
    throw new CustomError("Database error", 500);
  }
};
