import { QueryTypes } from "sequelize";
import dayjs from "dayjs";
import db from "../database/db.js";
import { fexecsql } from "./QueryHelper.js";

export const getRegisterNo = async () => {
  let sql = "";
  let leftNo = await fexecsql(
    `SELECT reg_left_no AS return1 
                        FROM reg_adm_no `
  );
  let leftNoNew = dayjs().format("YYYY") + dayjs().format("MM");

  if (leftNo != leftNoNew) {
    await db.query(`UPDATE reg_adm_no set reg_left_no='${leftNoNew}' `);
    leftNo = leftNoNew;

    await db.query(" UPDATE reg_adm_no set register_no=0  ");
  }
  await db.query(
    `UPDATE reg_adm_no set register_no = (select his.register_no from reg_adm_no his where his.id = 1)+1`
  );
  let serial_no = await fexecsql(`SELECT register_no AS return1  
                    FROM reg_adm_no`);
  let register_digit = await fexecsql(`SELECT register_digit AS return1  
                    FROM company `);

  while (register_digit > serial_no.toString().length) {
    serial_no = "0" + serial_no;
  }
  return leftNo + serial_no;
};
export const getAdmisionNo = async () => {
  let leftNo = await fexecsql(`SELECT adm_left_no AS return1 
                        FROM reg_adm_no`);
  let leftNoNew = dayjs().format("YYYY");
  if (leftNoNew !== leftNo) {
    await db.query(`UPDATE reg_adm_no set adm_left_no=${leftNoNew}`);
    leftNo = leftNoNew;

    await db.query("UPDATE reg_adm_no set admission_no=0  ");
  }
  await db.query(
    `UPDATE reg_adm_no set admission_no=(select his.admission_no from reg_adm_no his where his.id=1)+1`
  );

  let serial_no = await fexecsql(`SELECT admission_no AS return1  
              FROM reg_adm_no `);

  let admissiondigit = await fexecsql(`SELECT admission_digit AS return1  
              FROM company`);

  while (admissiondigit > serial_no.toString().length) {
    serial_no = "0" + serial_no;
  }
  return "A" + leftNo + serial_no;
};
export const getVoucherNo = async (type, user_id) => {
  try{
    type = type.toUpperCase(); 
  let sql = "";
  let user_short_name = await fexecsql(`SELECT firstname AS return1 
                                FROM users WHERE id=${user_id}`);
  let left_no = await fexecsql(`SELECT left_no AS return1 FROM voucher_numbers 
                                WHERE type='${type}' AND user_id=${user_id} `);
  let left_no_new =
    type + user_short_name + dayjs().format("YYYY") + dayjs().format("MM");

  if (left_no != left_no_new) {
    sql = `UPDATE voucher_numbers set left_no='${left_no_new}',serial_no=0 WHERE type='${type}'
                AND user_id=${user_id} `;
    await db.query(sql);
    left_no = left_no_new;
  }
  sql = `UPDATE voucher_numbers set serial_no=serial_no+1 WHERE type='${type}'
                AND user_id=${user_id}`;
  await db.query(sql);
  let serial_no = await fexecsql(`SELECT serial_no return1 FROM voucher_numbers 
                    WHERE type='${type}' AND user_id=${user_id} `);
  // let voucher_digit = await fexecsql(
  //   `SELECT admission_digit AS return1 FROM company`
  // );
  let voucher_digit = 5;
  while (voucher_digit > serial_no.toString().length) {
    serial_no = "0" + serial_no;
  }
  return left_no + serial_no;
  }catch(error){
    console.log("Error at getVoucherNo(): " + error.message)
  }
};
// retrieve user short name from user table with user_id
// left_no = type + usershortname + current_year+ current_month;
//  if year and month change then left_no will not be change so it will update left_no
//  and set left_no to left_no_new to user in current function
// add one to serial no in voucher_numbers table where voucher type is user_id is current user_id
// retrieve that serial no 
// retrieve voucher_digit 
// if voucher digit is greater than serial no add 0 to left side of serial no
//  return voucher number left_no+serial_no