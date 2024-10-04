import {Sequelize} from 'sequelize'
import { CustomError } from '../helper/ErrorResponse.js';

let db = "";
try{
   db = new Sequelize('maharvihara', 'root', 'password', {
    host: 'localhost',
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    } 
  });
}catch(error){
    console.log(error)
  throw new CustomError("Database connection error: ",500)
}

export default db;
