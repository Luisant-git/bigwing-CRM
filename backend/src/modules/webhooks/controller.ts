import { Request, Response } from "express";
import { logger } from "../../config/index.js";
import { LeadService } from "../leads/service.js";
import { prisma } from "@bigwing/db";
import { AppError } from "../../middlewares/errorHandler.js";

const leadService = new LeadService();

export const verifyMetaWebhook = (req: Request, res: Response) => {
  const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN;

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token) {
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      logger.info("WEBHOOK_VERIFIED");
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
};

export const handleMetaWebhook = async (req: Request, res: Response) => {
  const body = req.body;
  const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN;

  if (body.object !== "page") {
    res.sendStatus(404);
    return;
  }

  // Always return 200 OK to Meta immediately to prevent retries
  res.status(200).send("EVENT_RECEIVED");

  try {
    for (const entry of body.entry) {
      for (const change of entry.changes) {
        if (change.field === "leadgen") {
          const leadgenId = change.value.leadgen_id;
          
          if (!PAGE_ACCESS_TOKEN) {
            logger.error("META_PAGE_ACCESS_TOKEN is not configured");
            continue;
          }

          // Fetch lead details from Facebook Graph API
          const response = await fetch(
            `https://graph.facebook.com/v19.0/${leadgenId}?access_token=${PAGE_ACCESS_TOKEN}`
          );
          
          if (!response.ok) {
            logger.error(`Failed to fetch lead ${leadgenId} from Meta: ${response.statusText}`);
            continue;
          }

          const leadData: any = await response.json();
          logger.info(`Received Meta Lead: ${leadgenId}`);

          // Extract fields (Facebook usually sends field_data array)
          let firstName = "";
          let lastName = "";
          let mobile = "";
          let email = "";
          let location = "";
          let extractedModelName = "";

          for (const field of leadData.field_data || []) {
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
                // Keep only digits, limit to last 10
                const digits = value.replace(/\D/g, "");
                mobile = digits.slice(-10);
            } else if (fieldName === "email" || fieldName.includes("email")) {
                email = value;
            } else {
                // Handle custom questions from the lead form
                if (fieldName.includes("motorcycle") || fieldName.includes("interested in") || fieldName.includes("bike")) {
                    extractedModelName = value;
                }
                if (fieldName.includes("bangalore") && value.toLowerCase() === "yes") {
                    location = "Bangalore";
                }
            }
          }

          if (!firstName) firstName = "Facebook";

          if (!mobile) {
            logger.warn("Meta lead did not contain a valid phone number. Skipping.");
            continue;
          }

          // Prepare payload for CRM
          // 1. Get or create a Source for 'Facebook'
          let source = await prisma.enquirySource.findFirst({
            where: { name: { contains: "Facebook", mode: "insensitive" } }
          });
          if (!source) {
            source = await prisma.enquirySource.create({
                data: { name: "Facebook Ads", isActive: true }
            });
          }

          // 2. Get default enquiry type
          let enquiryType = await prisma.enquiryTypeLookup.findFirst({
            where: { isActive: true }
          });

          // 3. Resolve Model if provided
          let modelId;
          if (extractedModelName) {
            const model = await prisma.vehicleModel.findFirst({
              where: { name: { contains: extractedModelName, mode: "insensitive" } }
            });
            if (model) {
              modelId = model.id;
            }
          }

          // 4. Check if customer already exists
          const existingCustomer = await prisma.customer.findFirst({
            where: { mobile }
          });

          // 5. Create lead
          const leadPayload: any = {
            channel: "SOCIAL",
            sourceId: source.id,
            modelId,
            enquiryTypeId: enquiryType?.id || 1, // fallback to 1 if empty
            enquiryDate: new Date(leadData.created_time || Date.now()),
            remark: "Generated from Facebook Lead Ads."
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

          await leadService.create(leadPayload);
        }
      }
    }
  } catch (error) {
    logger.error("Error processing Meta webhook payload:", error);
  }
};
