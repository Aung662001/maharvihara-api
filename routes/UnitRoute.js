import express from "express"
import verifyJwtToken from "../auth/VerifyJwt.js";
import { fexecsql } from "../helper/QueryHelper.js";
import { ErrorResponse } from "../helper/ErrorResponse.js";
import { addUnit, deleteUnit, getUnitData, updateUnit } from "../quries/UnitQuery.js";
const router = express.Router();

router.post("/addNewUnit", async (req, res) => {
  try {
    let data = req.body;
    if (!data) {
      throw new Error("Invalid data.");
    }
    let result = await addUnit(data);
    res.status(200).json({ message: "Successfully added." });
  } catch (err) {
    console.log(err);
    ErrorResponse(err, req, res);
  }
});
router.post("/updateUnit", async (req, res) => {
    try {
        let data = req.body;
        if (!data.short_name || !data.name) {
          throw new Error("Invalid data.");
        }
        let result = await updateUnit(data);
        res.status(200).json({ message: "Successfully updated." });
      } catch (err) {
        console.log(err);
        ErrorResponse(err, req, res);
      }
});
router.delete("/deleteUnit",async (req,res)=>{
    try {
        let id = req.query.id;
        if (!id) {
          throw new Error("No unit found to delete.");
        }
        let result = await deleteUnit(id);
        res.status(200).json({ message: "Successfully deleted." });
      } catch (err) {
        console.log(err);
        ErrorResponse(err, req, res);
      } 
});
router.get("/fetchAllUnits",async (req,res)=>{
    try{
        let units  = await getUnitData();
        res.status(200).json(units);
    } catch (err) {
        console.log(err);
        ErrorResponse(err, req, res);
      } 
});
export default router;
