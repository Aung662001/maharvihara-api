import express, { response } from "express";
const router = express.Router();
import { ErrorResponse } from "../helper/ErrorResponse.js";
import { fexecsql } from "../helper/QueryHelper.js";
import verifyJwtToken from "../auth/VerifyJwt.js";
import {
  getStockLedger,
  getStockLedgerByDate,
} from "../quries/StockBalanceQuery.js";

router.get("/fetchStockLedgerData", verifyJwtToken, async (req, res) => {
  try {
    let user = req.user;
    let filter = req.session.filter;
    if (!filter) {
      res.status(419).json({ message: "Session Expired. Please login again." });
      return;
    }
    let result = await getStockLedger(user, filter);
    res.status(200).json(result);
  } catch (err) {
    console.log(err);
    ErrorResponse(err, req, res);
  }
});
router.get("/fetchStockLedgerByDateData", verifyJwtToken, async (req, res) => {
  try {
    let user = req.user;
    let filter = req.session.filter;
    if (!filter) {
      res.status(419).json({ message: "Session Expired. Please login again." });
      return;
    }
    let result = await getStockLedgerByDate(user, filter);
    res.status(200).json(result);
  } catch (err) {
    console.log(err);
    ErrorResponse(err, req, res);
  }
});

export default router;
