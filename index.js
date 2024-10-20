import express from "express";
import cors from "cors";
import session from "express-session";
import LoginRoute from "./routes/LoginRoute.js";
import ProductRoute from "./routes/ProductRoute.js";
import PurchaseRoute from "./routes/PurchaseRoute.js";
import StockgroupRoute from "./routes/StockgroupRoute.js";
import MerchantRoute from "./routes/MerchantRoute.js";
import StockUseRoute from "./routes/StockUseRoute.js";
import AdjustmentRoute from "./routes/AdjustmentRoute.js";
import StockBalanceRoute from "./routes/StockBalanceRoute.js";
import StockLedgerRoute from "./routes/StockLedgerRoute.js";
import UnitRoute from "./routes/UnitRoute.js";
import dayjs from "dayjs";

const app = express();
const port = 3000;

// Serve static files
app.use(express.static("public"));
app.use(cors());
app.use(express.json());

app.use(
  session({
    secret: "mmc",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 86400000 },
  })
);

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});
app.get("/test", (req, res) => {
  res.status(200).json({ success: true, message: "Sverver reached." });
});

app.post("/setfilters", async (req, res) => {
  let data = req.body;
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

app.use("/login", LoginRoute);
app.use("/products", ProductRoute);
app.use("/purchases", PurchaseRoute);
app.use("/stockgroups", StockgroupRoute);
app.use("/merchants", MerchantRoute);
app.use("/stockuses", StockUseRoute);
app.use("/adjustments", AdjustmentRoute);
app.use("/stockbalance", StockBalanceRoute);
app.use("/stockledger", StockLedgerRoute);
app.use("/units", UnitRoute);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
