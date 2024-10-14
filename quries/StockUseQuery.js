import { QueryTypes } from "sequelize";
import db from "../database/db.js";
import { getVoucherNo } from "../helper/Voucher_no.js";
import { fexecsql } from "../helper/QueryHelper.js";
import { CustomError } from "../helper/ErrorResponse.js";

export const getSaleData = async (filter, user, id = null) => {
  if (id) {
    let sql = `SELECT his.*,s.name AS stock_location_name,t.name AS township_name,
					m.name AS merchant_name,u.username AS order_user_name
					FROM sales his LEFT JOIN stores s ON his.stock_location_id=s.id
					LEFT JOIN merchants m ON his.merchant_id=m.id
					LEFT JOIN townships t ON m.township_id=t.id
					LEFT JOIN orders o ON his.saleorder_id=o.id
					LEFT JOIN users u ON o.user_id=u.id
					WHERE his.id = ${id}`;
    let result = await db.query(sql, { type: QueryTypes.SELECT });
    return result[0];
  }

  let fromdate = filter.fromDate;
  let todate = filter.toDate;

  let user_type = user.user_type;
  let query_filter = "";
  let supplier_id = 0;
  let category_id = 0;
  let stock_location_id = 0;
  let stock_name = "A";
  let user_id = 0;
  let pay_type = 0;
  let filter_branch_id = 0;

  filter.category ? (category_id = filter.category.id) : "";
  filter.location ? (stock_location_id = filter.location.id) : "";
  filter.stockname ? (stock_name = filter.stockname) : "";
  filter.branch ? (filter_branch_id = filter.branch.id) : "";
  filter.suppiler ? (supplier_id = filter.suppiler.id) : "";
  filter.user ? (user_id = filter.user.id) : "";
  filter.payment_type ? (pay_type = filter.payment_type.id) : "";

  query_filter += ` WHERE his.voucher_date >='${fromdate}' AND his.voucher_date<='${todate}'`;
  if (filter_branch_id != 0) {
    query_filter += ` AND his.branch_id=${filter_branch_id} `;
  }
  if (stock_location_id != 0) {
    query_filter += ` AND his.stock_location_id=${stock_location_id} `;
  }
  if (supplier_id != 0) {
    query_filter += ` AND his.merchant_id=${supplier_id} `;
  }
  if (user_id != 0) {
    query_filter += ` AND his.user_id=${user_id} `;
  }
  if (pay_type != 0) {
    query_filter += ` AND his.pay_type=${pay_type} `;
  }
  let sql = `SELECT his.*, his.discount + his.item_discount AS total_discount,
			u.username AS user_name,CONCAT(m.code,' - ', m.name) AS merchant_name,
			s.name AS stock_location_name,a.name AS cashbook_name
			FROM sales his LEFT JOIN users u ON his.user_id=u.id
			LEFT JOIN merchants m ON his.merchant_id=m.id
			LEFT JOIN stores s ON his.stock_location_id=s.id
			LEFT JOIN accounts a ON his.cashbook_id=a.id
			${query_filter} ORDER BY his.voucher_date desc,his.voucher_no desc`;
  let result = await db.query(sql, { type: QueryTypes.SELECT });
  return result;
};

export const getSaleLedgerData = async (user, filter) => {
  let fromdate = filter.from_date;
  let todate = filter.to_date;

  let user_type = user.user_type;
  let query_filter = "";
  let supplier_id = 0;
  let category_id = 0;
  let stock_location_id = 0;
  let stock_name = "A";
  let user_id = 0;
  let pay_type = 0;
  let filter_branch_id = 0;

  filter.category ? (category_id = filter.category.id) : "";
  filter.location ? (stock_location_id = filter.location.id) : "";
  filter.stockname ? (stock_name = filter.stockname) : "";
  filter.branch ? (filter_branch_id = filter.branch.id) : "";
  filter.suppiler ? (supplier_id = filter.suppiler.id) : "";
  filter.user ? (user_id = filter.user.id) : "";
  filter.payment_type ? (pay_type = filter.payment_type.id) : "";

  query_filter += ` WHERE his.voucher_date >='${fromdate}' AND his.voucher_date<='${todate}'`;

  if (filter_branch_id != 0) {
    query_filter += ` AND his.branch_id=${filter_branch_id} `;
  }
  if (supplier_id != 0) {
    query_filter += ` AND his.merchant_id=${supplier_id} `;
  }
  if (stock_location_id != 0) {
    query_filter += ` AND his.stock_location_id=${stock_location_id} `;
  }
  if (category_id != 0) {
    query_filter += ` AND his.product_id IN (SELECT id FROM products WHERE category_id=${category_id}) `;
  }
  if (stock_name != 0) {
    query_filter += ` AND his.product_id in (SELECT id FROM products	WHERE name  like '%${stock_name}%' OR code  like'%${stock_name}%')" `;
  }
  if (user_id != 0) {
    query_filter += ` AND his.user_id=${user_id} `;
  }
  if (pay_type != 0) {
    query_filter += ` AND his.pay_type=${pay_type} `;
  }
  let sql = `SELECT his.*,h.*,p.code,p.name,c.name AS group_name, s.name AS stock_location_name, 
				m.name AS merchant_name,his.discount AS detail_item_discount 
				FROM sale_details his JOIN sales h ON
				his.sale_id=h.id LEFT JOIN products p ON
				his.product_id=p.id LEFT JOIN categories c ON p.category_id=c.id
				LEFT JOIN merchants m on h.merchant_id=m.id
				LEFT JOIN stores s on his.stock_location_id=s.id 
				${query_filter} ORDER BY his.date desc,
				h.voucher_no desc,s.name, p.name `;
  let result = await db.query(sql, { type: QueryTypes.SELECT });
  return result;
};

export const getSaleItemData = async (sale_id = null) => {
  if (!sale_id) return;
  let sql = `SELECT his.*,p.code,p.name,u.short_name FROM sale_details his
				LEFT JOIN products p ON his.product_id=p.id
				LEFT JOIN product_units pu ON his.product_id=pu.product_id 
				AND his.unit_type=pu.unit_type 
				LEFT JOIN units u ON pu.unit_id=u.id
				WHERE sale_id = ${sale_id}`;
  let result = await db.query(sql, { type: QueryTypes.SELECT });
  return result;
};
export const getSaleItemUnitData = async (sale_id = null) => {
  let sql = `SELECT his.unit_type,his.product_id,his.unit_qty,his.unit_id,his.to_unit_qty,
              his.to_unit_id,his.purchase_price,his.sale_price,his.sale_price2,his.sale_price3,
              his.sale_price4,his.smallest_unit_qty,u.id,u.short_name,u.short_name FROM product_units his
              LEFT JOIN units u ON his.unit_id=u.id 
              WHERE product_id in (SELECT product_id FROM sale_details 
              WHERE sale_id=${sale_id})
              ORDER BY product_id,unit_type`;
  let result = await db.query(sql, { type: QueryTypes.SELECT });
  return result;
};

export const generalLedger = async (
  sale_id,
  user,
  data,
  transaction,
  voucher_no
) => {
  // delete if row exists with this sale_id
  await db.query(
    `DELETE FROM general_ledger WHERE transaction_type='SALE' AND transaction_id=${sale_id}`,
    { type: QueryTypes.DELETE }
  );
  //   let pay_type = data.payment_type.id;
  //   let merchant_id = data.customer.id;
  //   let cashbook_id = data.cashbook.id;
  let pay_type = 1;
  let merchant_id = 0;
  let cashbook_id = 0;
  let branch_id = data.branch.id ? data.branch.id : 1;
  let user_id = user.id;
  let remark2 = data.remark;
  let date = data.date;

  // let voucher_no = await fexecsql(
  //   `SELECT voucher_no return1 FROM sales WHERE id=${sale_id}`
  // );

  //   sale account
  if (pay_type != 1) {
    cashbook_id = await fexecsql(`SELECT max(sa.account_id) return1 
				FROM system_accounts sa LEFT JOIN account_branches ab ON sa.account_id=ab.account_id
				WHERE ab.branch_id= ${branch_id} AND sa.name='RECEIVEABLE'`);
  }
  let insert = `INSERT INTO general_ledger(transaction_id,transaction_type,date,branch_id,
				account_id,cashbook_id,merchant_id,product_id,qty,weight,price,debit,credit,
				currency_id,exchange_rate, remark1,remark2,user_id,created_date) `;
  let select = `SELECT sale_id,'SALE',date,${branch_id},
				account_id,${cashbook_id},${merchant_id},product_id,qty,weight,price,0,amount,
				currency_id,exchange_rate,'${voucher_no}','${remark2}',${user_id},now()
				FROM sale_details WHERE sale_id=${sale_id}`;
  await db.query(insert + select, {
    type: QueryTypes.INSERT,
    transaction,
  });

  // tax account
  let currency_id = await fexecsql(`SELECT max(currency_id) return1 
    FROM general_ledger WHERE transaction_id= ${sale_id} AND 
    transaction_type='SALE' `);
  let exchange_rate = await fexecsql(`SELECT max(exchange_rate) return1 
    FROM general_ledger WHERE transaction_id= ${sale_id} AND 
    transaction_type='SALE'`);
  let tax = data.tax;
  if (tax) {
    let sale_tax_account_id = await fexecsql(`SELECT max(sa.account_id) return1 
    FROM system_accounts sa LEFT JOIN account_branches ab ON sa.account_id=ab.account_id
    WHERE ab.branch_id= ${branch_id} AND sa.name='SALETAX'`);
    let insert = ` INSERT INTO general_ledger(transaction_id,transaction_type,date,branch_id,
                    account_id,cashbook_id,merchant_id,product_id,qty,weight,price,debit,credit,
                    currency_id,exchange_rate,remark1,remark2,user_id,created_date) `;
    let select = `SELECT ${sale_id},'SALE','${date}',${branch_id},${sale_tax_account_id},
                ${cashbook_id},${merchant_id}, 0,0,0,0,0,${tax},${currency_id},
                ${exchange_rate},'${voucher_no}','${remark2}',${user_id},now() `;
    await db.query(insert + select, {
      type: QueryTypes.INSERT,
      transaction,
    });
  }

  // general charges income
  let income = data.income;
  if (income) {
    let income_account_id = await fexecsql(`SELECT max(account_id) return1 
                     FROM system_accounts sa WHERE sa.name='OTHERINCOME'`);
    let insert = ` INSERT INTO general_ledger(transaction_id,transaction_type,date,branch_id,
                     account_id,cashbook_id,merchant_id,product_id,qty,weight,price,debit,credit,
                     currency_id,exchange_rate,remark1,remark2,user_id,created_date) `;
    let select = `SELECT ${sale_id},'SALE','${date}',${branch_id},${income_account_id},
                     ${cashbook_id},${merchant_id}, 0,0,0,0,0,${income},${currency_id},
                     ${exchange_rate},'${voucher_no}','${remark2}',${user_id},now() `;
    await db.query(insert + select, {
      type: QueryTypes.INSERT,
      transaction,
    });
  }
  // discount
  let discount = data.discount;
  let item_discount = data.item_discount;
  discount = discount + item_discount;

  if (discount) {
    let sale_discount_account_id =
      await fexecsql(`SELECT max(sa.account_id) return1 
					FROM system_accounts sa LEFT JOIN account_branches ab ON sa.account_id=ab.account_id
					WHERE ab.branch_id= ${branch_id} AND sa.name='SALEDISCOUNT'`);
    let insert = ` INSERT INTO general_ledger(transaction_id,transaction_type,date,branch_id,
					account_id, cashbook_id,merchant_id,product_id,qty,weight,price,debit,credit,
					currency_id,exchange_rate,remark1,remark2,user_id,created_date) `;
    let select = `SELECT ${sale_id},'SALE','${date}',${branch_id},${sale_discount_account_id},
					${cashbook_id},${merchant_id},0,0,0,0,${discount},0,${currency_id},
					${exchange_rate},'${voucher_no}','${remark2}',${user_id},now() `;
    await db.query(insert + select, {
      type: QueryTypes.INSERT,
      transaction,
    });
  }
};

export const createNewStockUse = async (data, user) => {
  //   console.log(data.tableBody, "data");
  //   return;
  let transaction = await db.transaction();
  try {
    // let currency_id,exchange_rate;
    // let multicurrency = await fexecsql(`SELECT multicurrency return1 FROM company WHERE id=1`,{type:QueryTypes.SELECT});
    // if(multicurrency == 0 ){
    //    currency_id = 1;
    //    exchange_rate = 1;
    // }
    let voucher_no = data.voucher_number;
    if (!voucher_no) {
      voucher_no = await getVoucherNo("SAL", user.user_id);
    }
    let sale_id = await insertIntoSale(data, user, transaction, voucher_no);
    // update order
    // let sql = `UPDATE orders set paid_status=1 WHERE id= ${data.saleorder_id}`;
    // await db.query(sql,{
    //   type:QueryTypes.UPDATE,
    //   transaction
    // })
    await insertIntoSaleDetails(data, transaction, sale_id);
    await db.query(
      `UPDATE sale_details his
				JOIN product_units p ON his.product_id = p.product_id
				AND his.unit_type=p.unit_type
				SET his.smallest_qty=his.qty * p.smallest_unit_qty
				WHERE his.sale_id=${sale_id}`,
      { type: QueryTypes.UPDATE, transaction }
    );
    await generalLedger(sale_id, user, data, transaction, voucher_no);
    await transaction.commit();
  } catch (error) {
    console.log(error);
    transaction && (await transaction.rollback());
    throw new CustomError("Database error", 500);
  }
};
let insertIntoSale = async (data, user, transaction, voucher_no) => {
  console.log(data);
  data.branch_id = data.branch.id;
  data.stock_location_id = data.stocklocation.id;
  //   data.merchant_id = data.customer.id;
  data.cashbook_id = data.cashbook.id;
  let sql = `insert into sales (saleorder_id,voucher_no,branch_id,stock_location_id,merchant_id,previous_credit,
   cashbook_id,voucher_date,due_date,pay_type,total_qty,total_weight,total_amount,discount,item_discount,tax,income,
   net_amount,remark,user_id,created_date,modified_date) values ($saleorder_id,$voucher_no,$branch_id,
   $stock_location_id,$merchant_id,$previous_credit,$cashbook_id,$voucher_date,$due_date,$pay_type,$total_qty,
   $total_weight,$total_amount,$discount,$item_discount,$tax,$income,$net_amount,$remark,$user_id,$created_date,$modified_date)`;
  let result = await db.query(sql, {
    type: QueryTypes.INSERT,
    bind: {
      saleorder_id: data.saleorder_id ? data.saleorder_id : 0,
      voucher_no,
      branch_id: data.branch.id ? data.branch.id : 0,
      stock_location_id: data.stocklocation.id ? data.stocklocation.id : 0,
      merchant_id: data.customer && data.customer.id ? data.customer.id : 0,
      previous_credit: data.previous_credit ? data.previous_credit : 0,
      cashbook_id: data.cashbook & data.cashbook.id ? data.cashbook.id : 0,
      voucher_date: data.date,
      due_date: data.date, //no need
      pay_type:
        data.payment_type && data.payment_type.id ? data.payment_type.id : 1,
      total_qty: data.totalqty,
      total_weight: 1,
      total_amount: data.totalamount,
      discount: data.discount ? data.discount : 0,
      item_discount: data.item_discount ? data.item_discount : 0,
      tax: data.tax ? data.tax : 0,
      income: data.income ? data.income : 0,
      net_amount: data.net_amount ? data.net_amount : data.totalamount,
      remark: data.remark,
      user_id: user.user_id,
      created_date: new Date(),
      modified_date: new Date(),
    },
    transaction,
  });
  return result[0];
};
let insertIntoSaleDetails = async (data, transaction, sale_id) => {
  let details = data.tableBody;

  let promises = details.map(async (item, index) => {
    let sql = `insert into sale_details (sale_id,account_id,product_id,date,stock_location_id,qty,
          foc,weight,smallest_qty,unit_type,det_remark,balance,currency_id,exchange_rate,price,amount,discount,issue) 
          values ($sale_id,$account_id,$product_id,$date,$stock_location_id,$qty,$foc,$weight,$smallest_qty,
          $unit_type,$det_remark,$balance,$currency_id,$exchange_rate,$price,$amount,$discount,$issue)`;

    let result = await db.query(sql, {
      type: QueryTypes.INSERT,
      bind: {
        sale_id,
        account_id: data.account.id ? data.account.id : 0,
        product_id: item.id,
        date: data.date,
        stock_location_id: data.stocklocation.id,
        qty: item.qty,
        foc: 0,
        weight: 0,
        smallest_qty: item.unit.smallest_unit_qty
          ? item.unit.smallest_unit_qty
          : 1,
        unit_type: item.unit.unit_type ? item.unit.unit_type : 1,
        det_remark: item.remark,
        balance: item.balance,
        currency_id: item.currency && item.currency.id ? item.currency.id : 1,
        exchange_rate: item.exchangerate ? item.exchangerate : 1,
        price: 0,
        amount: 0,
        discount: 0,
        issue: 1,
      },
      transaction,
    });

    return result;
  });

  let results = await Promise.all(promises);
  return results[0];
};

export const update = async (data, user, id) => {
  let transaction = await db.transaction();
  try {
    let currency_id, exchange_rate;
    let multicurrency = await fexecsql(
      `SELECT multicurrency return1 FROM company WHERE id=1`,
      { type: QueryTypes.SELECT }
    );
    if (multicurrency == 0) {
      currency_id = 1;
      exchange_rate = 1;
    }
    await updateSale(data, user, transaction, id);
    //delete old details
    await db.query(`delete from sale_details where sale_id =${id}`, {
      type: QueryTypes.DELETE,
      transaction,
    });

    for (let index = 0; index < data.code.length; index++) {
      await updateSaleDetails(data, transaction, id, index);
    }

    await db.query(
      ` UPDATE sale_details his
          JOIN product_units p ON his.product_id = p.product_id
          AND his.unit_type=p.unit_type
          SET his.smallest_qty=his.qty * p.smallest_unit_qty
          WHERE his.sale_id=${id}  `,
      { type: QueryTypes.UPDATE, transaction }
    );

    await generalLedger(id, user, data, transaction, data.voucher_number);
    await transaction.commit(); // save all changes
    console.log("update sale vouchar successful");
  } catch (error) {
    console.log(error);
    transaction && (await transaction.rollback());
    throw new CustomError("Database error", 500);
  }
};
let updateSale = async (data, user, transaction, id) => {
  data.branch_id = data.branch.id;
  data.stock_location_id = data.location.id;
  data.merchant_id = data.customer.id;
  data.cashbook_id = data.cashbook.id;
  let sql = `update sales set 
            saleorder_id = $saleorder_id,
            voucher_no=$voucher_no,
            branch_id=$branch_id,
            stock_location_id=$stock_location_id,
            merchant_id=$merchant_id,
            previous_credit=$previous_credit,
            cashbook_id=$cashbook_id,
            voucher_date=$voucher_date,
            due_date=$due_date,
            pay_type=$pay_type,
            total_qty=$total_qty,
            total_weight=$total_weight,
            total_amount=$total_amount,
            discount=$discount,
            item_discount=$item_discount,
            tax=$tax,
            income=$income,
            net_amount=$net_amount,
            remark=$remark,
            user_id=$user_id,
            modified_date=$modified_date where id = $id`;
  let result = await db.query(sql, {
    type: QueryTypes.UPDATE,
    bind: {
      saleorder_id: data.saleorder_id,
      voucher_no: data.voucher_number,
      branch_id: data.branch.id,
      stock_location_id: data.location.id,
      merchant_id: data.customer.id,
      previous_credit: data.previous_credit,
      cashbook_id: data.cashbook.id,
      voucher_date: data.date,
      due_date: data.due_date,
      pay_type: data.payment_type.id,
      total_qty: data.total_qty,
      total_weight: 1,
      total_amount: data.total,
      discount: data.discount,
      item_discount: data.item_discount,
      tax: data.tax,
      income: data.income,
      net_amount: data.net_amount,
      remark: data.remark,
      user_id: user.user_id,
      modified_date: new Date(),
      id: id,
    },
    transaction,
  });
  return result[0];
};
let updateSaleDetails = async (data, transaction, sale_id, index) => {
  // let product_id = data.unit[index].product_id;
  // let unit_type = data.unit[index].unit_type;
  // let price = data.unit[index].purchase_price;
  let sql = `insert into sale_details (sale_id,account_id,product_id,date,stock_location_id,qty,
    foc,weight,smallest_qty,unit_type,det_remark,balance,currency_id,exchange_rate,price,amount,discount,issue)
     values ($sale_id,$account_id,$product_id,$date,$stock_location_id,$qty,$foc,$weight,$smallest_qty,
     $unit_type,$det_remark,$balance,$currency_id,$exchange_rate,$price,$amount,$discount,$issue)`;
  let result = await db.query(sql, {
    type: QueryTypes.INSERT,
    bind: {
      sale_id,
      account_id: data.account[index].id,
      product_id: data.product_id[index],
      date: data.date,
      stock_location_id: data.location.id,
      qty: data.qty[index],
      foc: data.foc[index],
      weight: data.weight[index],
      smallest_qty: data.unit[index].smallest_unit_qty,
      unit_type: data.unit[index].unit_type,
      det_remark: data.row_remark[index],
      balance: data.balance[index],
      currency_id: data.currency[index].id,
      exchange_rate: data.exchange[index],
      price: data.price[index],
      amount: data.amount[index],
      discount: data.row_discount[index],
      issue: data.issue[index],
    },
    transaction,
  });
  return result[0];
};
export const remove = async (id) => {
  let transaction = await db.transaction();
  try {
    let sql = `delete from sales where id = ${id}`;
    await makeRemove(sql, id, transaction);

    sql = `delete from sale_details where sale_id = ${id}`;
    await makeRemove(sql, id, transaction);

    sql = `delete from general_ledger where transaction_id = ${id} and (transaction_type='sale' 
          or transaction_type='SPAY')`;
    await makeRemove(sql, id, transaction);
    await transaction.commit();
    return true;
  } catch (error) {
    console.log(error);
    transaction && (await transaction.rollback());
    throw new CustomError("Database error", 500);
  }
};
let makeRemove = async (sql, id, transaction) => {
  try {
    await db.query(sql, {
      type: QueryTypes.DELETE,
      bind: { id },
      transaction,
    });
  } catch (error) {
    console.log(error);
    throw new Error("Can't delete. Something went wrong.");
  }
};
