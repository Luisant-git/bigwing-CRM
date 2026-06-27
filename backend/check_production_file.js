const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("Looking for the most recent import batch...");
  const batch = await prisma.importBatch.findFirst({
    orderBy: { createdAt: 'desc' }
  });

  if (!batch) {
    console.log("No batches found in the database.");
    return;
  }

  console.log(`Latest Batch ID: ${batch.id}`);
  console.log(`File Name: ${batch.fileName}`);
  console.log(`Status: ${batch.status}`);
  console.log(`Total Rows: ${batch.totalRows}`);

  const filePath = path.join(__dirname, 'uploads', batch.fileName);
  if (!fs.existsSync(filePath)) {
    console.log(`File does not exist on disk: ${filePath}`);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  
  const idToFind = '1-1ZTKTDLZ';
  console.log(`\nSearching for ${idToFind} in the uploaded file...`);
  
  if (content.includes(idToFind)) {
    console.log(`✅ FOUND ${idToFind} in the file!`);
    
    // Print the lines containing it
    const lines = content.split('\n');
    const matches = lines.filter(l => l.includes(idToFind));
    console.log(`Found ${matches.length} row(s):`);
    matches.forEach(m => console.log(m.substring(0, 500)));
  } else {
    console.log(`❌ NOT FOUND! The file you just uploaded DOES NOT CONTAIN ${idToFind}.`);
    console.log(`Because the Excel file does not contain this follow-up, the system cannot update it.`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
