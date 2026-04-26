function detectIntent(message = '') {
  const text = message.toLowerCase();
  if (/\b(hello|hi|hey|start)\b/.test(text)) return 'greeting';
  if (/resume|cv|portfolio/.test(text)) return 'resume_help';
  if (/internship|match|job|apply|opening/.test(text)) return 'internship_search_help';
  if (/course|learn|suggest|recommend|resource/.test(text)) return 'course_suggestion_help';
  if (/plan|schedule|7\s*day|study/.test(text)) return 'study_plan_help';
  if (/profile|summary|about me|my skills/.test(text)) return 'profile_summary_help';
  if (/progress|track|score|skill gap|improve/.test(text)) return 'skill_progress_help';
  return 'general_help';
}

module.exports = { detectIntent };
