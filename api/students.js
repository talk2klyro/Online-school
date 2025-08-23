// api/students.js
const { createDatabaseIfMissing, listStudents, addStudent } = require("./_notion");

module.exports = async (req, res) => {
  try {
    const { databaseId } = await createDatabaseIfMissing();

    if (req.method === "GET") {
      const rows = await listStudents(databaseId);
      return res.status(200).json({ students: rows, count: rows.length });
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      const name = (body.name || "").trim();
      const phone = (body.phone || "").trim();
      const sn = body.sn;
      if (!name) return res.status(400).json({ error: "name is required" });
      const rec = await addStudent(databaseId, { name, phone, sn });
      return res.status(201).json({ message: "student added", student: rec });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).end("Method Not Allowed");
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};
