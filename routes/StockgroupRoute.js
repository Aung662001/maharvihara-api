import express from "express";
import dayjs from "dayjs";
import verifyJwtToken from "../auth/VerifyJwt.js";
import { create, getAllCategories, getCategoryName, getChildCategories, remove, update} from "../quries/StockgroupQuery.js";
import { CustomError ,ErrorResponse} from "../helper/ErrorResponse.js";
const router = express.Router();

router.get("/fetchStockGroupNames", async (req, res) => {
    try {
      let output = [];
      let categories = await getCategoryName(0);
  
      for (let category of categories) {
        let obj = {
          id: category.id,
          name: category.name,
          account_id: category.account_id,
          parent_id: category.parent_id,
          active: category.active,
          children: await getChildCategoriesWithParentId(category.id),
        };
        output.push(obj);
      }
      res.status(200).json({ categories: output });
    } catch (err) {
      console.log(err);
      ErrorResponse(err, req, res);
    }
  });
  const getChildCategoriesWithParentId = async(id) =>{
    let output=[];
    let categories = await getCategoryName(id);
    for (let category of categories) {
      let obj = {
        id: category.id,
        name: category.name,
        account_id: category.account_id,
        parent_id: category.parent_id,
        active: category.active,
        children: await getChildCategoriesWithParentId(category.id),
      };
      output.push(obj);
    }
    return output;
  }

  router.get("/fetchAllCategoriesData", async (req, res) => {
    try {
      let categories = await getAllCategories();
      res.status(200).json({ categories });
    } catch (err) {
      console.log(err);
      ErrorResponse(err, req, res);
    }
  });

  router.post("/crateStockGroup",async (req,res)=>{
    try {
      let data = req.body;
      let result = await create(data);
      res.status(200).json({ message:"Successfully Created." });
    } catch (err) {
      console.log(err);
      ErrorResponse(err, req, res);
    }
  })
  router.patch("/updateStockGroup",async (req,res)=>{
    try {
      let data = req.body;
      let result = await update(data);
      res.status(200).json({ message:"Successfully Updated." });
    } catch (err) {
      console.log(err);
      ErrorResponse(err, req, res);
    }
  }); 
  router.delete("/deleteStockGroup",async (req,res)=>{
    try {
      // let data = req.body;
      let id = req.query.id;
      let result = await remove(id);
      res.status(200).json({ message:"Successfully Deleted." });
    } catch (err) {
      console.log(err);
      ErrorResponse(err, req, res);
    }
  })

export default router;