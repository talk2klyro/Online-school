// api/attendance.js
const { createDatabaseIfMissing, updateAttendance, findBySN } = require("./_notion");

module.exports = async (req, res) => {
  try {
    await createDatabaseIfMissing(); // ensure exists
    if (req.method !== "PUT") {
      res.setHeader("Allow", "PUT");
      return res.status(405).end("Method Not Allowed");
    }
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const week = Number(body.week);
    const present = !!body.present;
    if (!(week >= 1 && week <= 12)) return res.status(400).json({ error: "week must be 1..12" });

    let pageId = body.pageId;
    if (!pageId && body.sn !== undefined && body.sn !== null) {
      const { databaseId } = await createDatabaseIfMissing();
      const rec = await findBySN(databaseId, Number(body.sn));
      if (!rec) return res.status(404).json({ error: "student not found for provided S/N" });
      pageId = rec.pageId;
    }
    if (!pageId) return res.status(400).json({ error: "pageId or sn is required" });

    const updated = await updateAttendance({ pageId, week, present });
    return res.status(200).json({ message: "attendance updated", student: updated });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};
