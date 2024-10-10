import express from "express";
import cors from "cors";
import session from "express-session";
import LoginRoute from "./routes/LoginRoute.js";
import ProductRoute from "./routes/ProductRoute.js";
import PurchaseRoute from "./routes/PurchaseRoute.js";
import StockgroupRoute from "./routes/StockgroupRoute.js";
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
  req.session.filter = data;
  res.sendStatus(200);
});

app.use("/login", LoginRoute);
app.use("/products", ProductRoute);
app.use("/purchases", PurchaseRoute);
app.use("/stockgroups", StockgroupRoute);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
