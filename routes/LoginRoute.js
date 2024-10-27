import express from "express";
import { ErrorResponse } from "../helper/ErrorResponse.js";
import db from "../database/db.js";
import { QueryTypes } from "sequelize";
import dayjs from "dayjs";
import { unserialize, serialize } from "php-serialize";
import bcrypt from "bcrypt";
import getAccessToken from "../jwt/JWT.js";
const router = express.Router();

router.get("/", async (req, res) => {
  console.log("login route reached...");
  try {
    const { email, password } = req.query;
    if (email && password) {
      let sql = "select * from users his left join user_group ug on ug.user_id = his.id "+ 
          "left join `groups` g on g.id = ug.group_id where his.email=$email";

      let user = await db.query(sql, {
        bind: { email: email },
        type: QueryTypes.SELECT,
      });
      if (user.length) {
        user = user[0];
        let permission = unserialize(user.permission);
        let result = bcrypt.compareSync(password, user.password);
        if (result) {
          user.permission = "";
          user.password = "";
          let token = await getAccessToken(user);
          //set filter session
          let today = dayjs(new Date()).format("YYYY-MM-DD");
          req.session.user = user;
          req.session.filter = { fromdate: today, todate: today };

          console.log("Message: session setted");
          console.log("Message: Login successfull!");
          res.status(200).json({ token: token, user, permission });
        } else {
          res.status(400).json({ message: "Email or Password is incorrect" });
        }
      } else {
        res.status(400).json({ message: "Email or Password is incorrect" });
      }
    } else {
      res.status(400).json({ message: "Please fill both email and password" });
    }
  } catch (err) {
    console.log(err);
    ErrorResponse(err, req, res);
  }
});

export default router;
