const https = require('https');

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';

function httpsPost(url, headers, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = https.request(url, {
      method: 'POST',
      headers: { ...headers, 'Content-Length': Buffer.byteLength(payload) },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (error) { reject(error); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function generateAIReply(userMessage, intent, snapshot, history = [], grounding = {}) {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured.');

  const skillLines = snapshot?.skills?.length
    ? snapshot.skills.map((s) => `- ${s.name}: ${s.score}/100`).join('\n')
    : 'No student profile loaded.';

  const messages = [
    {
      role: 'system',
      content:
        'You are a concise internship and skill assistant. Use only the provided student, course, and internship data. Keep replies practical and friendly.',
    },
    {
      role: 'system',
      content:
        `Intent: ${intent}\nStudent: ${snapshot?.name || 'Unknown'}\nTarget role: ${snapshot?.targetRole || 'Not set'}\nSkills:\n${skillLines}\nGrounded draft:\n${grounding.draftReply || ''}`,
    },
    ...history.slice(-6),
    { role: 'user', content: userMessage },
  ];

  const response = await httpsPost(OPENAI_API_URL, {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
  }, {
    model: MODEL,
    messages,
    max_tokens: 500,
    temperature: 0.7,
  });

  if (response.error) throw new Error(response.error.message);
  const reply = response.choices?.[0]?.message?.content?.trim();
  if (!reply) throw new Error('OpenAI returned an empty reply.');
  return reply;
}

module.exports = { generateAIReply };
