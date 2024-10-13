import express from "express";
import dayjs from "dayjs";
import verifyJwtToken from "../auth/VerifyJwt.js";
import { getUnitData } from "../quries/UnitQuery.js";
import {
  create,
  createPackageSizePair,
  getProductDataByCategory,
  getProductDataByCode,
  getProductDataByName,
  getProductUnitData,
  remove,
  updateProduct,
} from "../quries/ProductQuery.js";
import { getCategoryName } from "../quries/StockgroupQuery.js";
import { CustomError ,ErrorResponse} from "../helper/ErrorResponse.js";
const router = express.Router();

router.get("/fetchCategoryName", async (req, res) => {
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
        children: await getCategoryName(category.id),
      };
      output.push(obj);
    }
    res.status(200).json({ categories: output });
  } catch (err) {
    console.log(err);
    ErrorResponse(err, req, res);
  }
});

router.get("/fetchProductData", verifyJwtToken, async (req, res) => {
  try {
    let user = req.user;
    let category_id = req.query.category_id;
    let search = req.query.search;
    if (!category_id) throw new CustomError(`Invalid category`, 500);
    let stocks = await getProductDataByCategory(category_id, search);
    res.status(200).json({ stocks });
  } catch (err) {
    console.log(err);
    ErrorResponse(err, req, res);
  }
});

router.post("/create", verifyJwtToken, async (req, res) => {
  try {
    let data = req.body;
    let result = await create(data);
    res
      .status(200)
      .json({ success: true, message: "Product created successfully" });
  } catch (err) {
    console.log(err);
    ErrorResponse(err, req, res);
  }
});

router.delete("/", verifyJwtToken, async (req, res) => {
  try {
    let id = req.query.id;
    if (!id) throw new CustomError("Something went Wrong", 400);
    let result = await remove(id);
    res
      .status(200)
      .json({ message: "Product successfully deleted", success: true });
  } catch (err) {
    console.log(err);
    ErrorResponse(err, req, res);
  }
});
export default router;

router.get("/fetchProductDataByCode", async (req, res) => {
  try {
    let code = req.query.code;
    let result = await getProductDataByCode(code);
    if (result.length) {
      let product_id = result[0].id;
      let unitData = await getProductUnitData(product_id);
      return res.status(200).json({ product: result[0], unitData });
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Product not found." });
    }
  } catch (err) {
    console.log(err);
    ErrorResponse(err, req, res);
  }
});

router.get("/fetchProductDataByName", verifyJwtToken, async (req, res) => {
  try {
    let name = req.query.name;
    let user = req.user;
    let result = await getProductDataByName(name, user, 10);
    res.status(200).json({ products: result });
  } catch (err) {
    console.log(err);
    ErrorResponse(err, req, res);
  }
});
router.get("/fetchProductDataById", verifyJwtToken, async (req, res) => {
  try {
    let id = req.query.id;
    let unitData = await getProductUnitData(id);
    return res.status(200).json({ unitData });
  } catch (err) {
    console.log(err);
    ErrorResponse(err, req, res);
  }
});

router.get("/fetchAllUnitsAndProducts", verifyJwtToken, async (req, res) => {
  try {
    let user = req.user;
    let units = await getUnitData();
    let products = await getProductDataByName("", user, 10);
    res.status(200).json({ products, units });
  } catch (err) {
    console.log(err);
    ErrorResponse(err, req, res);
  }
});
router.post("/createPackageSizePair", verifyJwtToken, async (req, res) => {
  try {
    let user = req.user;
    let data = req.body;
    let product_id = req.query.product_id;
    if (product_id && data) {
      let result = await createPackageSizePair(data, product_id);
      let message = result
        ? "Successfully updated"
        : "Failed! Please try again later.";
      res.status(200).json({ message });
    } else {
      throw new Error("Invalid data.");
    }
  } catch (err) {
    console.log(err);
    ErrorResponse(err, req, res);
  }
});
router.patch("/updateProduct",async(req,res)=>{
  try {
    let data = req.body;
    let product_id = req.query.id;
    let result = await updateProduct(product_id,data);
    res
      .status(200)
      .json({ success: true, message: "Updated Successfully." });
  } catch (err) {
     console.log(err);
     ErrorResponse(err, req, res);
   }
})