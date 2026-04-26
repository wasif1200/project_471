require('dotenv').config();

const app = require('./app');
const { startDeadlineReminderJob } = require('./services/deadlineReminderService');

const PORT = process.env.PORT || 3000;

if (process.env.ENABLE_DEADLINE_JOB !== 'false') {
  startDeadlineReminderJob();
}

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
