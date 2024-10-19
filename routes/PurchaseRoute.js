import express, { response } from "express";
const router = express.Router();
import { ErrorResponse } from "../helper/ErrorResponse.js";
import { fexecsql } from "../helper/QueryHelper.js";
import {
  getAccountData,
  getCashBankAccountData,
} from "../quries/AccountQuery.js";
import verifyJwtToken from "../auth/VerifyJwt.js";
import { getMerchantDataByBranch } from "../quries/MerchantQuery.js";
import { getStoreData } from "../quries/StoreQuery.js";
import { getPayType } from "../quries/SystemQuery.js";
import { getCurrencyData } from "../quries/CurrencyQuery.js";
import { getCompanyData } from "../quries/CompanyQuery.js";
import { getbranchesData } from "../quries/BranchQuery.js";
import {
  create,
  getPurchaseData,
  getPurchaseItemData,
  getPurchaseItemUnitData,
  remove,
  update,
} from "../quries/PurchaseQuery.js";

router.get("/fetchNewPurchaseVoucherData", verifyJwtToken, async (req, res) => {
  // to create new purchase
  try {
    let user = req.user;
    let data = {};
    let account_group_id = await fexecsql(`SELECT max(account_group_id) return1 
												FROM system_accountgroups WHERE name='PURCHASE'`);

    let id = await fexecsql(`SELECT 
					ifnull(max(account_id),0) return1 FROM account_branches his 
					JOIN accounts a ON his.account_id=a.id
					WHERE a.account_group_id=${account_group_id} 
					AND his.branch_id=${user.branch_id}`);

    data["default_purchase_account"] = { id };
    if (!data["default_purchase_account"]["id"]) {
      data["default_purchase_account"]["id"] =
        await fexecsql(`SELECT account_id return1
								FROM system_accounts WHERE name='PURCHASE'`);
    }
    data["merchants"] = await getMerchantDataByBranch(user);
    data["stock_locations"] = await getStoreData();
    data["pay_types"] = await getPayType();
    data["currencies"] = await getCurrencyData();
    data["company_data"] = await getCompanyData();
    data["accounts"] = await getAccountData(account_group_id);
    data["cashbooks"] = await getCashBankAccountData();
    data["branches"] = await getbranchesData(-1);
    res.status(200).json(data);
  } catch (err) {
    console.log(err);
    ErrorResponse(err, req, res);
  }
});

router.get("/fetchPurchaseData", verifyJwtToken, async (req, res) => {
  try {
    let filter = req.session.filter;
    if(!filter){
      res.status(419).json({message:"Session expired. Please login again."});
      return;
    }
    let user = req.session.user;
    let data = await getPurchaseData(filter, user);
    res.status(200).json({ vouchers: data });
  } catch (err) {
    console.log(err);
    ErrorResponse(err, req, res);
  }
});

router.post("/create", verifyJwtToken, async (req, res) => {
  try {
    let data = req.body;
    let user = req.user;
    // res.status(200).json({message:"Purchase voucher created successfully!"})
    await create(data, user);
    res.status(200).json({ message: "Purchase voucher successfully saved" });
  } catch (err) {
    ErrorResponse(err, req, res);
  }
});

router.get("/update", verifyJwtToken, async (req, res) => {
  try {
    let data = {};
    let user = req.user;
    let filter = req.session.filter;
    let id = req.query.id;

    data["company_data"] = await getCompanyData(1);
    data["is_vat_enabled"] =
      data["company_data"]["vat_charge_value"] > 0 ? true : false;
    data["is_service_enabled"] =
      data["company_data"]["service_charge_value"] > 0 ? true : false;
    data["purchase"] = await getPurchaseData(filter, user, id);
    data["purchase_details"] = await getPurchaseItemData(id);
    data["unit"] = await getPurchaseItemUnitData(id);
    res.status(200).json({ purchase_data: data });
  } catch (err) {
    ErrorResponse(err, req, res);
  }
});
router.post("/update", verifyJwtToken, async (req, res) => {
  try {
    let data = req.body;
    let user = req.user; 
    let id = req.query.id;

    await update(data, user, id);
    res.status(200).json({ message: "Purchase voucher successfully updated" });
  } catch (err) {
    ErrorResponse(err, req, res);
  }
});
router.get("/delete", async (req, res) => {
  try {
    let id = req.query.id;
    let deleted = await remove(id);
    if (deleted) {
      res.status(200).json({ message: "Voucher deleted successfully" });
    }
  } catch (err) {
    ErrorResponse(err, req, res);
  }
});
export default router;
