import express from "express";
import { ErrorResponse } from "../helper/ErrorResponse.js";
import db from "../database/db.js";
import { QueryTypes } from "sequelize";
import dayjs  from "dayjs";
const router = express.Router();

router.post("/", async (req, res) => {
  let data = req.body;
  req.session.filter = data;
  res.sendStatus(200);
});

router.post("/setfilters", async (req, res) => {
  let data = req.body;
  console.log(data)
  let today = dayjs(new Date()).format("YYYY-MM-DD");
  let filterdata = { fromdate: today, todate: today };
  if (data.category && data.category.id) {
    filterdata.category = data.category;
  }
  if (data.brand && data.brand.id) {
    filterdata.brand = data.brand;
  }
  if (data.stock_location && data.stock_location.id) {
    filterdata.stock_location = data.stock_location;
  }
  if (data.branch && data.branch.id) {
    filterdata.branch = data.branch;
  }
  if (data.fromdate) {
    filterdata.fromdate = data.fromdate;
  }
  if (data.todate) {
    filterdata.todate = data.todate;
  }
  if (data.stock_name) {
    filterdata.stock_name = data.stock_name;
  }
  req.session.filter = filterdata;
  res.sendStatus(200);
});

router.get("/removeFilter", async (req, res) => {
  req.session = null;
  res.sendStatus(200);
});

export default router;