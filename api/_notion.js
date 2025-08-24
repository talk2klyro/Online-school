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
      res.status(200).json({ ok: true });
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
        phone: page.properties.Phone.rich_text[0]?.plain_text || "",
        weeks: {
          Week1: page.properties.Week1?.checkbox || false,
          Week2: page.properties.Week2?.checkbox || false,
          Week3: page.properties.Week3?.checkbox || false,
          Week4: page.properties.Week4?.checkbox || false,
          Week5: page.properties.Week5?.checkbox || false,
          Week6: page.properties.Week6?.checkbox || false,
          Week7: page.properties.Week7?.checkbox || false,
          Week8: page.properties.Week8?.checkbox || false,
          Week9: page.properties.Week9?.checkbox || false,
          Week10: page.properties.Week10?.checkbox || false,
          Week11: page.properties.Week11?.checkbox || false,
          Week12: page.properties.Week12?.checkbox || false,
        }
      }));
      res.status(200).json(students);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  } else if (req.method === "PUT") {
    // Update attendance
    const { id, week, present } = JSON.parse(req.body);
    try {
      await notion.pages.update({
        page_id: id,
        properties: {
          [week]: { checkbox: present }
        }
      });
      res.status(200).json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
  }
