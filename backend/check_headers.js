const fs = require('fs');

const content = fs.readFileSync('c:\\Users\\Ragul\\Downloads\\bigwing-crm\\backend\\uploads\\1778597464501-Enquiry_Detailed_Report_1_(1).xml', 'utf-8');
const regex = /columnHeading="([^"]+)"/ig;
let match;
const headers = new Set();
while ((match = regex.exec(content)) !== null) {
  headers.add(match[1]);
}
console.log(Array.from(headers));
