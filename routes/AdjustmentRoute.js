import express from "express";
import { ErrorResponse } from "../helper/ErrorResponse.js";
import db from "../database/db.js";
import { QueryTypes } from "sequelize";
import dayjs from "dayjs";
import bcrypt from "bcrypt";
import getAccessToken from "../jwt/JWT.js";
import {
  createMerchant,
  deleteMerchant,
  getActiveMerchant,
  getSuppliers,
  updateMerchant,
} from "../quries/MerchantQuery.js";
import { getActiveStore, getStoreData } from "../quries/StoreQuery.js";
import { createNewAdjustmentVoucher, getAdjustmentData, getAdjustmentItemData, getAdjustmentItemUnitData, getAdjustmentTypes, removeAdjustmentVoucher, updateAdjustmentVoucher } from "../quries/AdjustmentQuery.js";
import verifyJwtToken from "../auth/VerifyJwt.js";
const router = express.Router();

router.get("/getVoucherDefaultData", async (req, res) => {
  try {
    let stock_locations = await getStoreData();
    let adjustment_types = await getAdjustmentTypes();
    res.status(200).json({ stock_locations, adjustment_types });
  } catch (err) {
    console.log(err);
    ErrorResponse(err, req, res);
  }
});

router.get("/getAdjustmentData",async (req, res) => {
    try{
        let filter = req.session.filter;
        let user =req.user? req.user :{};
        if (!filter) {
          res.status(419).json({ message: "Session Expired. Please login again." });
          return;
        }
        let result = await getAdjustmentData(filter,user);
        res.status(200).json(result);
    } catch (err) {
        console.log(err);
        ErrorResponse(err, req, res);
      }
})
router.get("/fetchUpdateVoucherData",verifyJwtToken,async (req, res) => {
  try{
    let data = {};
    let user = req.user;
    let filter = req.session.filter;
    let id = req.query.id;
    if (!filter) {
      res.status(419).json({ message: "Session Expired. Please login again." });
      return;
    }
    data["stockuse"] = await getAdjustmentData(filter, user, id);
    data["stockuse_details"] = await getAdjustmentItemData(id);
    data["unit"] = await getAdjustmentItemUnitData(id);
    res.status(200).json({ stockuse_data: data });

  }  catch (err) {
        console.log(err);
        ErrorResponse(err, req, res);
      } 
})
router.post("/createNewStockUseVoucher",verifyJwtToken, async (req, res) => {
  try {
    let data = req.body;
    let user = req.user;
    let result = await createNewAdjustmentVoucher(user,data)
    res.status(200).json({ message:"Successfully."});
  } catch (err) {
    console.log(err);
    ErrorResponse(err, req, res);
  }
});
router.post("/updateStockUseVoucher",verifyJwtToken, async (req, res) => {
    try {
      let data = req.body;
      let user = req.user;
      let id = req.query.id;
      if(!data || !user || !id){
        res.status(400).json({message: "Invalid data. Please try again."})
      }
      let result = await updateAdjustmentVoucher(user,data,id)
      res.status(200).json({ message:"Updated Successfully."});
    } catch (err) {
      console.log(err);
      ErrorResponse(err, req, res);
    }
  });
router.delete("/deleteAdjustmentVoucher",verifyJwtToken, async (req,res)=>{
  try {
    let id = req.query.id;
    let deleted = await removeAdjustmentVoucher(id);
    if (deleted) {
      res.status(200).json({ message: "Voucher deleted successfully" });
    }
  } catch (err) {
    ErrorResponse(err, req, res);
  }
})
export default router;
