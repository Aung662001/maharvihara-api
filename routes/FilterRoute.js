import express from "express";
import { ErrorResponse } from "../helper/ErrorResponse";
import db from "../database/db";
import { QueryTypes } from "sequelize";

router.post("/", async (req, res) => {
  let data = req.body;
  req.session.filter = data;
  res.sendStatus(200);
});
const router = express.Router();
