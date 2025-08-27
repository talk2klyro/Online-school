import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const databaseId = process.env.DATABASE_ID;

async function getDatabaseId() {
  if (databaseId) return databaseId;
  const parentPageId = process.env.PARENT_PAGE_ID;
  const children = await notion.blocks.children.list({ block_id: parentPageId });
  const db = children.results.find((b) => b.type === "child_database");
  return db.id;
}

export default async function handler(req, res) {
  try {
    const dbId = await getDatabaseId();
    const query = await notion.databases.query({ database_id: dbId });
    const rows = query.results.map((p) => {
      const obj = {
        sn: p.properties["S/N"].number || "",
        name: p.properties["Name"].title[0]?.plain_text || "",
        phone: p.properties["Phone"].rich_text[0]?.plain_text || "",
      };
      for (let i = 1; i <= 12; i++) {
        obj[`week${i}`] = p.properties[`Week${i}`]?.checkbox ? "Present" : "Absent";
      }
      return obj;
    });

    // Convert to CSV
    const header = ["S/N", "Name", "Phone", ...Array.from({ length: 12 }, (_, i) => `Week${i + 1}`)];
    const csvRows = [
      header.join(","),
      ...rows.map((r) => header.map((h) => `"${r[h.toLowerCase()] || ""}"`).join(",")),
    ];

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=attendance.csv");
    res.status(200).send(csvRows.join("\n"));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Export failed" });
  }
}
