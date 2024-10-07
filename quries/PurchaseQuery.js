import { QueryTypes } from "sequelize";
import db from "../database/db.js";
import { getVoucherNo } from "../helper/Voucher_no.js";
import { fexecsql } from "../helper/QueryHelper.js";
import { CustomError } from "../helper/ErrorResponse.js";
export const getPurchaseData = async (filter, user, id = null) => {
  if (id) {
    let sql = `SELECT * FROM purchases WHERE id = ${id}`;
    let result = await db.query(sql, { type: QueryTypes.SELECT });
    return result[0];
  }

  let fromdate = filter.fromdate;
  let todate = filter.todate;

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
  filter.user ? (user_id = filter.user.user_id) : "";
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
			FROM purchases his LEFT JOIN users u ON his.user_id=u.id
			LEFT JOIN merchants m ON his.merchant_id=m.id
			LEFT JOIN stores s ON his.stock_location_id=s.id
			LEFT JOIN accounts a ON his.cashbook_id=a.id
			${query_filter} ORDER BY his.voucher_date desc,his.voucher_no desc `;
  let result = await db.query(sql, { type: QueryTypes.SELECT });
  return result;
};
export const getPurchaseLedgerData = async (user, filter) => {
  let fromdate = filter.fromdate;
  let todate = filter.todate;

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
  filter.user ? (user_id = filter.user.user_id) : "";
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
				FROM purchase_details his JOIN purchases h ON
				his.purchase_id=h.id LEFT JOIN products p ON
				his.product_id=p.id LEFT JOIN categories c ON p.category_id=c.id
				LEFT JOIN merchants m on h.merchant_id=m.id
				LEFT JOIN stores s on his.stock_location_id=s.id 
				${query_filter} ORDER BY his.date desc,
				h.voucher_no desc,s.name, p.name `;
  let result = await db.query(sql, { type: QueryTypes.SELECT });
  return result;
};
export const getPurchaseItemData = async (purchase_id = 0) => {
  if (!purchase_id) return;
  let sql = `SELECT his.*,p.code,p.name FROM purchase_details his
				LEFT JOIN products p ON his.product_id=p.id
				WHERE purchase_id = ${purchase_id}`;
  let result = await db.query(sql, { type: QueryTypes.SELECT });
  return result;
};
export const getPurchaseItemUnitData = async (purchase_id = 0) => {
  let sql = `SELECT his.unit_type,his.product_id,his.unit_qty,his.unit_id,his.to_unit_qty,
              his.to_unit_id,his.purchase_price,his.sale_price,his.sale_price2,his.sale_price3,
              his.sale_price4,his.smallest_unit_qty,u.id,u.short_name,u.short_name FROM product_units his
              LEFT JOIN units u ON his.unit_id=u.id 
              WHERE product_id in (SELECT product_id FROM purchase_details 
              WHERE purchase_id=${purchase_id})
              ORDER BY product_id,unit_type`;
  let result = await db.query(sql, { type: QueryTypes.SELECT });
  return result;
};
export const create = async (data, user) => {
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
      voucher_no = await getVoucherNo("PUR", user.user_id);
    }
    let purchase_id = await insertIntoPurchase(
      data,
      user,
      transaction,
      voucher_no
    );
    for (let index = 0; index < data.amount.length; index++) {
      await insertIntoPurchaseDetails(data, transaction, purchase_id, index);
      await managePriceWithUnit(data, transaction, index);
      let product_id = data.unit[index].product_id;
      let max_unit_type = await fexecsql(`SELECT MIN(unit_type) return1 
        FROM  product_units WHERE product_id=${product_id} `);
      let max_unit_price = await fexecsql(`SELECT purchase_price AS return1 
                          FROM  product_units WHERE product_id=${product_id} 
                          AND unit_type=${max_unit_type}`);
      await db.query(
        `UPDATE products SET purchase_price=${max_unit_price}
                              WHERE id=${product_id}`,
        { type: QueryTypes.UPDATE, transaction }
      );
    }

    await db.query(
                          `UPDATE purchase_details his
				                  JOIN product_units p ON his.product_id = p.product_id
				                  AND his.unit_type=p.unit_type
				                  SET his.smallest_qty=his.qty * p.smallest_unit_qty
				                  WHERE his.purchase_id=${purchase_id}`,
      { type: QueryTypes.UPDATE, transaction }
    );
    await db.query(
                          `UPDATE purchase_details his
				                  JOIN product_units p ON his.product_id = p.product_id
				                  SET his.main_unit_price=p.purchase_price
				                  WHERE p.unit_type=1 AND his.purchase_id=${purchase_id}`,
      { type: QueryTypes.UPDATE, transaction }
    );
    await generalLedger(purchase_id, data, user, transaction,voucher_no);
    await transaction.commit();
  } catch (error) {
    console.log(error)
    transaction && (await transaction.rollback());
    throw new CustomError("Database error", 500);
  }
};
let insertIntoPurchase = async (data, user, transaction, voucher_no) => {
  data.branch_id = data.branch.id;
  data.stock_location_id = data.location.id;
  data.merchant_id = data.suppiler.id;
  data.cashbook_id = data.cashbook.id;
  let sql = `insert into purchases (voucher_no,branch_id,stock_location_id,merchant_id,previous_credit,
   cashbook_id,voucher_date,due_date,pay_type,total_qty,total_weight,total_amount,discount,tax,expense,
   net_amount,remark,user_id,created_date,modified_date) values ($voucher_no,$branch_id,$stock_location_id,
   $merchant_id,$previous_credit,$cashbook_id,$voucher_date,$due_date,$pay_type,$total_qty,$total_weight,
   $total_amount,$discount,$tax,$expense,$net_amount,$remark,$user_id,$created_date,$modified_date)`;
  let result = await db.query(sql, {
    type: QueryTypes.INSERT,
    bind: { 
      voucher_no,
      branch_id: data.branch.id,
      stock_location_id: data.location.id,
      merchant_id: data.suppiler.id,
      previous_credit: data.previous_credit,
      cashbook_id: data.cashbook.id,
      voucher_date: data.date,
      due_date: data.due_date,
      pay_type: data.payment_type.id,
      total_qty: data.total_qty,
      total_weight: data.total_weight,
      total_amount: data.total,
      discount: data.discount,
      tax: data.tax,
      expense: data.expense,
      net_amount: data.net_amount,
      remark: data.remark,
      user_id: user.user_id,
      created_date: new Date(),
      modified_date: new Date(),
    },
    transaction,
  });
  return result[0];
};
let insertIntoPurchaseDetails = async (
  data,
  transaction,
  purchase_id,
  index
) => {
  let product_id = data.unit[index].product_id;
  let unit_type = data.unit[index].unit_type;
  let price = data.unit[index].purchase_price;
  let sql = `insert into purchase_details (purchase_id,account_id,product_id,date,stock_location_id,qty,
    weight,smallest_qty,unit_type,currency_id,exchange_rate,cost1,cost2,cost3,cost4,cost5,price,amount,received)
     values ($purchase_id,$account_id,$product_id,$date,$stock_location_id,$qty,$weight,$smallest_qty,
     $unit_type,$currency_id,$exchange_rate,$cost1,$cost2,$cost3,$cost4,$cost5,$price,$amount,$received)`;
  let result = await db.query(sql, {
    type: QueryTypes.INSERT,
    bind: {
      purchase_id,
      account_id: data.account[index].id,
      product_id: product_id,
      date: data.date,
      stock_location_id: data.location.id,
      qty: data.qty[index],
      weight: data.weight[index],
      smallest_qty: data.unit[index].smallest_unit_qty,
      unit_type: data.unit[index].unit_type,
      currency_id: data.currency[index].id,
      exchange_rate: data.exchange[index],
      cost1: 0,
      cost2: 0,
      cost3: 0,
      cost4: 0,
      cost5: 0,
      price: data.price[index],
      amount: data.amount[index],
      received: data.received[index].id,
    },
    transaction,
  });

  await db.query(
    `UPDATE product_units SET purchase_price=${price}
							WHERE product_id=${product_id} AND unit_type=${unit_type}`,
    { type: QueryTypes.UPDATE, transaction }
  );

  return result[0];
};
let managePriceWithUnit = async (data, transaction, index) => {
  let unit_type = data.unit[index].unit_type;
  let price = data.unit[index].purchase_price;
  let product_id = data.unit[index].product_id;
  if (unit_type == 1) {
    let hastwo = await fexecsql(
      `SELECT COUNT(product_id) return1 FROM  product_units WHERE product_id=${product_id} AND unit_type=2`,
      { type: QueryTypes.SELECT }
    );
    if (hastwo) {
      let calprice =
        await fexecsql(`SELECT (purchase_price/(case WHEN to_unit_qty=0 
						THEN null ELSE to_unit_qty END)) AS return1 
						FROM product_units WHERE product_id=${product_id} and unit_type=1`);
      await db.query(
        `UPDATE product_units SET purchase_price=${calprice}
										WHERE product_id=${product_id} AND unit_type=2`,
        { type: QueryTypes.UPDATE, transaction }
      );
    }
    let hasthree = await fexecsql(`SELECT COUNT(product_id) return1 
								FROM  product_units WHERE product_id=${product_id} AND unit_type=3`);
    if (hasthree) {
      let calprice =
        await fexecsql(`SELECT (purchase_price/(case WHEN to_unit_qty=0 
						THEN null ELSE to_unit_qty END)) AS return1 
						FROM product_units WHERE product_id=${product_id} and unit_type=2 `);
      await db.query(
        `UPDATE product_units SET purchase_price=${calprice} WHERE product_id=${product_id} AND unit_type=3`,
        { type: QueryTypes.UPDATE, transaction }
      );
    }
  } else if (unit_type == 2) {
    let hasone = await fexecsql(
      `SELECT COUNT(product_id) return1 FROM  product_units WHERE product_id=${product_id} AND unit_type=1`,
      { type: QueryTypes.SELECT }
    );
    if (hasone) {
      let calprice =
        await fexecsql(`SELECT (${price} * (case WHEN to_unit_qty=0 
										THEN 1 ELSE to_unit_qty END)) AS return1 
										FROM product_units WHERE product_id=${product_id} and unit_type=1 `);
      await db.query(
        `UPDATE product_units SET purchase_price=${calprice} WHERE product_id=${product_id} AND unit_type=1`,
        { type: QueryTypes.UPDATE, transaction }
      );
    }
    let hasthree = await fexecsql(
      `SELECT COUNT(product_id) return1 FROM  product_units WHERE product_id=${product_id} AND unit_type=3`
    );
    if (hasthree) {
      let calprice =
        await fexecsql(`SELECT (purchase_price/(case WHEN to_unit_qty=0 
						            THEN null ELSE to_unit_qty END)) AS return1 
						            FROM product_units WHERE product_id=${product_id} and unit_type=2 `);
      await db.query(
        `UPDATE product_units SET purchase_price=${calprice} WHERE product_id=${product_id} AND unit_type=3`,
        { type: QueryTypes.UPDATE, transaction }
      );
    }
  } else if (unit_type == 3) {
    let hasone = await fexecsql(
      `SELECT COUNT(product_id) return1 FROM  product_units WHERE product_id=${product_id} AND unit_type=1`,
      { type: QueryTypes.SELECT }
    );
    if (hasone) {
      let calprice = await fexecsql(
        `SELECT ${price} * smallest_unit_qty AS return1 FROM product_units WHERE product_id=${product_id} and unit_type=1`
      );
      await db.query(
        `UPDATE product_units SET purchase_price=${calprice} WHERE product_id=${product_id} AND unit_type=1`,
        { type: QueryTypes.UPDATE, transaction }
      );
    }
    let hastwo = await fexecsql(
      `SELECT COUNT(product_id) return1	FROM  product_units WHERE product_id=${product_id} AND unit_type=2`
    );
    if (hastwo) {
      let calprice = await fexecsql(
        `SELECT ${price} * smallest_unit_qty AS return1 FROM product_units WHERE product_id=${product_id} and unit_type=2`
      );
      await db.query(
        `UPDATE product_units SET purchase_price=${calprice} WHERE product_id=${product_id} AND unit_type=2`,
        { type: QueryTypes.UPDATE, transaction }
      );
    }
  }
};
let generalLedger = async (
  purchase_id,
  data,
  user,
  transaction,
  voucher_no
) => {
  try {
    // delete if row exists with this purchase_id
    await db.query(
      `DELETE FROM general_ledger WHERE transaction_type='PURCHASE' AND transaction_id=${purchase_id}`,
      { type: QueryTypes.DELETE }
    );
    let pay_type = data.payment_type.id;
    let merchant_id = data.suppiler.id;
    let cashbook_id = data.cashbook.id;
    let branch_id = data.branch.id;
    let user_id = user.user_id;
    let remark2 = data.remark;
    let date = data.date;
    // let voucher_no = await fexecsql(
    //   `SELECT voucher_no return1 FROM purchases WHERE id=${purchase_id}`
    // );
    // purchase account
    if (pay_type != 1) {
      cashbook_id = await fexecsql(`SELECT max(sa.account_id) return1 
				FROM system_accounts sa LEFT JOIN account_branches ab ON sa.account_id=ab.account_id
				WHERE ab.branch_id= ${branch_id} AND sa.name='PAYABLE'`);
    }
    let insert = `INSERT INTO general_ledger(transaction_id,transaction_type,date,branch_id,
				account_id,cashbook_id,merchant_id,product_id,qty,weight,price,debit,credit,
				currency_id,exchange_rate, remark1,remark2,user_id,created_date) `;
    let select = `SELECT purchase_id,'PURCHASE',date,${branch_id},
				account_id,${cashbook_id},${merchant_id}, product_id,qty,weight,price,0,amount,
				currency_id,exchange_rate,'${voucher_no}','${remark2}',${user_id},now()
				FROM purchase_details WHERE purchase_id=${purchase_id}`;
    await db.query(insert + select, {
      type: QueryTypes.INSERT,
      transaction,
    });
    // tax account
    let currency_id = await fexecsql(`SELECT max(currency_id) return1 
					FROM general_ledger WHERE transaction_id= ${purchase_id} AND 
					transaction_type='PURCHASE' `);
    let exchange_rate = await fexecsql(`SELECT max(exchange_rate) return1 
				FROM general_ledger WHERE transaction_id= ${purchase_id} AND 
				transaction_type='PURCHASE'`);
    let tax = data.tax;
    if (tax) {
      let purchase_tax_account_id =
        await fexecsql(`SELECT max(sa.account_id) return1 
					FROM system_accounts sa LEFT JOIN account_branches ab ON sa.account_id=ab.account_id
					WHERE ab.branch_id= ${branch_id} AND sa.name='PURCHASETAX'`);
      let insert = ` INSERT INTO general_ledger(transaction_id,transaction_type,date,branch_id,
					account_id,cashbook_id,merchant_id,product_id,qty,weight,price,debit,credit,
					currency_id,exchange_rate,remark1,remark2,user_id,created_date) `;
      let select = `SELECT ${purchase_id},'PURCHASE','${date}',${branch_id},${purchase_tax_account_id},
					${cashbook_id},${merchant_id}, 0,0,0,0,0,${tax},${currency_id},
					${exchange_rate},'${voucher_no}','${remark2}',${user_id},now() `;
      await db.query(insert + select, {
        type: QueryTypes.INSERT,
        transaction,
      });
    }
    // general charges expense
    let expense = data.expense;
    if (expense) {
      let expense_account_id = await fexecsql(`SELECT max(account_id) return1 
					FROM system_accounts sa WHERE sa.name='PURCHASECHARGES'`);
      let insert = ` INSERT INTO general_ledger(transaction_id,transaction_type,date,branch_id,
					account_id,cashbook_id,merchant_id,product_id,qty,weight,price,debit,credit,
					currency_id,exchange_rate,remark1,remark2,user_id,created_date) `;
      let select = `SELECT ${purchase_id},'PURCHASE','${date}',${branch_id},${expense_account_id},
					${cashbook_id},${merchant_id}, 0,0,0,0,0,${expense},${currency_id},
					${exchange_rate},'${voucher_no}','${remark2}',${user_id},now() `;
      await db.query(insert + select, {
        type: QueryTypes.INSERT,
        transaction,
      });
    }
    // discount
    let discount = data.discount;
    if (discount) {
      let purchase_discount_account_id =
        await fexecsql(`SELECT max(sa.account_id) return1 
					FROM system_accounts sa LEFT JOIN account_branches ab ON sa.account_id=ab.account_id
					WHERE ab.branch_id= ${branch_id} AND sa.name='PURCHASEDISCOUNT'`);
      let insert = ` INSERT INTO general_ledger(transaction_id,transaction_type,date,branch_id,
					account_id, cashbook_id,merchant_id,product_id,qty,weight,price,debit,credit,
					currency_id,exchange_rate,remark1,remark2,user_id,created_date) `;
      let select = `SELECT ${purchase_id},'PURCHASE','${date}',${branch_id},${purchase_discount_account_id},
					${cashbook_id},${merchant_id}, 0,0,0,0,${discount},0,${currency_id},
					${exchange_rate},'${voucher_no}','${remark2}',${user_id},now() `;
      await db.query(insert + select, {
        type: QueryTypes.INSERT,
        transaction,
      });
    }
  } catch (err) {
    console.log(err);
    throw err;
  }
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
    await updatePurchase(data, user, transaction, id);
    //delete old details
    await db.query(
      `delete from purchase_details where purchase_id =${id}`,
      { type: QueryTypes.DELETE }
    );
    for (let index = 0; index < data.code.length; index++) {
      await updatePurchaseDetails(data, transaction, id, index);
    }
    await generalLedger(id, data, user, transaction, data.voucher_number);
    await transaction.commit();
    console.log("update purchase vouchar successful");
  } catch (error) {
    console.log(error);
    transaction && (await transaction.rollback());
    throw new CustomError("Database error", 500);
  }
};
let updatePurchase = async (data, user, transaction, id) => {
  data.branch_id = data.branch.id;
  data.stock_location_id = data.location.id;
  data.merchant_id = data.suppiler.id;
  data.cashbook_id = data.cashbook.id;
  let sql = `update purchases set 
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
            tax=$tax,
            expense=$expense,
            net_amount=$net_amount,
            remark=$remark,
            user_id=$user_id,
            modified_date=$modified_date where id = $id`;
  let result = await db.query(sql, {
    type: QueryTypes.UPDATE,
    bind: {
      voucher_no: data.voucher_number,
      branch_id: data.branch.id,
      stock_location_id: data.location.id,
      merchant_id: data.suppiler.id,
      previous_credit: data.previous_credit,
      cashbook_id: data.cashbook.id,
      voucher_date: data.date,
      due_date: data.due_date,
      pay_type: data.payment_type.id,
      total_qty: data.total_qty,
      total_weight: data.total_weight,
      total_amount: data.total,
      discount: data.discount,
      tax: data.tax,
      expense: data.expense,
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
let updatePurchaseDetails = async (data, transaction, purchase_id, index) => {
  console.log(data.account[index])
  let product_id = data.unit[index].product_id;
  let unit_type = data.unit[index].unit_type;
  let price = data.unit[index].purchase_price;

  let sql = `insert into purchase_details (purchase_id,account_id,product_id,date,stock_location_id,qty,
    weight,smallest_qty,unit_type,currency_id,exchange_rate,cost1,cost2,cost3,cost4,cost5,price,amount,received)
     values ($purchase_id,$account_id,$product_id,$date,$stock_location_id,$qty,$weight,$smallest_qty,
     $unit_type,$currency_id,$exchange_rate,$cost1,$cost2,$cost3,$cost4,$cost5,$price,$amount,$received)`;
  let result = await db.query(sql, {
    type: QueryTypes.INSERT,
    bind: {
      purchase_id,
      account_id: data.account[index].id,
      product_id: product_id,
      date: data.date,
      stock_location_id: data.location.id,
      qty: data.qty[index],
      weight: data.weight[index],
      smallest_qty: data.unit[index].smallest_unit_qty,
      unit_type: data.unit[index].unit_type,
      currency_id: data.currency[index].id,
      exchange_rate: data.exchange[index],
      cost1: 0,
      cost2: 0,
      cost3: 0,
      cost4: 0,
      cost5: 0,
      price: data.price[index],
      amount: data.amount[index],
      received: data.received[index].id,
    },
    transaction,
  });
  await db.query(
    ` UPDATE purchase_details his
				JOIN product_units p ON his.product_id = p.product_id
				AND his.unit_type=p.unit_type
				SET his.smallest_qty=his.qty * p.smallest_unit_qty
				WHERE his.purchase_id=${purchase_id}`,
    { type: QueryTypes.UPDATE, transaction }
  );
  await db.query(
    ` UPDATE purchase_details his
				JOIN product_units p ON his.product_id = p.product_id
				SET his.main_unit_price=p.purchase_price
				WHERE p.unit_type=1 AND his.purchase_id=${purchase_id} `,
    { type: QueryTypes.UPDATE, transaction }
  );
};
export const remove = async (id) => {
  let transaction = await db.transaction();
  try {
    let sql = `delete from purchase where id = $id`;
    await makeRemove(sql,id,transaction);

    sql = `delete from purchase_details where purchase_id = $id`;
    await makeRemove(sql,id,transaction);

    sql = `delete from general_ledger where transaction_id = $id and (transaction_type='PURCHASE' 
          or transaction_type='SPAY')`;
    await makeRemove(sql,id,transaction);
    await transaction.commit();
    return true;
  } catch (error) {
    console.log(error);
    transaction && (await transaction.rollback());
    throw new CustomError("Database error", 500);
  }
};
let makeRemove = async (sql,id,transaction) =>{
  await db.query(sql, {
    type: QueryTypes.DELETE,
    bind: { id },
    transaction,
  });
}