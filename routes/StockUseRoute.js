import express, { response } from "express";
import { createNewStockUse } from "../quries/StockUseQuery.js";
import verifyJwtToken from "../auth/VerifyJwt.js";
import { fexecsql } from "../helper/QueryHelper.js";
import { getMerchantDataByBranch } from "../quries/MerchantQuery.js";
import { getStoreData } from "../quries/StoreQuery.js";
import { getPayType } from "../quries/SystemQuery.js";
import { getAccountData, getCashBankAccountData } from "../quries/AccountQuery.js";
import { getbranchesData } from "../quries/BranchQuery.js";
import { ErrorResponse } from "../helper/ErrorResponse.js";
const router = express.Router();

router.post("/createNewStockUseVoucher",verifyJwtToken, async (req, res) => {
  try {
    let user = req.user;
    let data = req.body;
    let response = await createNewStockUse(data,user);
    res.status(200).json({message:"Successfully Created."});
  } catch (err) {
    console.log(err);
    ErrorResponse(err, req, res);
  }
});
router.get("/fetchNewStockUseVoucherData", verifyJwtToken, async (req, res) => {
    // to create new purchase
    try {
      let user = req.user;
      let data = {};
      let account_group_id = await fexecsql(`SELECT max(account_group_id) return1 
                                                  FROM system_accountgroups WHERE name='sale'`);
                          
                          let id = await fexecsql(`SELECT 
                            ifnull(max(account_id),0) return1 FROM account_branches his 
                            JOIN accounts a ON his.account_id=a.id
                            WHERE a.account_group_id=${account_group_id} 
                            AND his.branch_id=${user.branch_id}`);
      data["default_sale_account"] =  {id} ;
      if (!data["default_sale_account"]["id"]) {
        data["default_sale_account"]["id"] =
          await fexecsql(`SELECT account_id return1
                                  FROM system_accounts WHERE name='sale'`);
      }
      data["merchants"] = await getMerchantDataByBranch(user);
      data["stock_locations"] = await getStoreData();
    //   data["pay_types"] = await getPayType();
    //   data["currencies"] = await getCurrencyData();
    //   data["company_data"] = await getCompanyData();
      data["accounts"] = await getAccountData(account_group_id);
      data["cashbooks"] = await getCashBankAccountData();
      data["branches"] = await getbranchesData(-1);
      res.status(200).json(data);
    } catch (err) {
      console.log(err);
      ErrorResponse(err, req, res);
    }
  });

export default router;
