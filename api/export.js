const { createDatabaseIfMissing, listStudents, toCSV } = require("./_notion");

module.exports = async (req, res) => {
  try {
    const { databaseId } = await createDatabaseIfMissing();
    const students = await listStudents(databaseId);
    const csv = toCSV(students);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=attendance.csv");
    res.status(200).send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Export failed" });
  }
};
