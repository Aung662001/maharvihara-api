import { QueryTypes, Sequelize } from "sequelize";
import db from "../database/db.js";
import { CustomError } from "../helper/ErrorResponse.js";
import { getVoucherNo } from "../helper/Voucher_no.js";
import dayjs from "dayjs";
import { DeleteQuery } from "./HelperQuery.js";

export const getAdjustmentTypes = async () => {
  try {
    let sql = `select * from adjustment_types`;
    let result = await db.query(sql, {
      type: QueryTypes.SELECT,
    });
    return result;
  } catch (err) {
    console.log(err);
    throw new CustomError("Database Error", 500);
  }
};
export const getAdjustmentData = async (filter, user, id = null) => {
  let result = [];
  let qfilter = "";
  if (id) {
    let sql = `SELECT * FROM adjustments WHERE id = ${id}`;
    result = await db.query(sql, {
      type: QueryTypes.SELECT,
    });
    return result[0];
  } else {
    let curdate = dayjs().format("YYYY-MM-DD");
    let fromdate = filter.fromdate ? filter.fromdate : curdate;
    let todate = filter.todate ? filter.todate : curdate;
    let category_id = filter.category ? filter.category.id : 0;
    let stock_location_id = filter.stock_location
      ? filter.stock_location.id
      : 0;
    let stock_name = filter.stock_name ? filter.stock_name : "A";
    let filter_branch_id = filter.branch ? filter.branch.id : 0;

    qfilter += ` WHERE his.voucher_date >='${fromdate}' AND his.voucher_date<='${todate}' `;

    if (stock_location_id) {
      qfilter += `  AND his.stock_location_id=$stock_location_id `;
    }
    let sql = `SELECT his.*,s.name AS stock_location_name FROM adjustments his 
				LEFT JOIN stores s ON his.stock_location_id=s.id
				${qfilter} ORDER BY his.voucher_date `;
    result = await db.query(sql, {
      type: QueryTypes.SELECT,
    });
  }
  return result;
};
export const getadjustmentledgerData = async (filter, user) => {
  let qfilter = "";
  let fromdate = filter.fromdate;
  let todate = filter.todate;
  let category_id = filter.category ? filter.category.id : 0;
  let stock_location_id = filter.stock_location ? filter.stock_location.id : 0;
  let stock_name = filter.stock_name ? filter.stock_name : "A";
  let filter_branch_id = filter.branch ? filter.branch.id : 0;

  qfilter += ` WHERE his.date >='${fromdate}' AND his.date<='${todate}' `;
};
export const createNewAdjustmentVoucher = async (user, data) => {
  let transaction = await db.transaction();
  try {
    let voucher_no;
    if (data.vouchernumber) {
      voucher_no = data.vouchernumber;
    } else {
      voucher_no = await getVoucherNo("ADJ", user.user_id);
    }
    let sql = `insert into adjustments (voucher_no,voucher_date,total_qty,stock_location_id,remark,
        total_increase_amount,total_decrease_amount,currency_id,exchange_rate,user_id,
        created_date,modified_date) values ($voucher_no,$voucher_date,$total_qty,$stock_location_id,$remark,
        $total_increase_amount,$total_decrease_amount,$currency_id,$exchange_rate,$user_id,
        $created_date,$modified_date)`;
    let result = await db.query(sql, {
      type: QueryTypes.INSERT,
      bind: {
        voucher_no,
        voucher_date: data.date,
        total_qty: data.totalqty,
        stock_location_id: data.stocklocation ? data.stocklocation.id : 0,
        remark: data.remark,
        total_increase_amount: data.total_increase_amount,
        total_decrease_amount: data.total_decrease_amount,
        currency_id: data.currency ? data.currency.id : 1,
        exchange_rate: data.exchange_rate ? data.exchange_rate : 1,
        user_id: user.id,
        created_date: data.date,
        modified_date: data.date,
      },
      transaction,
    });
    let adjustment_id = result[0];
    sql = `insert into adjustment_details (adjustment_id,date,stock_location_id,product_id,qty,unit_type,smallest_qty,price,amount,adjustment_type_id)
      values ($adjustment_id,$date,$stock_location_id,$product_id,$qty,$unit_type,$smallest_qty,$price,$amount,$adjustment_type_id)`;
    let promise = data.tableBody.map(async (element, index) => {
      let result = await db.query(sql, {
        type: QueryTypes.INSERT,
        bind: {
          adjustment_id,
          date: data.date,
          stock_location_id: data.stocklocation ? data.stocklocation.id : 1,
          product_id: element.id,
          qty: element.qty,
          unit_type:
            element.unit && element.unit.unit_type ? element.unit.unit_type : 1,
          smallest_qty:
            element.unit && element.unit.smallest_unit_qty
              ? element.unit.smallest_unit_qty
              : 1,
          price: element.price,
          amount: element.amount,
          adjustment_type_id: element.adjustmenttype.id,
        },
        transaction,
      });
    });
    await Promise.all(promise);
    await transaction.commit();
    sql = ` UPDATE adjustment_details his
				JOIN product_units p ON his.product_id = p.product_id
				AND his.unit_type=p.unit_type
				SET his.smallest_qty=his.qty * p.smallest_unit_qty
				WHERE his.adjustment_id=${adjustment_id} `;
    result = await db.query(sql, {
      type: QueryTypes.UPDATE,
    });
    sql = `UPDATE adjustment_details his
				JOIN product_units p ON his.product_id = p.product_id
				SET his.main_unit_price=p.purchase_price
				WHERE p.unit_type=1 AND his.adjustment_id=${adjustment_id} `;
    result = await db.query(sql, {
      type: QueryTypes.UPDATE,
    });
    return adjustment_id;
  } catch (err) {
    console.log(err);
    transaction.rollback();
    throw new CustomError("Database Error", 500);
  }
};

export const updateAdjustmentVoucher = async (user, data, id) => {
  let transaction = await db.transaction();
  try {
    let voucher_no;
    if (data.vouchernumber) {
      voucher_no = data.vouchernumber;
    } else {
      voucher_no = await getVoucherNo("ADJ", user.user_id);
    }
    let sql = `UPDATE adjustments
                SET 
                voucher_no = $voucher_no, 
                    voucher_date = $voucher_date,
                    stock_location_id = $stock_location_id,
                    total_qty = $total_qty,
                    remark = $remark,
                    total_increase_amount = $total_increase_amount,
                    total_decrease_amount = $total_decrease_amount,
                    currency_id = $currency_id,
                    exchange_rate = $exchange_rate,
                    user_id = $user_id,
                    created_date = $created_date,
                    modified_date = $modified_date
                WHERE id = $id`;
    let result = await db.query(sql, {
      type: QueryTypes.INSERT,
      bind: {
        voucher_no,
        voucher_date: data.date,
        stock_location_id: data.stocklocation ? data.stocklocation.id : 1,
        remark: data.remark,
        total_qty: data.totalqty,
        total_increase_amount: data.total_increase_amount,
        total_decrease_amount: data.total_decrease_amount,
        currency_id: data.currency ? data.currency.id : 1,
        exchange_rate: data.exchange_rate ? data.exchange_rate : 1,
        user_id: user.id,
        created_date: data.date,
        modified_date: data.date,
        id: id,
      },
      transaction,
    });
    // let adjustment_id = result[0];
    sql = `delete from adjustment_details where adjustment_id = ${id}`;
    await db.query(sql, { type: QueryTypes.DELETE });
    sql = `insert into adjustment_details (adjustment_id,date,stock_location_id,product_id,qty,unit_type,smallest_qty,price,amount,adjustment_type_id)
      values ($adjustment_id,$date,$stock_location_id,$product_id,$qty,$unit_type,$smallest_qty,$price,$amount,$adjustment_type_id)`;
    let promise = data.tableBody.map(async (element, index) => {
      let result = await db.query(sql, {
        type: QueryTypes.INSERT,
        bind: {
          adjustment_id: id,
          date: data.date,
          stock_location_id: data.stocklocation ? data.stocklocation.id : 1,
          product_id: element.product_id,
          qty: element.qty,
          unit_type:
            element.unit && element.unit.unit_type ? element.unit.unit_type : 1,
          smallest_qty:
            element.unit && element.unit.smallest_unit_qty
              ? element.unit.smallest_unit_qty
              : 1,
          price: element.price,
          amount: element.amount,
          adjustment_type_id: element.adjustmenttype.id,
        },
        transaction,
      });
    });
    await Promise.all(promise);
    await transaction.commit();
    sql = ` UPDATE adjustment_details his
				JOIN product_units p ON his.product_id = p.product_id
				AND his.unit_type=p.unit_type
				SET his.smallest_qty=his.qty * p.smallest_unit_qty
				WHERE his.adjustment_id=${id} `;
    result = await db.query(sql, {
      type: QueryTypes.UPDATE,
    });
    sql = `UPDATE adjustment_details his
				JOIN product_units p ON his.product_id = p.product_id
				SET his.main_unit_price=p.purchase_price
				WHERE p.unit_type=1 AND his.adjustment_id=${id} `;
    result = await db.query(sql, {
      type: QueryTypes.UPDATE,
    });
    return id;
  } catch (err) {
    console.log(err);
    transaction.rollback();
    throw new CustomError("Database Error", 500);
  }
};
export const getAdjustmentItemData = async (id) => {
  if (!id) return;
  let sql = `SELECT his.*,p.code,p.name FROM adjustment_details his
				LEFT JOIN products p ON his.product_id=p.id
				WHERE adjustment_id = ${id}`;
  let result = await db.query(sql, { type: QueryTypes.SELECT });
  return result;
};

export const getAdjustmentItemUnitData = async (id) => {
  try {
    let sql = `SELECT * FROM productunitviews 
				WHERE product_id in (SELECT product_id FROM adjustment_details 
					WHERE adjustment_id=${id})
				ORDER BY product_id,unit_type`;
    let result = await db.query(sql, { type: QueryTypes.SELECT });
    return result;
  } catch (err) {
    console.log(err);
    throw new CustomError("Database Error", 500);
  }
};
export const removeAdjustmentVoucher = async (id) => {
  try {
    let sql = `delete from adjustments where id = ${id}`;
    let deleted = await DeleteQuery(sql);
    sql = `delete from adjustment_details where adjustment_id=${id}`;
    deleted = await DeleteQuery(sql);
    return deleted;
  } catch (err) {
    console.log(err);
    throw new CustomError("Database Error", 500);
  }
};
