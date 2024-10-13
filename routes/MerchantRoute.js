import express from "express";
import { ErrorResponse } from "../helper/ErrorResponse.js";
import db from "../database/db.js";
import { QueryTypes } from "sequelize";
import dayjs from "dayjs";
import bcrypt from "bcrypt";
import getAccessToken from "../jwt/JWT.js";
import { createMerchant, deleteMerchant, getActiveMerchant, getSuppliers, updateMerchant } from "../quries/MerchantQuery.js";
const router = express.Router();

router.get("/getAllSuppilers", async (req, res) => {
  try {
    let result = await getSuppliers();
    res.status(200).json({merchants:result})
  } catch (err) {
    console.log(err);
    ErrorResponse(err, req, res);
  }
});

router.post("/createNewMerchant",async(req,res) =>{
  try {
    let data = req.body;
    let result = await createMerchant(data);
    res.status(200).json({message:"Merchant created successfully."})
  } catch (err) {
    console.log(err);
    ErrorResponse(err, req, res);
  }
})
router.post("/updateMerchant",async(req,res) =>{
  try {
    let data = req.body;
    let result = await updateMerchant(data);
    res.status(200).json({message:"Merchant updated successfully."})
  } catch (err) {
    console.log(err);
    ErrorResponse(err, req, res);
  }
});
router.delete("/deleteMerchant",async(req,res) =>{
  try {
    let id = req.query.id;
    let result = await deleteMerchant(id);
    res.status(200).json({message:"Merchant deleted successfully."})
  } catch (err) {
    console.log(err);
    ErrorResponse(err, req, res);
  }
})
export default router;
