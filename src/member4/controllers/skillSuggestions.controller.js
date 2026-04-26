// src/member4/controllers/skillSuggestions.controller.js

const service = require('../services/skillSuggestions.service');

exports.getCourseHistory = async (req, res) => {
  try {
    const { studentId } = req.params;
    const history = await service.getCourseHistory(studentId);
    res.status(200).json({ success: true, data: history });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getSkillSuggestions = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { internshipId } = req.query;
    const suggestions = await service.getSkillSuggestions(studentId, internshipId);
    res.status(200).json({ success: true, data: suggestions });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.startCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { studentId } = req.body;
    const result = await service.startCourse(studentId, courseId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.completeCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { studentId, confirmed } = req.body;
    const result = await service.completeCourse(studentId, courseId, confirmed);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
