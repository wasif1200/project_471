const prisma = require('../config/prisma');

async function getOrCreateSession(studentId) {
  const active = await prisma.member4ChatSession.findFirst({
    where: { studentId, isActive: true },
    orderBy: { lastActive: 'desc' },
  });
  if (active) return active;
  return prisma.member4ChatSession.create({ data: { studentId } });
}

async function saveMessagePair(sessionId, userMessage, botReply, intent) {
  await prisma.member4ChatMessage.createMany({
    data: [
      { sessionId, sender: 'user', message: userMessage, intent },
      { sessionId, sender: 'bot', message: botReply, intent },
    ],
  });
  await prisma.member4ChatSession.update({ where: { id: sessionId }, data: { isActive: true } });
}

async function getChatHistory(studentId) {
  return prisma.member4ChatSession.findMany({
    where: { studentId },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
    orderBy: { lastActive: 'desc' },
  });
}

async function clearChatHistory(studentId) {
  const sessions = await prisma.member4ChatSession.findMany({ where: { studentId }, select: { id: true } });
  const ids = sessions.map((s) => s.id);
  if (ids.length) await prisma.member4ChatMessage.deleteMany({ where: { sessionId: { in: ids } } });
  await prisma.member4ChatSession.deleteMany({ where: { studentId } });
  return { deletedSessions: ids.length };
}

module.exports = { getOrCreateSession, saveMessagePair, getChatHistory, clearChatHistory };
