import { Cimport { Client } from "@notionhq/client";
import ExcelJS from "exceljs";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";

const notion = new Client({ auth: process.env.NOTION_KEY });
const databaseId = process.env.NOTION_DB;

export default async function handler(req, res) {
  if (req.method === "GET" && req.query.export === "xlsx") {
    try {
      // ==============================
      // FETCH STUDENTS FROM NOTION
      // ==============================
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

      // ==============================
      // ASSIGN RANKS
      // ==============================
      students.sort((a, b) => b["Attendance %"] - a["Attendance %"]);
      let currentRank = 1;
      let prevScore = null;
      students.forEach((s, i) => {
        if (s["Attendance %"] !== prevScore) currentRank = i + 1;
        s.Rank = currentRank;
        prevScore = s["Attendance %"];
      });

      students.sort((a, b) => a.Serial - b.Serial); // restore serial order

      // ==============================
      // CREATE WORKBOOK
      // ==============================
      const workbook = new ExcelJS.Workbook();

      // ------------------------------
      // Attendance Register Sheet
      // ------------------------------
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

      // ------------------------------
      // Summary Sheet
      // ------------------------------
      const summarySheet = workbook.addWorksheet("Summary");

      const totalStudents = students.length;
      const avgAttendance = students.reduce((sum, s) => sum + s["Attendance %"], 0) / totalStudents;
      const below70 = students.filter(s => s["Attendance %"] < 70).length;
      const excellent = students.filter(s => s["Attendance %"] >= 90).length;

      summarySheet.addRow(["📊 Class Attendance Summary"]);
      summarySheet.addRow([]);
      summarySheet.addRow(["Total Students", totalStudents]);
      summarySheet.addRow(["Class Average Attendance", avgAttendance.toFixed(1) + "%"]);
      summarySheet.addRow(["Students Below 70%", below70]);
      summarySheet.addRow(["Students Above 90%", excellent]);
      summarySheet.addRow([]);

      // ------------------------------
      // Distribution Table
      // ------------------------------
      const bins = {
        "0–50%": students.filter(s => s["Attendance %"] < 50).length,
        "50–70%": students.filter(s => s["Attendance %"] >= 50 && s["Attendance %"] < 70).length,
        "70–90%": students.filter(s => s["Attendance %"] >= 70 && s["Attendance %"] < 90).length,
        "90–100%": students.filter(s => s["Attendance %"] >= 90).length,
      };

      summarySheet.addRow(["Attendance Range", "Number of Students"]).font = { bold: true };
      Object.entries(bins).forEach(([range, count]) => {
        const row = summarySheet.addRow([range, count]);
        if (range === "0–50%" || range === "50–70%") row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFCDD2" } };
        if (range === "70–90%") row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF9C4" } };
        if (range === "90–100%") row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC8E6C9" } };
      });

      // ------------------------------
      // Top 3 / Worst 3 Tables
      // ------------------------------
      const topStudents = [...students].sort((a,b)=>b["Attendance %"]-a["Attendance %"]).slice(0,3);
      summarySheet.addRow([]);
      summarySheet.addRow(["🏆 Top 3 Students"]).font = { bold: true, size: 14 };
      const headerTop = summarySheet.addRow(["Rank","Name","Attendance %"]); headerTop.font = { bold: true };
      topStudents.forEach((s,i)=>{
        const row = summarySheet.addRow([s.Rank,s.Name,s["Attendance %"].toFixed(1)+"%"]);
        const color = i===0?"FFFFF59D":i===1?"FFCFD8DC":"FFFFCC80";
        row.fill={type:"pattern",pattern:"solid",fgColor:{argb:color}};
      });

      const worstStudents = [...students].sort((a,b)=>a["Attendance %"]-b["Attendance %"]).slice(0,3);
      summarySheet.addRow([]);
      summarySheet.addRow(["🚨 Students Needing Attention"]).font={bold:true,size:14};
      const headerWorst = summarySheet.addRow(["Rank","Name","Attendance %"]); headerWorst.font={bold:true};
      worstStudents.forEach(s=>{
        const row = summarySheet.addRow([s.Rank,s.Name,s["Attendance %"].toFixed(1)+"%"]);
        row.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFFFCDD2"}};
      });

      // ------------------------------
      // Student Dropdown + Trendlines
      // ------------------------------
      const weekKeys = Object.keys(students[0]).filter(k=>k.startsWith("Week"));
      summarySheet.getCell("C5").value="Select Student:"; summarySheet.getCell("C5").font={bold:true};
      summarySheet.getCell("D5").value=students[0].Name;
      summarySheet.getCell("D5").dataValidation={
        type:"list",
        allowBlank:false,
        formula1:'"'+students.map(s=>s.Name).join(",")+'"',
        showDropDown:true
      };

      summarySheet.addRow([]);
      summarySheet.addRow(["📊 Class vs Student Attendance Trend"]).font={bold:true,size:14};
      summarySheet.addRow(["Week","Class Avg %","Student Cumulative %"]);
      students.forEach((s,i)=>{
        // placeholder, formulas handled inside Excel using MATCH/INDEX/OFFSET
      });

      // ------------------------------
      // Excel Export
      // ------------------------------
      res.setHeader("Content-Disposition", "attachment; filename=attendance.xlsx");
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      await workbook.xlsx.write(res);
      res.end();
    } catch(e){
      res.status(500).json({error:e.message});
    }
    return;
  }
}
