const prisma = require('../../config/prisma');

function isRemoteInternship(job) {
  const value = `${job.workMode || ''} ${job.location || ''}`.toLowerCase();
  return value.includes('remote') || value.includes('online') || value.includes('work from home');
}

function toDto(job) {
  const city = job.location || 'Not specified';
  return {
    id: job.id,
    title: job.title,
    company: job.company?.companyName || 'Company',
    industry: job.department || 'General',
    location: job.location,
    city,
    type: job.workMode || (isRemoteInternship(job) ? 'Remote' : 'Onsite'),
    isRemote: isRemoteInternship(job),
    latitude: null,
    longitude: null,
    description: job.roleDescription,
    postedAt: job.createdAt,
  };
}

exports.getInternships = async (req, res) => {
  try {
    const { city, remote } = req.query;
    const internships = await prisma.internship.findMany({
      where: {
        status: 'ACTIVE',
        ...(city ? { location: { contains: city } } : {}),
      },
      include: { company: true },
      orderBy: { createdAt: 'desc' },
    });

    const filtered = remote === 'true' ? internships.filter(isRemoteInternship) : internships;
    res.json({ success: true, count: filtered.length, data: filtered.map(toDto) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getCities = async (req, res) => {
  try {
    const internships = await prisma.internship.findMany({ select: { location: true }, distinct: ['location'], orderBy: { location: 'asc' } });
    const cities = internships.map((i) => i.location).filter(Boolean);
    res.json({ success: true, data: cities });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
