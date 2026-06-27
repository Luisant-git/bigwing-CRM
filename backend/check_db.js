const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const followups = await prisma.leadFollowup.findMany({
    include: { lead: { select: { enquiryNo: true } } },
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  console.log(JSON.stringify(followups.map(f => ({
    id: f.id.toString(),
    lead: f.lead.enquiryNo,
    seqNo: f.seqNo,
    remark: f.remark,
    date: f.followupDate
  })), null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
