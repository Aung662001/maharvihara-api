import { QueryTypes } from "sequelize";
import db from "../database/db.js";
import { fexecsql } from "../helper/QueryHelper.js";
import { CustomError } from "../helper/ErrorResponse.js";
import { getChildCategories } from "./StockgroupQuery.js";
import { getProductUnitDataForBalance } from "./ProductQuery.js";
import {
  DeleteQuery,
  InsertQuery,
  InsertWithSqlQuery,
  SelectWithSqlQuery,
  UpdateWithSqlQuery,
} from "./HelperQuery.js";
import dayjs from "dayjs";
export const getStockBalancesData = async (user, filter) => {
  try {
    let filterstring = "";
    let branch_id = user.branch_id;
    let user_type = user.user_type;

    let category_id = filter.category ? filter.category.id : 0;
    let stock_location_id = filter.stock_location
      ? filter.stock_location.id
      : 0;
    let brand_id = filter.brand ? filter.brand.id : 0;
    let stock_name = filter.stock_name ? filter.stock_name : "";
    let filter_branch_id = filter.branch ? filter.branch.id : 0;

    if (brand_id) {
      filterstring += ` AND his.product_id in (SELECT id FROM products WHERE brand_id=${brand_id}) `;
    }
    if (category_id != 0 && category_id != -1) {
      let category_ids = getChildCategories(category_id);
      filterstring += ` AND his.product_id in (SELECT id from products WHERE category_id in (${category_ids})) `;
    } else {
      if (user_type == 2) {
        filterstring += ` AND his.product_id in (SELECT id from products WHERE category_id in (SELECT id FROM categories WHERE branch_id=${branch_id})) `;
      }
    }
    if (stock_name) {
      if (user_type == 2) {
        filterstring += ` AND his.product_id in (SELECT id from products WHERE (name like'%${stock_name}%' OR code like'%${stock_name}%') AND category_id in (SELECT id FROM categories WHERE branch_id=$branch_id))`;
      } else {
        filterstring += ` AND his.product_id in (SELECT id from products WHERE (name like'%${stock_name}%' OR code like'%${stock_name}%')) `;
      }
    } else {
      if (user_type == 2) {
        filterstring += ` AND his.product_id in (SELECT id from products WHERE (name like'%${stock_name}%' OR code like'%${stock_name}%') AND category_id in (SELECT id FROM categories WHERE branch_id=$branch_id))`;
      }
    }
    if (filter_branch_id != 0) {
      filterstring += ` AND his.stock_location_id in (SELECT id FROM stores WHERE branch_id=${filter_branch_id}) `;
    }
    if (stock_location_id) {
      filterstring += ` AND his.stock_location_id=$stock_location_id `;
    } else {
      if (user_type == 2) {
        filterstring += ` AND his.stock_location_id in (SELECT id FROM stores WHERE branch_id=${branch_id}) `;
      }
    }
    let fromdate = filter.fromdate;
    let todate = filter.todate;

    let sql = `SELECT * FROM (SELECT s.name as store_name,c.name AS group_name ,his.product_id,
				p.code,p.name,'' AS unit_name,sum(his.qty) AS balance,
				smallest_unit.purchase_price AS price,smallest_unit.sale_price AS sale_price, 
				sum((his.qty/smallest_unit.smallest_unit_qty)*smallest_unit.purchase_price) as amount,
				p.web_description set_name
				FROM stockbalanceviews his
				LEFT JOIN products p on his.product_id=p.id
				LEFT JOIN 
					(SELECT product_id,max(unit_type) unit_type,
					max(smallest_unit_qty)smallest_unit_qty,max(purchase_price)purchase_price,
					max(sale_price)sale_price,
					substring_index(group_concat(unit_id order by unit_type desc),',',1) AS unit_id FROM 
					product_units group by product_id) smallest_unit
				ON p.id=smallest_unit.product_id
				LEFT JOIN units u ON smallest_unit.unit_id=u.id
				LEFT JOIN stores s on his.stock_location_id=s.id
				LEFT JOIN categories c on p.category_id=c.id
				WHERE date<='${todate}' ${filterstring}
				GROUP BY p.code,p.name,p.id,s.name,p.web_description,his.product_id 
				) AS TMP WHERE balance<>0 ORDER BY store_name,group_name,code,name`;

    let result = await db.query(sql, {
      type: QueryTypes.SELECT,
    });
    return result;
  } catch (error) {
    console.log(error);
    transaction && (await transaction.rollback());
    throw new CustomError("Database error", 500);
  }
};
export const calculateUnitBalance = async (product_id, qty) => {
  let data = await getProductUnitDataForBalance(product_id);
  let result = "";
  let negative = 0;
  if (qty < 0) {
    negative = 1;
    qty = Math.abs(qty);
  }
  data.map((element) => {
    let smallest_unit_qty = parseFloat(element["smallest_unit_qty"]);

    if (qty >= smallest_unit_qty) {
      let qtyresult = parseInt(qty / smallest_unit_qty);
      let unit_name = element.short_name ? element.short_name : "";
      result =
        result +
        new Intl.NumberFormat("en-US").format(qtyresult) +
        " " +
        unit_name +
        ", ";
      qty = qty % smallest_unit_qty;
    }
  });
  return negative == 1 ? "-" + result : result;
};
export const getStockBalanceFifoData = async (user, filter) => {
  let user_id = user.user_id;
  let product_id = 0;
  let balance = 0;
  let deleted = DeleteQuery(
    `DELETE from tmp_stock_ledgers WHERE user_id= ${user_id} `
  );
  let data = await getStockBalance(user, filter);

  let promise = data.map(async (item, index) => {
    let product_id = item.product_id;
    let balance = item.balance;

    if (balance > 0) {
      let fifodata = await getFifoPricing(user, filter, product_id);

      let count = fifodata.length;
      let tmpbal;
      for (let i = 0; i < count && balance > 0; i++) {
        let qty = fifodata[i].smallest_qty;
        if (qty > balance) {
          tmpbal = balance;
          balance = 0;
        } else {
          tmpbal = qty;
          balance -= qty;
        }
        let fifo = {
          product_id,
          stock_location_name: item.store_name,
          category_name: item.group_name,
          code: item.code,
          name: item.name,
          sale_price: item.sale_price,
          balance: tmpbal,
          purchase_price: fifodata[i].price,
          user_id: user_id,
        };
        let insert = await InsertQuery("tmp_stock_ledgers", fifo);
        return insert;
      }
    }
  });
  let finished = await Promise.all(promise);
  let sql = `SELECT his.stock_location_name AS store_name,
								his.category_name AS group_name,his.code,his.name,
								u.name AS unit_name,
								sum(his.balance) AS qty,
								(sum(his.balance)/ifnull(p.smallest_unit_qty,1)) 
								* his.purchase_price AS amount, 
								his.purchase_price price,p.sale_price FROM tmp_stock_ledgers his
								LEFT JOIN product_units p ON his.product_id=p.product_id
								LEFT JOIN units u ON p.unit_id=u.id
								WHERE his.user_id=${user_id} AND p.unit_type=1
								GROUP BY his.stock_location_name,his.category_name,his.code,
								his.name,his.purchase_price,his.sale_price,his.product_id`;
  let result = await SelectWithSqlQuery(sql);
  // console.log(result)
  return result;
};
export const getStockBalance = async (user, filter) => {
  let branch_id = user.branch_id;
  let user_type = user.user_type;

  let category_id = filter.category ? filter.category.id : 0;
  let stock_location_id = filter.stock_location ? filter.stock_location.id : 0;
  let stock_name = filter.stock_name ? filter.short_name : "";

  let filterstring = "";
  if (category_id) {
    filterstring += ` AND his.product_id in (SELECT id from products WHERE category_id=${category_id}) `;
  } else {
    if (user_type == 2) {
      filterstring += ` AND his.product_id in (SELECT id from products WHERE category_id in (SELECT id FROM categories WHERE branch_id=${branch_id})) `;
    }
  }
  if (stock_name) {
    if (user_type == 2) {
      filterstring += ` AND his.product_id in (SELECT id from products WHERE (name like'%${stock_name}%' OR code like'%${stock_name}%') AND category_id in (SELECT id FROM categories WHERE branch_id=${branch_id}))`;
    } else {
      filterstring += ` AND his.product_id in (SELECT id from products WHERE (name like'%${stock_name}%' OR code like'%${stock_name}%')) `;
    }
  } else {
    if (user_type == 2) {
      filterstring += ` AND his.product_id in (SELECT id from products WHERE (name like'%${stock_name}%' OR code like'%${stock_name}%') AND category_id in (SELECT id FROM categories WHERE branch_id=${branch_id}))`;
    }
  }
  if (stock_location_id) {
    filterstring += ` AND his.stock_location_id=${stock_location_id} `;
  } else {
    if (user_type == 2) {
      filterstring += ` AND his.stock_location_id in (SELECT id FROM stores WHERE branch_id=${branch_id}) `;
    }
  }
  let fromdate = filter.fromdate;
  let todate = filter.todate;
  let sql = ` SELECT his.product_id,s.name as store_name,c.name AS group_name ,
				p.code,p.name, sum(his.qty) AS balance,
				p.purchase_price AS price,p.sale_price AS sale_price
				FROM stockbalanceviews his
				JOIN products p on his.product_id=p.id
				LEFT JOIN stores s on his.stock_location_id=s.id
				LEFT JOIN categories c on p.category_id=c.id
				WHERE date<='${todate}' ${filterstring}
				GROUP BY his.product_id,p.code,p.name,p.id,s.name `;
  let result = await db.query(sql, { type: QueryTypes.SELECT });
  return result;
};
export const getFifoPricing = async (user, filter, product_id) => {
  let user_type = user.user_type;
  let fromdate = await fexecsql(
    `SELECT ifnull(max(voucher_date),'2000-01-01')	AS return1 FROM stockopenings `
  );
  let branch_id = user.branch_id;
  let todate = filter.todate
    ? filter.todate
    : dayjs(new Date()).format("YYYY-MM-DD");

  let stock_location_id = filter.stock_location ? filter.stock_location.id : 0;
  let filterstring = "";
  let filterstring2 = "";

  filterstring = ` WHERE his.date>='${fromdate}' AND his.date<='${todate}' `;

  if (stock_location_id) {
    filterstring += ` AND his.stock_location_id=${stock_location_id} `;
    filterstring2 += ` AND his.in_stock_location_id =${stock_location_id} `;
  } else {
    if (user_type == 2) {
      filterstring += ` AND his.stock_location_id in (SELECT id FROM stores WHERE branch_id=${branch_id}) `;
      filterstring2 += ` AND his.in_stock_location_id in (SELECT id FROM stores WHERE branch_id=${branch_id}) `;
    }
  }
  filterstring += ` AND his.product_id=${product_id} `;
  filterstring2 += ` AND his.product_id=${product_id} `;

  let sql = ` SELECT * FROM (
				SELECT date,product_id,smallest_qty,ifnull(main_unit_price,price) AS price 
				FROM stockopening_details his ${filterstring}
				UNION ALL
				SELECT date,product_id,smallest_qty,ifnull(main_unit_price,price) AS price  
				FROM purchase_details his ${filterstring}
				UNION ALL
				SELECT date,product_id,smallest_qty,ifnull(main_unit_price,price) AS price  
				FROM transfer_details his
				WHERE his.date>='${fromdate}' AND his.date<='${todate}' ${filterstring2}
				UNION ALL
				SELECT date,product_id,smallest_qty,ifnull(main_unit_price,price) AS price  
				FROM adjustment_details his ${filterstring} AND adjustment_type_id=1
			) AS tmp ORDER BY product_id,date desc `;
  let result = await db.query(sql, { type: QueryTypes.SELECT });
  return result;
};
export const getStockLedger = async (user, filter) => {
  let branch_id = user.branch_id;
  let user_type = user.user_type;
  let user_id = user.user_id;

  let brand_id = filter.brand ? filter.brand.id : 0;
  let category_id = filter.category ? filter.category.id : 0;
  let stock_location_id = filter.stock_location ? filter.stock_location.id : 0;
  let stock_name = filter.stock_name ? filter.short_name : "";
  let filter_branch_id = filter.branch ? filter.branch.id : 0;

  let filterstring = "";
  let transferfilter = "";
  let transferfilterin = "";
  let transferfilterout = "";

  if (brand_id) {
    filterstring += ` AND his.product_id in (SELECT id FROM products WHERE brand_id=${brand_id}) `;
    transferfilter += ` AND his.product_id in (SELECT id from products WHERE brand_id=${brand_id}) `;
  }
  if (category_id != 0 && category_id != -1) {
    let category_ids = await getChildCategories($category_id);
    filterstring += ` AND his.product_id in (SELECT id from products WHERE category_id in (${category_ids})) `;
    transferfilter += ` AND his.product_id in (SELECT id from products WHERE category_id in (${category_ids})) `;
  } else {
    if (user_type == 2) {
      filterstring += ` AND his.product_id in (SELECT id from products WHERE category_id in (SELECT id FROM categories WHERE branch_id=${branch_id})) `;
      transferfilter += ` AND his.product_id in (SELECT id from products WHERE category_id in (SELECT id FROM categories WHERE branch_id=${branch_id})) `;
    }
  }
  if (stock_name) {
    if (user_type == 2) {
      filterstring += ` AND his.product_id in (SELECT id from products WHERE (name like'%${stock_name}%' OR code like'%${stock_name}%') AND category_id in (SELECT id FROM categories WHERE branch_id=${branch_id}))`;
      transferfilter += ` AND his.product_id in (SELECT id from products WHERE (name like'%${stock_name}%' OR code like'%${stock_name}%') AND category_id in (SELECT id FROM categories WHERE branch_id=${branch_id}))`;
    } else {
      filterstring += ` AND his.product_id in (SELECT id from products WHERE (name like'%${stock_name}%' OR code like'%${stock_name}%')) `;
      transferfilter += ` AND his.product_id in (SELECT id from products WHERE (name like'%${stock_name}%' OR code like'%${stock_name}%')) `;
    }
  } else {
    if (user_type == 2) {
      filterstring += ` AND his.product_id in (SELECT id from products WHERE (name like'%${stock_name}%' OR code like'%${stock_name}%') AND category_id in (SELECT id FROM categories WHERE branch_id=${branch_id}))`;
      transferfilter += ` AND his.product_id in (SELECT id from products WHERE (name like'%${stock_name}%' OR code like'%${stock_name}%') AND category_id in (SELECT id FROM categories WHERE branch_id=${branch_id}))`;
    }
  }
  if (filter_branch_id != 0) {
    filterstring += ` AND his.stock_location_id in (SELECT id FROM stores WHERE branch_id=${filter_branch_id}) `;
    transferfilterin += ` AND his.in_stock_location_id in (SELECT id FROM stores WHERE branch_id=${filter_branch_id}) `;
    transferfilterout += ` AND his.out_stock_location_id in (SELECT id FROM stores WHERE branch_id=${filter_branch_id}) `;
  }
  if (stock_location_id) {
    filterstring += ` AND his.stock_location_id=${stock_location_id} `;
    transferfilterin = ` AND his.in_stock_location_id=${stock_location_id} `;
    transferfilterout = ` AND his.out_stock_location_id=${stock_location_id} `;
  } else {
    if (user_type == 2) {
      filterstring += ` AND his.stock_location_id in (SELECT id FROM stores WHERE branch_id=${branch_id}) `;
      transferfilterin = ` AND his.in_stock_location_id in (SELECT id FROM stores WHERE branch_id=${branch_id}) `;
      transferfilterout = ` AND his.out_stock_location_id in (SELECT id FROM stores WHERE branch_id=${branch_id}) `;
    }
  }
  let fromdate = filter.fromdate
    ? filter.fromdate
    : dayjs(new Date()).format("YYYY-MM-DD");
  let openingdate = await fexecsql(
    `SELECT max(voucher_date)return1 FROM stockopenings`
  );
  let todate = filter.todate
    ? filter.todate
    : dayjs(new Date()).format("YYYY-MM-DD");
  if (fromdate < openingdate) fromdate = openingdate;

  let deleted = await DeleteQuery(
    `DELETE from tmp_stock_ledgers WHERE user_id=${user_id}`
  );
  let sql = `INSERT INTO tmp_stock_ledgers (stock_location_id,stock_location_name,category_id,
				category_name,product_id,code,name,opening,purchase,sale,stock_in,stock_out,balance,user_id )
				SELECT tmp.stock_location_id,s.name,c.id,c.name,tmp.product_id,p.code,p.name,
				sum(balance) -sum(purchase)- sum(stock_in)+sum(sale) + sum(stock_out) AS opening,
				sum(purchase),sum(sale),
				sum(stock_in)AS stock_in,sum(stock_out) AS stock_out,sum(balance) AS balance,
				${user_id} FROM (
				SELECT stock_location_id,product_id,sum(smallest_qty) AS purchase,0 AS sale, 0 AS stock_in, 0 AS stock_out, 0 AS balance 
				FROM purchase_details his WHERE date>='${fromdate}' AND date<='${todate}' ${filterstring}
				GROUP BY stock_location_id,product_id
				UNION ALL
				SELECT stock_location_id,product_id,0 AS purchase,sum(smallest_qty)+sum(foc) AS sale,0 AS stock_in,0 AS stock_out, 0 AS balance 
				FROM sale_details his WHERE date>='${fromdate}' AND date<='${todate}' ${filterstring}
				GROUP BY product_id,stock_location_id
				UNION ALL
				SELECT stock_location_id,product_id,0 AS purchase,0 AS sale,sum(smallest_qty) AS stock_in,0 AS stock_out, 0 AS balance 
				FROM adjustment_details his WHERE date>='${fromdate}' AND date<='${todate}' ${filterstring}
				AND adjustment_type_id=1 GROUP BY product_id,stock_location_id
				UNION ALL
				SELECT stock_location_id,product_id,0 AS purchase,0 AS sale,0 AS stock_in,sum(smallest_qty) AS stock_out, 0 AS balance 
				FROM adjustment_details his WHERE date>='${fromdate}' AND date<='${todate}' ${filterstring}
				AND adjustment_type_id=2 GROUP BY product_id,stock_location_id
				UNION ALL
				SELECT stock_location_id,product_id,0 AS purchase,0 AS sale,0 stock_in,sum(smallest_qty) AS stock_out, 0 AS balance 
				FROM purchasereturn_details his WHERE date>='${fromdate}' AND date<='${todate}' ${filterstring}
				GROUP BY product_id,stock_location_id
				UNION ALL
				SELECT in_stock_location_id as stock_location_id,product_id,0 AS purchase,0 AS sale,sum(smallest_qty) AS stock_in,0 AS stock_out, 0 AS balance 
				FROM transfer_details his WHERE date>='${fromdate}' AND date<='${todate}' ${transferfilter} ${transferfilterin}
				GROUP BY product_id,in_stock_location_id
				UNION ALL
				SELECT out_stock_location_id AS stock_location_id,product_id,0 AS purchase,0 AS sale,0 AS stock_in,sum(smallest_qty) AS stock_out, 0 AS balance 
				FROM transfer_details his WHERE date>='${fromdate}' AND date<='${todate}' ${transferfilter} ${transferfilterout}
				GROUP BY product_id,out_stock_location_id
				UNION ALL
				SELECT stock_location_id ,product_id,0 AS purchase,0 AS sale,0 AS stock_in,0 AS stock_out, sum(qty) AS balance 
				FROM stockbalanceviews his WHERE date>=${fromdate} AND date<='${todate}' ${filterstring}
				GROUP BY product_id,stock_location_id
				) tmp JOIN products p ON tmp.product_id=p.id 
				LEFT JOIN stores s ON tmp.stock_location_id=s.id
				LEFT JOIN categories c ON p.category_id=c.id
				GROUP BY s.name,c.name,tmp.product_id,p.code, p.name 
				ORDER BY s.name,c.name, p.code,p.name`;
  let insert = await InsertWithSqlQuery(sql);
  let result = await SelectWithSqlQuery(
    `SELECT * FROM tmp_stock_ledgers WHERE user_id=${user_id}`
  );
  return result;
};

export const getStockLedgerByDate = async (user,filter) => {
  let branch_id = user.branch_id;
  let user_type = user.user_type;
  let user_id = user.user_id;

  let brand_id = filter.brand ? filter.brand.id : 0;
  let category_id = filter.category ? filter.category.id : 0;
  let stock_location_id = filter.stock_location ? filter.stock_location.id : 0;
  let stock_name = filter.stock_name ? filter.short_name : "";
  let filter_branch_id = filter.branch ? filter.branch.id : 0;

  let filterstring = "";
  let transferfilter = "";
  let transferfilterin = "";
  let transferfilterout = "";

  if (brand_id) {
    filterstring += ` AND his.product_id in (SELECT id FROM products WHERE brand_id=${brand_id}) `;
    transferfilter += ` AND his.product_id in (SELECT id from products WHERE brand_id=${brand_id}) `;
  }
  if (category_id != 0 && category_id != -1) {
    let category_ids = await getChildCategories($category_id);
    filterstring += ` AND his.product_id in (SELECT id from products WHERE category_id in (${category_ids})) `;
    transferfilter += ` AND his.product_id in (SELECT id from products WHERE category_id in (${category_ids})) `;
  } else {
    if (user_type == 2) {
      filterstring += ` AND his.product_id in (SELECT id from products WHERE category_id in (SELECT id FROM categories WHERE branch_id=${branch_id})) `;
      transferfilter += ` AND his.product_id in (SELECT id from products WHERE category_id in (SELECT id FROM categories WHERE branch_id=${branch_id})) `;
    }
  }
  if (stock_name) {
    if (user_type == 2) {
      filterstring += ` AND his.product_id in (SELECT id from products WHERE (name like'%${stock_name}%' OR code like'%${stock_name}%') AND category_id in (SELECT id FROM categories WHERE branch_id=${branch_id}))`;
      transferfilter += ` AND his.product_id in (SELECT id from products WHERE (name like'%${stock_name}%' OR code like'%${stock_name}%') AND category_id in (SELECT id FROM categories WHERE branch_id=${branch_id}))`;
    } else {
      filterstring += ` AND his.product_id in (SELECT id from products WHERE (name like'%${stock_name}%' OR code like'%${stock_name}%')) `;
      transferfilter += ` AND his.product_id in (SELECT id from products WHERE (name like'%${stock_name}%' OR code like'%${stock_name}%')) `;
    }
  } else {
    if (user_type == 2) {
      filterstring += ` AND his.product_id in (SELECT id from products WHERE (name like'%${stock_name}%' OR code like'%${stock_name}%') AND category_id in (SELECT id FROM categories WHERE branch_id=${branch_id}))`;
      transferfilter += ` AND his.product_id in (SELECT id from products WHERE (name like'%${stock_name}%' OR code like'%${stock_name}%') AND category_id in (SELECT id FROM categories WHERE branch_id=${branch_id}))`;
    }
  }
  if (filter_branch_id != 0) {
    filterstring += ` AND his.stock_location_id in (SELECT id FROM stores WHERE branch_id=${filter_branch_id}) `;
    transferfilterin += ` AND his.in_stock_location_id in (SELECT id FROM stores WHERE branch_id=${filter_branch_id}) `;
    transferfilterout += ` AND his.out_stock_location_id in (SELECT id FROM stores WHERE branch_id=${filter_branch_id}) `;
  }
  if (stock_location_id) {
    filterstring += ` AND his.stock_location_id=${stock_location_id} `;
    transferfilterin = ` AND his.in_stock_location_id=${stock_location_id} `;
    transferfilterout = ` AND his.out_stock_location_id=${stock_location_id} `;
  } else {
    if (user_type == 2) {
      filterstring += ` AND his.stock_location_id in (SELECT id FROM stores WHERE branch_id=${branch_id}) `;
      transferfilterin = ` AND his.in_stock_location_id in (SELECT id FROM stores WHERE branch_id=${branch_id}) `;
      transferfilterout = ` AND his.out_stock_location_id in (SELECT id FROM stores WHERE branch_id=${branch_id}) `;
    }
  }
  let fromdate = filter.fromdate
    ? filter.fromdate
    : dayjs(new Date()).format("YYYY-MM-DD");
  let openingdate = await fexecsql(
    `SELECT max(voucher_date)return1 FROM stockopenings`
  );
  let todate = filter.todate
    ? filter.todate
    : dayjs(new Date()).format("YYYY-MM-DD");
  if (fromdate < openingdate) fromdate = openingdate;

  let deleted = await DeleteQuery(
    `DELETE from tmp_stock_ledgers WHERE user_id=${user_id}`
  );

  let sql =` INSERT INTO tmp_stock_ledgers (date,product_id,code,name,purchase,sale,stock_in,stock_out,balance,user_id )
				SELECT tmp.date,tmp.product_id,p.code,p.name,sum(purchase),sum(sale),
				sum(stock_in)AS stock_in,sum(stock_out) AS stock_out,sum(balance) AS balance,
				${user_id} FROM (
				SELECT date,product_id,sum(smallest_qty) AS purchase,0 AS sale, 0 AS stock_in, 0 AS stock_out, 0 AS balance 
				FROM purchase_details his WHERE date>='${fromdate}' AND date<='${todate}' ${filterstring}
				GROUP BY product_id,date
				UNION ALL
				SELECT date,product_id,0 AS purchase,sum(smallest_qty) AS sale,0 AS stock_in,0 AS stock_out, 0 AS balance 
				FROM sale_details his WHERE date>='${fromdate}' AND date<='${todate}' ${filterstring}
				GROUP BY product_id,date
				UNION ALL
				SELECT date,product_id,0 AS purchase,0 AS sale,sum(smallest_qty) AS stock_in,0 AS stock_out, 0 AS balance 
				FROM adjustment_details his WHERE date>='${fromdate}' AND date<='${todate}' ${filterstring}
				AND adjustment_type_id=1 GROUP BY product_id,date
				UNION ALL
				SELECT date,product_id,0 AS purchase,0 AS sale,0 AS stock_in,sum(smallest_qty) AS stock_out, 0 AS balance 
				FROM adjustment_details his WHERE date>='${fromdate}' AND date<='${todate}' ${filterstring}
				AND adjustment_type_id=2 GROUP BY product_id,date
				UNION ALL
				SELECT date,product_id,0 AS purchase,0 AS sale,sum(smallest_qty) AS stock_in,0 AS stock_out, 0 AS balance 
				FROM transfer_details his WHERE date>='${fromdate}' AND date<='${todate}' ${transferfilter} ${transferfilterin}
				GROUP BY product_id,date
				UNION ALL
				SELECT date,product_id,0 AS purchase,0 AS sale,0 AS stock_in,sum(smallest_qty) AS stock_out, 0 AS balance 
				FROM purchasereturn_details his WHERE date>='${fromdate}' AND date<='${todate}' ${filterstring}
				GROUP BY product_id,date
				UNION ALL
				SELECT date,product_id,0 AS purchase,0 AS sale,0 AS stock_in,sum(smallest_qty) AS stock_out, 0 AS balance 
				FROM transfer_details his WHERE date>='${fromdate}' AND date<='${todate}' ${transferfilter} ${transferfilterout}
				GROUP BY product_id,date
				UNION ALL
				SELECT '${todate}' AS date ,product_id,0 AS purchase,0 AS sale,0 AS stock_in,0 AS stock_out, sum(qty) AS balance 
				FROM stockbalanceviews his WHERE date<='${todate}' ${filterstring}
				GROUP BY product_id
				) tmp JOIN products p ON tmp.product_id=p.id 
				GROUP BY tmp.date,tmp.product_id,p.code, p.name`;
        let insert = await InsertWithSqlQuery(sql);
        sql = `UPDATE tmp_stock_ledgers
				SET tmp_stock_ledgers.balance = 
					( SELECT 
							SUM(his.qty) 
						FROM stockbalanceviews AS his
							WHERE
							tmp_stock_ledgers.product_id=his.product_id
							AND his.date<=tmp_stock_ledgers.date ${filterstring}
							AND tmp_stock_ledgers.user_id=${user_id} )`;
        let update = await UpdateWithSqlQuery(sql);
        sql = `SELECT tmp.date,tmp.product_id,tmp.code,'' AS unit_name, tmp.name,
				sum(balance) -sum(purchase)- sum(stock_in)+sum(sale) + sum(stock_out) AS opening, 
				sum(purchase) AS purchase, 
				sum(sale) AS sale, 
				sum(stock_in) AS stock_in, 
				sum(stock_out) AS stock_out, 
				sum(balance) AS balance FROM
				tmp_stock_ledgers tmp  WHERE user_id=${user_id}
				GROUP BY tmp.date,tmp.product_id,tmp.code,tmp.name
				ORDER BY tmp.code, tmp.date `;
        let result = await SelectWithSqlQuery(sql);
        return result;
};
