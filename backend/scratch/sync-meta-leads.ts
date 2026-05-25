import { PrismaClient } from "@prisma/client";
import { LeadService } from "../src/modules/leads/service.js";
import { brandContext } from "../src/middlewares/brand.js";
import dotenv from "dotenv";

// Load environment variables from backend directory
dotenv.config();

const prisma = new PrismaClient();
const leadService = new LeadService();

const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN;
const PAGE_ID = "574195362447134"; // Your Facebook Page ID

async function syncLeads() {
    if (!PAGE_ACCESS_TOKEN) {
        console.error("❌ META_PAGE_ACCESS_TOKEN is not defined in your .env file!");
        process.exit(1);
    }

    console.log(`\n🔄 Fetching all Lead Forms for Page ID: ${PAGE_ID}...`);
    
    // First, fetch all forms for this page
    const formsResponse = await fetch(`https://graph.facebook.com/v19.0/${PAGE_ID}/leadgen_forms?access_token=${PAGE_ACCESS_TOKEN}`);
    const formsData: any = await formsResponse.json();

    if (formsData.error) {
        console.error("❌ Meta API Error fetching forms:", formsData.error.message);
        process.exit(1);
    }

    const forms = formsData.data || [];
    if (forms.length === 0) {
        console.log("No lead forms found on this page.");
        process.exit(0);
    }

    console.log(`📋 Found ${forms.length} Lead Forms. Starting import...`);

    let count = 0;
    let skipped = 0;

    await brandContext.run("BIGWING", async () => {
        // 2. Get default enquiry type
        let enquiryType = await prisma.enquiryTypeLookup.findFirst({
            where: { isActive: true }
        });

        for (const form of forms) {
            console.log(`\n▶️ Processing Form: ${form.name} (ID: ${form.id})`);

            // 1. Get or create a Source for this specific Form
            let sourceName = `FB: ${form.name}`;
            let source = await prisma.enquirySource.findFirst({
                where: { name: { equals: sourceName, mode: "insensitive" } }
            });
            if (!source) {
                source = await prisma.enquirySource.create({
                    data: { name: sourceName, isActive: true }
                });
            }
            
            let url = `https://graph.facebook.com/v19.0/${form.id}/leads?access_token=${PAGE_ACCESS_TOKEN}&limit=50`;

            // Loop through all pages of leads from Facebook for this specific form
            while (url) {
                const response = await fetch(url);
                const data: any = await response.json();

                if (data.error) {
                    console.error("❌ Meta API Error fetching leads:", data.error.message);
                    break;
                }

                const leads = data.data || [];
                if (leads.length === 0) break;

                for (const lead of leads) {
                    try {
                        // --- Deduplication Check ---
                        // We embed the Meta Lead ID in the remark, so we never import the exact same lead twice!
                        const remarkIdentifier = `Historical Meta Lead ID: ${lead.id}`;
                        const alreadyImported = await prisma.lead.findFirst({
                            where: { remark: { contains: lead.id }, isDeleted: false }
                        });

                        if (alreadyImported) {
                            skipped++;
                            continue;
                        }

                        // --- Extract Fields ---
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
                            skipped++;
                            continue;
                        }

                        // --- Resolve Model ---
                        let modelId;
                        if (extractedModelName) {
                            const model = await prisma.vehicleModel.findFirst({
                                where: { name: { contains: extractedModelName, mode: "insensitive" } }
                            });
                            if (model) {
                                modelId = model.id;
                            }
                        }

                        // --- Check if Customer already exists by mobile ---
                        const existingCustomer = await prisma.customer.findFirst({
                            where: { mobile, isDeleted: false }
                        });

                        // --- Create Lead Payload ---
                        const leadPayload: any = {
                            channel: "SOCIAL",
                            sourceId: source.id,
                            modelId,
                            enquiryTypeId: enquiryType?.id || 1,
                            enquiryDate: new Date(lead.created_time || Date.now()),
                            remark: remarkIdentifier
                        };

                        if (existingCustomer) {
                            leadPayload.customerId = Number(existingCustomer.id);
                        } else {
                            leadPayload.customer = {
                                firstName,
                                lastName,
                                mobile,
                                email,
                                ...(location && { location })
                            };
                        }

                        // Insert into CRM
                        await leadService.create(leadPayload);
                        console.log(`✅ Imported: ${firstName} (${mobile})`);
                        count++;
                    } catch (err: any) {
                        console.error(`❌ Failed to import lead ${lead.id}:`, err.message);
                    }
                }

                // Move to the next page of results
                url = data.paging?.next || null;
            }
        }

        console.log(`\n🎉 Sync Complete!`);
        console.log(`📥 Successfully imported: ${count} new leads`);
        console.log(`⏭️  Skipped (already imported or invalid): ${skipped}`);
    });
}

syncLeads().catch(console.error).finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
});
