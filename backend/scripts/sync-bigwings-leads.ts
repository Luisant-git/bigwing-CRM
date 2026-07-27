import { prisma } from "@bigwing/db";
import { brandContext } from "../src/middlewares/brand.js";
import { leadService } from "../src/modules/leads/service.js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const tokens = [
  { brand: "BIGWING", token: process.env.META_PAGE_ACCESS_TOKEN_BIGWINGS }
].filter(t => t.token);

async function syncLeads() {
  for (const { brand, token } of tokens) {
    console.log(`\n--- Syncing leads for brand ${brand} ---`);
    // 1. Get Page ID
    const pageRes = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${token}`);
    const pageData = await pageRes.json();
    if (!pageData.id) {
       console.error(`Failed to get page ID for ${brand}:`, pageData);
       continue;
    }
    const pageId = pageData.id;
    console.log(`Found Page: ${pageData.name} (${pageId})`);

    // 2. Get Forms
    const formsRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}/leadgen_forms?access_token=${token}`);
    const formsData = await formsRes.json();
    
    for (const form of formsData.data || []) {
       console.log(`\nSyncing form: ${form.name} (${form.id})`);
       let nextUrl = `https://graph.facebook.com/v19.0/${form.id}/leads?access_token=${token}`;
       
       while (nextUrl) {
          const leadsRes = await fetch(nextUrl);
          const leadsData = await leadsRes.json();

          for (const lead of leadsData.data || []) {
             // Parse lead
             let firstName = "";
             let lastName = "";
             let mobile = "";
             let email = "";
             let location = "";
             let extractedModelName = "";

             for (const field of lead.field_data || []) {
               const value = field.values[0] || "";
               const fieldName = field.name.toLowerCase();

               if (fieldName === "first_name" || fieldName === "first name" || fieldName.includes("first name")) {
                   firstName = value;
               } else if (fieldName === "last_name" || fieldName === "last name" || fieldName.includes("last name")) {
                   lastName = value;
               } else if (fieldName === "full_name" || fieldName === "full name" || fieldName === "name") {
                   const parts = value.trim().split(" ");
                   firstName = parts[0];
                   if (parts.length > 1) {
                       lastName = parts.slice(1).join(" ");
                   }
               } else if (fieldName === "phone_number" || fieldName === "phone number" || fieldName.includes("phone") || fieldName.includes("mobile")) {
                   const digits = value.replace(/\D/g, "");
                   mobile = digits.slice(-10);
               } else if (fieldName === "email" || fieldName.includes("email")) {
                   email = value;
               } else {
                   if (fieldName.includes("motorcycle") || fieldName.includes("interested in") || fieldName.includes("bike") || fieldName.includes("model")) {
                       extractedModelName = value;
                   }
                   if (fieldName.includes("bangalore") && value.toLowerCase() === "yes") {
                       location = "Bangalore";
                   }
               }
             }

             if (!firstName) firstName = "Facebook";
             if (!mobile) {
                console.log(`Lead ${lead.id} missing mobile, skipping.`);
                continue;
             }

             await brandContext.run(brand, async () => {
                let source = await prisma.enquirySource.findFirst({
                  where: { name: { contains: "Facebook", mode: "insensitive" } }
                });
                if (!source) {
                  source = await prisma.enquirySource.create({
                      data: { name: "Facebook Ads", isActive: true }
                  });
                }

                let enquiryType = await prisma.enquiryTypeLookup.findFirst({
                  where: { isActive: true }
                });

                let modelId;
                if (extractedModelName) {
                  const cleanExtracted = extractedModelName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
                  const models = await prisma.vehicleModel.findMany({ where: { isActive: true } });
                  const matchedModel = models.find((m: any) => {
                      const cleanModel = m.name.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
                      return cleanExtracted === cleanModel || cleanExtracted.includes(cleanModel);
                  });
                  if (matchedModel) {
                    modelId = matchedModel.id;
                  }
                }

                const existingCustomer = await prisma.customer.findFirst({
                  where: { mobile, isDeleted: false, brand }
                });

                const leadPayload: any = {
                    channel: "SOCIAL",
                    sourceId: source.id,
                    modelId,
                    enquiryTypeId: enquiryType?.id || 1,
                    enquiryDate: new Date(lead.created_time || Date.now()),
                    remark: `Generated from Facebook Lead Ads. Form: ${form.name}\nHistorical Meta Lead ID: ${lead.id}`,
                    metaFormName: form.name,
                };

                if (existingCustomer) {
                  const existingLeadForCustomer = await prisma.lead.findFirst({
                     where: { customerId: existingCustomer.id }
                  });
                  if (existingLeadForCustomer) {
                     console.log(`- Skipped lead ${lead.id} because customer ${mobile} already has a lead`);
                     return;
                  }
                  leadPayload.customerId = existingCustomer.id;
                } else {
                  leadPayload.customer = {
                    firstName,
                    lastName,
                    mobile,
                    email,
                    ...(location && { location })
                  };
                }

                // Avoid inserting duplicates using the unique lead ID inside the remark
                const leadRemark = `Generated from Facebook Lead Ads. Form: ${form.name}\nHistorical Meta Lead ID: ${lead.id}`;
                const existingLead = await prisma.lead.findFirst({
                    where: { remark: { contains: `Historical Meta Lead ID: ${lead.id}` } }
                });

                if (existingLead) {
                    // We already imported this lead, but its createdAt might be wiped or synthetically ordered.
                    // Let's restore the true Facebook timestamp perfectly.
                    const trueTime = new Date(lead.created_time || Date.now());
                    await prisma.$executeRaw`UPDATE core.lead SET created_at = ${trueTime} WHERE id = ${existingLead.id}`;
                    
                    console.log(`- Skipped duplicate lead ${lead.id} but restored true timestamp`);
                } else {
                   await leadService.create(leadPayload);
                   
                   // CRITICAL FIX: leadService.create just inserted this with the current server time!
                   // We MUST immediately update its createdAt to the TRUE Facebook timestamp so sorting works!
                   const trueTime = new Date(lead.created_time || Date.now());
                   const freshlyInserted = await prisma.lead.findFirst({
                       where: { remark: { contains: `Historical Meta Lead ID: ${lead.id}` } }
                   });
                   if (freshlyInserted) {
                       await prisma.$executeRaw`UPDATE core.lead SET created_at = ${trueTime} WHERE id = ${freshlyInserted.id}`;
                   }
                   
                   console.log(`✔ Imported lead ${lead.id} for mobile ${mobile}`);
                }
             });
          }

          nextUrl = leadsData.paging?.next || null;
       }
    }
  }
}

syncLeads().then(() => {
  console.log("\n✅ All historical leads synced successfully!");
  process.exit(0);
}).catch((err) => {
  console.error("Error syncing leads:", err);
  process.exit(1);
});
