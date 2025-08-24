import { Client } from "@notionhq/client";
import ExcelJS from "exceljs";

const notion = new Client({ auth: process.env.NOTION_KEY });
const databaseId = process.env.NOTION_DB;

export default async function handler(req, res) {
  if (req.method === "GET" && req.query.export === "xlsx") {
    try {
      const studentFilter = req.query.student; // new filter
      const response = await notion.databases.query({ database_id: databaseId });

      let students = response.results.map(page => {
        const weeks = [];
        for (let i = 1; i <= 12; i++) {
          weeks.push(page.properties[`Week${i}`]?.checkbox ? "P" : "A");
        }
        const totalPresent = weeks.filter(w => w === "P").length;
        const percentage = (totalPresent / 12) * 100;
        return {
          Serial: page.properties.Serial.number,
          Name: page.properties.Name.title[0]?.plain_text || "",
          Phone: page.properties.Phone.rich_text[0]?.plain_text || "",
          ...Object.fromEntries(weeks.map((val, i) => [`Week${i + 1}`, val])),
          "Attendance %": percentage
        };
      });

      // Apply student filter if specified
      if (studentFilter) {
        students = students.filter(s => s.Name === studentFilter);
        if (students.length === 0) {
          res.status(404).json({ error: "Student not found" });
          return;
        }
      }

      // Assign ranks
      students.sort((a, b) => b["Attendance %"] - a["Attendance %"]);
      let currentRank = 1;
      let prevScore = null;
      students.forEach((s, i) => {
        if (s["Attendance %"] !== prevScore) currentRank = i + 1;
        s.Rank = currentRank;
        prevScore = s["Attendance %"];
      });

      students.sort((a, b) => a.Serial - b.Serial);

      // Create workbook
      const workbook = new ExcelJS.Workbook();

      // Attendance Register
      const sheet = workbook.addWorksheet("Attendance Register");
      sheet.addRow([...Object.keys(students[0])]);
      students.forEach(s => {
        const row = sheet.addRow([
          ...Object.values(s).slice(0, -1),
          s["Attendance %"].toFixed(1) + "%",
          s.Rank
        ]);
        // Conditional coloring
        if (s["Attendance %"] < 70) {
          row.eachCell(cell => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFCDD2" } }; });
        } else if (s["Attendance %"] >= 70 && s["Attendance %"] < 90) {
          row.eachCell(cell => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF9C4" } }; });
        } else {
          row.eachCell(cell => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC8E6C9" } }; });
        }
      });

      // Summary sheet and other logic remain unchanged...
      const summarySheet = workbook.addWorksheet("Summary");
      // ... you can keep the same summary, charts, dropdowns, etc.

      // Export
      res.setHeader("Content-Disposition", "attachment; filename=madarasatun_nisai_attendance.xlsx");
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      await workbook.xlsx.write(res);
      res.end();

    } catch(e){
      res.status(500).json({error:e.message});
    }
    return;
  }

  // Optional: return JSON list of students for frontend dropdown
  if (req.method === "GET") {
    try {
      const response = await notion.databases.query({ database_id: databaseId });
      const students = response.results.map(p => p.properties.Name.title[0]?.plain_text || "");
      res.status(200).json(students);
    } catch(e) {
      res.status(500).json({error:e.message});
    }
  }
}
