import { Request, Response } from "express";
import { logger } from "../../config/index.js";
import { LeadService } from "../leads/service.js";
import { prisma } from "@bigwing/db";
import { AppError } from "../../middlewares/errorHandler.js";
import { brandContext } from "../../middlewares/index.js";

const leadService = new LeadService();

export const verifyMetaWebhook = (req: Request, res: Response) => {
  const tokens = Object.keys(process.env)
    .filter(key => key.startsWith("META_WEBHOOK_VERIFY_TOKEN"))
    .map(key => process.env[key])
    .filter(Boolean) as string[];

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token) {
    if (mode === "subscribe" && tokens.includes(token as string)) {
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

  const tokenToBrandMap: Record<string, string> = {};
  Object.keys(process.env).forEach(key => {
    if (key.startsWith("META_PAGE_ACCESS_TOKEN_")) {
      const brandKey = key.replace("META_PAGE_ACCESS_TOKEN_", ""); // e.g. BIGWINGS or REDWINGS
      const token = process.env[key];
      if (token) {
        // Remove trailing 'S' to match CRM brand keys (BIGWING, REDWING)
        const brand = brandKey.endsWith("S") ? brandKey.slice(0, -1) : brandKey;
        tokenToBrandMap[token] = brand;
      }
    }
  });

  const accessTokens = Object.keys(tokenToBrandMap);

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
          const formId = change.value.form_id;
          
          if (accessTokens.length === 0) {
            logger.error("META_PAGE_ACCESS_TOKENS is not configured");
            continue;
          }

          let leadData: any = null;
          let usedToken = "";
          let determinedBrand = "BIGWING";

          // Fetch lead details from Facebook Graph API
          for (const token of accessTokens) {
             const response = await fetch(
               `https://graph.facebook.com/v19.0/${leadgenId}?access_token=${token}`
             );
             if (response.ok) {
                leadData = await response.json();
                usedToken = token;
                determinedBrand = tokenToBrandMap[token] || "BIGWING";
                break;
             }
          }
          
          if (!leadData) {
            logger.error(`Failed to fetch lead ${leadgenId} from Meta with any provided access token`);
            continue;
          }

          logger.info(`Received Meta Lead: ${leadgenId} for brand: ${determinedBrand}`);

          await brandContext.run(determinedBrand, async () => {
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
            logger.warn("Meta lead did not contain a valid phone number. Skipping.");
            return;
          }

          // Prepare payload for CRM
          // 1. Fetch Form Name from Meta to use as Source
          let formName = formId;
          try {
              const formResponse = await fetch(`https://graph.facebook.com/v19.0/${formId}?access_token=${usedToken}`);
              const formData: any = await formResponse.json();
              if (formData && formData.name) {
                  formName = formData.name;
              }
          } catch (e) {
              logger.error("Failed to fetch form name", e);
          }

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
            const cleanExtracted = extractedModelName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
            const models = await prisma.vehicleModel.findMany({ where: { isActive: true } });
            const matchedModel = models.find(m => {
                const cleanModel = m.name.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
                return cleanExtracted === cleanModel || cleanExtracted.includes(cleanModel);
            });
            if (matchedModel) {
              modelId = matchedModel.id;
            }
          }

          // 4. Check if customer already exists
          const existingCustomer = await prisma.customer.findFirst({
            where: { mobile, isDeleted: false }
          });

          // 5. Create lead
          const leadPayload: any = {
              channel: "SOCIAL",
              sourceId: source.id,
              modelId,
              enquiryTypeId: enquiryType?.id || 1,
              enquiryDate: new Date(leadData.created_time || Date.now()),
              remark: `Generated from Facebook Lead Ads. Form: ${formName}`,
              metaFormName: formName,
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
          });
        }
      }
    }
  } catch (error) {
    logger.error("Error processing Meta webhook payload:", error);
  }
};
