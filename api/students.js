import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const databaseId = process.env.DATABASE_ID; // optional override

// Utility: get or ensure DB
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

    if (req.method === "GET") {
      // List all students
      const query = await notion.databases.query({ database_id: dbId });
      const students = query.results.map((p) => ({
        id: p.id,
        sn: p.properties["S/N"].number,
        name: p.properties["Name"].title[0]?.plain_text || "",
        phone: p.properties["Phone"].rich_text[0]?.plain_text || "",
        ...Object.fromEntries(
          Array.from({ length: 12 }, (_, i) => [
            `week${i + 1}`,
            p.properties[`Week${i + 1}`]?.checkbox || false,
          ])
        ),
      }));
      res.status(200).json(students);
    }

    else if (req.method === "POST") {
      // Add new student
      const { sn, name, phone } = req.body;
      const response = await notion.pages.create({
        parent: { database_id: dbId },
        properties: {
          "S/N": { number: sn ? Number(sn) : null },
          "Name": { title: [{ text: { content: name } }] },
          "Phone": { rich_text: [{ text: { content: phone || "" } }] },
        },
      });
      res.status(201).json({ id: response.id });
    }

    else {
      res.status(405).json({ error: "Method not allowed" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Students API failed" });
  }
  }
