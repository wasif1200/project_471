// Member 4 uses the shared Prisma client from the merged project.
// This keeps the app on one schema, one Prisma client, and one database.
module.exports = require('../../config/prisma');
