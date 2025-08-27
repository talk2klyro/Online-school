import { Client } from "@notionhq/client";

export default async function handler(req, res) {
  try {
    const notion = new Client({ auth: process.env.NOTION_TOKEN });
    const parentPageId = process.env.PARENT_PAGE_ID;
    const dbTitle = process.env.DB_TITLE || "School Register";

    // Find if DB already exists in the page
    const children = await notion.blocks.children.list({
      block_id: parentPageId,
    });

    let db = children.results.find((b) => b.type === "child_database");

    if (!db) {
      // Create a new database if not found
      db = await notion.databases.create({
        parent: { page_id: parentPageId },
        title: [{ type: "text", text: { content: dbTitle } }],
        properties: {
          "S/N": { number: {} },
          "Name": { title: {} },
          "Phone": { rich_text: {} },
          "Week1": { checkbox: {} },
          "Week2": { checkbox: {} },
          "Week3": { checkbox: {} },
          "Week4": { checkbox: {} },
          "Week5": { checkbox: {} },
          "Week6": { checkbox: {} },
          "Week7": { checkbox: {} },
          "Week8": { checkbox: {} },
          "Week9": { checkbox: {} },
          "Week10": { checkbox: {} },
          "Week11": { checkbox: {} },
          "Week12": { checkbox: {} },
        },
      });
    }

    res.status(200).json({ databaseId: db.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to ensure DB" });
  }
  }
