const prisma = require('../config/prisma');
const { detectIntent } = require('../services/intentService');
const { buildBotResponse, getSuggestionsForStudent, getStudentSnapshot } = require('../services/responseService');
const { generateAIReply } = require('../services/aiService');
const { getOrCreateSession, saveMessagePair, getChatHistory, clearChatHistory } = require('../services/chatSessionService');
const { displayStudentName, scoreToPercent } = require('../services/skillUtils');

async function validateStudentId(studentId) {
  const numericStudentId = Number(studentId);
  if (!Number.isInteger(numericStudentId) || numericStudentId <= 0) {
    return { ok: false, error: 'Student ID must be a positive whole number.' };
  }
  const student = await prisma.student.findUnique({ where: { id: numericStudentId } });
  if (!student) return { ok: false, error: 'Student not found. Try demo IDs 1, 2, or 3 after seeding.' };
  return { ok: true, numericStudentId, student };
}

async function sendMessage(req, res, next) {
  try {
    const { studentId, message } = req.body;
    if (!message || !message.trim()) return res.status(400).json({ error: 'Message cannot be empty.' });

    const validation = await validateStudentId(studentId);
    if (!validation.ok) return res.status(400).json({ error: validation.error });

    const trimmedMessage = message.trim();
    const intent = detectIntent(trimmedMessage);
    const dbResponse = await buildBotResponse(intent, validation.numericStudentId, trimmedMessage);

    // Debug logging for internship search
    if (intent === 'internship_search_help') {
      console.log('[chatbot] Internship search detected');
      console.log('[chatbot] Related internships count:', (dbResponse.relatedInternships || []).length);
    }

    let finalReply = dbResponse.reply;
    let aiUsed = false;
    if (process.env.OPENAI_API_KEY) {
      try {
        const snapshot = await getStudentSnapshot(validation.numericStudentId);
        finalReply = await generateAIReply(trimmedMessage, intent, snapshot, [], {
          draftReply: dbResponse.reply,
          relatedCourses: dbResponse.relatedCourses,
          relatedInternships: dbResponse.relatedInternships,
        });
        aiUsed = true;
      } catch (error) {
        console.warn('[chatbot] AI reply failed, falling back to local response:', error.message);
      }
    }

    const session = await getOrCreateSession(validation.numericStudentId);
    await saveMessagePair(session.id, trimmedMessage, finalReply, intent);

    res.json({
      success: true,
      sessionId: session.id,
      studentId: validation.numericStudentId,
      reply: finalReply,
      intent: dbResponse.intent,
      aiUsed,
      suggestions: dbResponse.suggestions,
      relatedCourses: dbResponse.relatedCourses,
      relatedInternships: dbResponse.relatedInternships,
    });
  } catch (error) {
    next(error);
  }
}

async function getChatHistoryHandler(req, res, next) {
  try {
    const validation = await validateStudentId(req.params.studentId);
    if (!validation.ok) return res.status(400).json({ error: validation.error });
    const sessions = await getChatHistory(validation.numericStudentId);
    res.json({ success: true, studentId: validation.numericStudentId, sessions });
  } catch (error) {
    next(error);
  }
}

async function clearChatHistoryHandler(req, res, next) {
  try {
    const validation = await validateStudentId(req.params.studentId);
    if (!validation.ok) return res.status(400).json({ error: validation.error });
    const result = await clearChatHistory(validation.numericStudentId);
    res.json({ success: true, message: 'Chat history cleared.', ...result });
  } catch (error) {
    next(error);
  }
}

async function getSuggestions(req, res, next) {
  try {
    const validation = await validateStudentId(req.params.studentId);
    if (!validation.ok) return res.status(400).json({ error: validation.error });
    const suggestions = await getSuggestionsForStudent(validation.numericStudentId);
    res.json({ success: true, suggestions });
  } catch (error) {
    next(error);
  }
}

async function getStudentProfile(req, res, next) {
  try {
    const validation = await validateStudentId(req.params.studentId);
    if (!validation.ok) return res.status(400).json({ error: validation.error });

    const student = await prisma.student.findUnique({
      where: { id: validation.numericStudentId },
      include: { member4Skills: { include: { skill: true }, orderBy: { chatScore: 'desc' } } },
    });

    const existingSkills = student.member4Skills.map((row) => ({
      id: row.skill.id,
      name: row.skill.name,
      category: row.skill.category || 'General',
      score: scoreToPercent(row),
      isCompleted: row.isCompleted,
    }));

    res.json({
      success: true,
      data: {
        id: student.id,
        name: displayStudentName(student),
        email: student.email,
        department: student.department,
        university: student.university || student.universityName,
        semester: student.semester,
        targetRole: student.targetRole,
        bio: student.bio,
        experience: student.experience,
        interests: student.interests,
        existingSkills,
        strongSkills: existingSkills.filter((s) => s.score >= 75),
        improvingSkills: existingSkills.filter((s) => s.score < 75),
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { sendMessage, getChatHistoryHandler, clearChatHistoryHandler, getSuggestions, getStudentProfile };
