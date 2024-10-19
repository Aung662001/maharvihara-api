import express, { response } from "express";
const router = express.Router();
import { ErrorResponse } from "../helper/ErrorResponse.js";
import { fexecsql } from "../helper/QueryHelper.js";
import verifyJwtToken from "../auth/VerifyJwt.js";
import {
  calculateUnitBalance,
  getStockBalanceFifoData,
  getStockBalancesData,
} from "../quries/StockBalanceQuery.js";

router.get("/fetchStockBalancesData", verifyJwtToken, async (req, res) => {
  try {
    let user = req.user;
    let filter = req.session.filter;

    if (!filter) {
      res.status(419).json({ message: "Session Expired. Please login again." });
      return;
    }

    let result = await getStockBalancesData(user, filter);

    let promise = result.map(async (element, index) => {
      let balance = await calculateUnitBalance(
        element.product_id,
        element.balance
      );
      element.bal = balance;
      return element;
    });

    let updatedResult = await Promise.all(promise);

    res.status(200).json(updatedResult);
  } catch (err) {
    console.log(err);
    ErrorResponse(err, req, res);
  }
});
router.get("/fetchStockBalancesFifoData", verifyJwtToken, async (req, res) => {
  try {
    let user = req.user;
    let filter = req.session.filter;
    if (!filter) {
        res.status(419).json({ message: "Session Expired. Please login again." });
        return;
      }
    let data = await getStockBalanceFifoData(user, filter);
    res.status(200).json(data);
  } catch (err) {
    console.log(err);
    ErrorResponse(err, req, res);
  }
});
export default router;
