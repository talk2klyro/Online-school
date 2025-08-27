const { updateAttendance } = require("./_notion");

module.exports = async (req, res) => {
  if (req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { pageId, week, present } = req.body;
    if (!pageId || !week) return res.status(400).json({ error: "Missing params" });

    const updated = await updateAttendance({ pageId, week, present });
    res.status(200).json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Attendance update failed" });
  }
};
