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
  if (req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const dbId = await getDatabaseId();
    const { id, week, present } = req.body;

    await notion.pages.update({
      page_id: id,
      properties: {
        [week]: { checkbox: present },
      },
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Attendance update failed" });
  }
}
