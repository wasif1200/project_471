// src/middleware/skillSuggestions.validate.js

function validateStudentId(req, res, next) {
  const id = parseInt(req.params.studentId, 10);
  if (!id || id < 1) {
    return res.status(400).json({ success: false, message: "Invalid studentId." });
  }
  req.params.studentId = id;
  next();
}

function validateCourseId(req, res, next) {
  const id = parseInt(req.params.courseId, 10);
  if (!id || id < 1) {
    return res.status(400).json({ success: false, message: "Invalid courseId." });
  }
  req.params.courseId = id;
  next();
}

module.exports = { validateStudentId, validateCourseId };
