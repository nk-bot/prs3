import formidable from "formidable";
import fs from "fs";
import Papa from "papaparse";
import { supabase } from "../../supabaseClient";

import { scrapeAmazon } from "../../scrapers/amazon";
import { scrapeMyntra } from "../../scrapers/myntra";
import { scrapeMothercare } from "../../scrapers/mothercare";
import { scrapeFirstCry } from "../../scrapers/firstcry";

export const config = {
  api: { bodyParser: false }
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const form = formidable();

  const [_, files] = await form.parse(req);
  const file = files.file?.[0];

  if (!file) {
    return res.status(400).json({ error: "CSV file missing" });
  }

  const csv = fs.readFileSync(file.filepath, "utf-8");
  const parsed = Papa.parse(csv, { header: true });

  const urls = parsed.data.map(r => r.url).filter(Boolean);
  let success = 0;

  for (const url of urls) {
    try {
      let data = null;

      if (url.includes("amazon")) data = await scrapeAmazon(url);
      else if (url.includes("myntra")) data = await scrapeMyntra(url);
      else if (url.includes("mothercare")) data = await scrapeMothercare(url);
      else if (url.includes("firstcry")) data = await scrapeFirstCry(url);

      if (data?.name) {
        await supabase.from("products").upsert(data);
        success++;
      }
    } catch (e) {
      console.error("Scrape failed:", url, e.message);
    }
  }

  return res.status(200).json({
    message: "Scraping completed",
    total: urls.length,
    success
  });
}
