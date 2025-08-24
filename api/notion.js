import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DATABASE_ID = process.env.NOTION_DB_ID;

export async function getStudents() {
  const pages = await notion.databases.query({ database_id: DATABASE_ID });
  return pages.results.map(parseStudentFromPage);
}

function parseStudentFromPage(page) {
  const p = page.properties || {};
  const rec = {
    pageId: page.id,
    SN: p["S/N"]?.number ?? null,
    Name: (p["Name"]?.title || []).map(x=>x.plain_text).join('') || '',
    Phone: (p["Phone"]?.rich_text || []).map(x=>x.plain_text).join('') || ''
  };
  let presentCount = 0;
  for (let i=1;i<=12;i++){
    rec[`Week${i}`] = !!(p[`Week${i}`]?.checkbox);
    if(rec[`Week${i}`]) presentCount++;
  }
  rec.attendancePercent = Math.round(presentCount/12*100);
  return rec;
}

export async function addStudent({ SN, Name, Phone }) {
  await notion.pages.create({
    parent: { database_id: DATABASE_ID },
    properties: {
      "S/N": { number: SN },
      "Name": { title: [{ text: { content: Name } }] },
      "Phone": { rich_text: [{ text: { content: Phone } }] }
    }
  });
}
