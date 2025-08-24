impoimport { Client } from "@notionhq/client";
import ExcelJS from "exceljs";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";

const notion = new Client({ auth: process.env.NOTION_KEY });
const databaseId = process.env.NOTION_DB;

export default async function handler(req, res) {
  if (req.method === "GET" && req.query.export === "xlsx") {
    try {
      const response = await notion.databases.query({ database_id: databaseId });

      // ==============================
      // FORMAT STUDENT DATA
      // ==============================
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

      students.sort((a, b) => a["Attendance %"] - b["Attendance %"]);

      const workbook = new ExcelJS.Workbook();

      // ==============================
      // SHEET 1: Attendance Register
      // ==============================
      const sheet = workbook.addWorksheet("Attendance Register");

      sheet.addRow(Object.keys(students[0]));
      students.forEach(s => {
        sheet.addRow([
          ...Object.values(s).slice(0, -1),
          s["Attendance %"].toFixed(1) + "%"
        ]);
      });

      // Style header
      sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      sheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF047857" },
      };

      const lastCol = sheet.getRow(1).cellCount;
      sheet.getColumn(lastCol).alignment = { horizontal: "center" };

      // ==============================
      // SHEET 2: Summary
      // ==============================
      const summarySheet = workbook.addWorksheet("Summary");

      const totalStudents = students.length;
      const avgAttendance =
        students.reduce((sum, s) => sum + s["Attendance %"], 0) / totalStudents;
      const below70 = students.filter(s => s["Attendance %"] < 70).length;
      const excellent = students.filter(s => s["Attendance %"] >= 90).length;

      summarySheet.addRow(["📊 Class Attendance Summary"]);
      summarySheet.addRow([]);
      summarySheet.addRow(["Total Students", totalStudents]);
      summarySheet.addRow(["Class Average Attendance", avgAttendance.toFixed(1) + "%"]);
      summarySheet.addRow(["Students Below 70%", below70]);
      summarySheet.addRow(["Students Above 90%", excellent]);
      summarySheet.addRow([]);

      // Distribution bins
      const bins = {
        "0–50%": students.filter(s => s["Attendance %"] < 50).length,
        "50–70%": students.filter(s => s["Attendance %"] >= 50 && s["Attendance %"] < 70).length,
        "70–90%": students.filter(s => s["Attendance %"] >= 70 && s["Attendance %"] < 90).length,
        "90–100%": students.filter(s => s["Attendance %"] >= 90).length,
      };

      summarySheet.addRow(["Attendance Range", "Number of Students"]);
      Object.entries(bins).forEach(([range, count]) => {
        summarySheet.addRow([range, count]);
      });

      // ==============================
      // CHARTS (Bar + Pie)
      // ==============================
      const width = 600;
      const height = 400;
      const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

      const labels = Object.keys(bins);
      const values = Object.values(bins);

      // --- Bar Chart ---
      const barConfig = {
        type: "bar",
        data: {
          labels,
          datasets: [
            {
              label: "Number of Students",
              data: values,
              backgroundColor: ["#ef4444", "#f59e0b", "#3b82f6", "#10b981"]
            }
          ]
        },
        options: {
          responsive: false,
          plugins: {
            legend: { display: false },
            title: { display: true, text: "Attendance Distribution (Counts)" }
          }
        }
      };

      const barBuffer = await chartJSNodeCanvas.renderToBuffer(barConfig);
      const barId = workbook.addImage({ buffer: barBuffer, extension: "png" });
      summarySheet.addImage(barId, {
        tl: { col: 0, row: 10 },
        ext: { width: 600, height: 400 },
      });

      // --- Pie Chart ---
      const pieConfig = {
        type: "pie",
        data: {
          labels,
          datasets: [
            {
              label: "Distribution %",
              data: values,
              backgroundColor: ["#ef4444", "#f59e0b", "#3b82f6", "#10b981"]
            }
          ]
        },
        options: {
          responsive: false,
          plugins: {
            legend: { position: "right" },
            title: { display: true, text: "Attendance Distribution (Percentages)" }
          }
        }
      };

      const pieBuffer = await chartJSNodeCanvas.renderToBuffer(pieConfig);
      const pieId = workbook.addImage({ buffer: pieBuffer, extension: "png" });
      summarySheet.addImage(pieId, {
        tl: { col: 10, row: 10 },
        ext: { width: 500, height: 400 },
      });

      // ==============================
      // STREAM FILE
      // ==============================
      res.setHeader("Content-Disposition", "attachment; filename=attendance.xlsx");
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

      await workbook.xlsx.write(res);
      res.end();
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
    return;
  }
}
