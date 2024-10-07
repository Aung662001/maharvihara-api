import { QueryTypes } from "sequelize";
import { CustomError } from "../helper/ErrorResponse.js";
import db from "../database/db.js";
export const getCompanyData = async (id=1) =>{
    try{
        let sql = `SELECT * FROM company WHERE id = ${id}`;
        let result = await db.query(sql,{type:QueryTypes.SELECT});
        return result;
    }catch(e){
        console.log(e);
        throw new CustomError("Database error", 500);
    }
}