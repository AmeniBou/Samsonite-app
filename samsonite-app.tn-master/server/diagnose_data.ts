import { getProducts, getCategories, getProduct } from "./src/services/prestashop.service";
import fs from "fs";
import dotenv from "dotenv";
import path from "path";

// Load .env
dotenv.config();

async function diagnose() {
    console.log("Config PS URL:", process.env.PS_API_URL);

    try {
        console.log("Fetching categories...");
        const categories = await getCategories();
        fs.writeFileSync("./categories_diag.json", JSON.stringify(categories, null, 2));
        console.log(`Saved ${categories.length} categories to ./categories_diag.json`);

        console.log("Fetching sample products...");
        const products = await getProducts();
        fs.writeFileSync("./products_diag.json", JSON.stringify(products.slice(0, 50), null, 2));
        console.log(`Saved 50 sample products to ./products_diag.json`);

        // Check for missing references
        const missingRef = products.filter(p => !p.reference || p.reference.trim() === "");
        console.log(`Products with missing reference: ${missingRef.length} / ${products.length}`);

        // Check category mapping
        const catStats: Record<string, number> = {};
        products.forEach(p => {
            const catId = p.id_category_default;
            if (catId) {
                catStats[catId] = (catStats[catId] || 0) + 1;
            }
        });
        console.log("Category Distribution (ID: Count):", catStats);

    } catch (error) {
        console.error("Diagnosis failed:", error);
    }
}


diagnose();
