import { QueryTypes } from "sequelize";
import db from "../database/db.js";

export const getChildAccountGroups =async (parent_id) =>{
    let data = "";
    data = data.concat(parent_id,",");
    data += await get_node_data(parent_id);
    return data.slice(0,-1);//remove the last comma
}
const getAccountGroupName = async(parent_id = 0) => {
    //get Account Group ids
    if (parent_id) {
      let sql = `select his.* ,CASE WHEN ifnull(sa.account_group_id,0) = 0 THEN 
              0 ELSE 1 END AS sys
              from account_groups his left join system_accountgroups sa
              on his.id=sa.account_group_id where his.parent_id = ${parent_id} and active = 1`;
              let result = await db.query(sql,{
                  type:QueryTypes.SELECT
              });
              return result;
       }else if(parent_id=0){
          let sql = `select his.* ,CASE WHEN ifnull(sa.account_group_id,0) = 0 THEN 
              0 ELSE 1 END AS sys
              from account_groups his left join system_accountgroups sa
              on his.id=sa.account_group_id where his.parent_id = ${parent_id} and active = 1`;
              let result = await db.query(sql,{
                  type:QueryTypes.SELECT
              });
              return result;
       }
  };
const get_node_data = async (parent_id) =>{
    let strids = "";
    let res =await getAccountGroupName(parent_id);
    res.forEach(async (item) => {
        strids = strids.concat(item.id,",");
        strids += await get_node_data(item.id);
    });
    return strids;
}

