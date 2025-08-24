import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_KEY });
const databaseId = process.env.NOTION_DB;

export default async function handler(req, res) {
  if (req.method === "POST") {
    // Add a student
    const { serial, name, phone } = JSON.parse(req.body);
    try {
      await notion.pages.create({
        parent: { database_id: databaseId },
        properties: {
          Serial: { number: Number(serial) },
          Name: { title: [{ text: { content: name } }] },
          Phone: { rich_text: [{ text: { content: phone } }] },
        },
      });
      res.status(200).json({ ok: true, message: "Student saved ✅" });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  } else if (req.method === "GET") {
    // List students
    try {
      const response = await notion.databases.query({ database_id: databaseId });
      const students = response.results.map(page => ({
        id: page.id,
        serial: page.properties.Serial.number,
        name: page.properties.Name.title[0]?.plain_text || "",
        phone: page.properties.Phone.rich_text[0]?.plain_text || ""
      }));
      res.status(200).json(students);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
