// OpenRouter API configuration
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || "";
const MODEL = "google/gemini-2.0-flash-001";

export interface VerificationResult {
  isGenuine: boolean;
  confidence: number;
  reasoning: string;
  detectedProduct?: string;
  brandName?: string;
  manufacturingLocation?: string;
  manufactureDate?: string;
  manufacturePlace?: string;
  estimatedPrice?: string;
  barcode?: string;
  logoAnalysis?: string;
  packagingScore?: number;
  batchInfo?: {
    batchNumber?: string;
    expiryDate?: string;
  };
  sellerRisk?: {
    score: number;
    reason: string;
  };
  reviewSentiment?: {
    flaggedKeywords: string[];
    summary: string;
  };
  productDescription?: string;
  estimatedRating?: number;
  reviewsCount?: number;
  topReviews?: string[];
  additionalInfo?: Record<string, string>;
  anomalies: string[];
  tips: string[];
}

export interface AnalysisContext {
  sellingPrice?: string;
  sellerDetails?: string;
  customerReviews?: string;
}

export async function verifyProductImage(
  base64Image: string,
  mimeType: string,
  context?: AnalysisContext
): Promise<VerificationResult> {
  const prompt = `You are an expert product authenticity investigator.
Analyze this image of a product and the provided context to determine if it is genuine or potentially fake.

CONTEXT PROVIDED:
- Selling Price: ${context?.sellingPrice || 'Not provided'}
- Seller Details: ${context?.sellerDetails || 'Not provided'}
- Customer Reviews: ${context?.customerReviews || 'Not provided'}

DETAILED ANALYSIS PROTOCOL:
1. Visual Inspection: Check logo accuracy, color consistency, and packaging quality.
2. Barcode/QR Extraction: Identify any visible barcodes or QR codes.
3. Price Anomaly: Compare selling price with estimated market value.
4. Seller Reputation: Analyze seller details for red flags.
5. Review Analysis: Scan reviews for keywords like "fake", "duplicate", "scam".
6. Batch/Expiry: Look for batch numbers and expiry dates.

Return ONLY a raw JSON object (no markdown, no backticks) with this exact structure:
{
  "isGenuine": boolean,
  "confidence": number,
  "reasoning": "string",
  "detectedProduct": "string",
  "brandName": "string",
  "manufacturingLocation": "string",
  "manufactureDate": "string",
  "manufacturePlace": "string",
  "estimatedPrice": "string",
  "barcode": "string or null",
  "logoAnalysis": "string",
  "packagingScore": number,
  "batchInfo": { "batchNumber": "string", "expiryDate": "string" },
  "sellerRisk": { "score": number, "reason": "string" },
  "reviewSentiment": { "flaggedKeywords": [], "summary": "string" },
  "productDescription": "string",
  "estimatedRating": number,
  "reviewsCount": number,
  "topReviews": ["string", "string"],
  "additionalInfo": { "Color": "string", "Material": "string" },
  "anomalies": ["string"],
  "tips": ["string"]
}`;

  try {
    if (!OPENROUTER_API_KEY) {
      throw new Error("VITE_OPENROUTER_API_KEY is not set in .env file.");
    }

    const imageData = base64Image.includes(",") ? base64Image : `data:${mimeType};base64,${base64Image}`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.origin,
        "X-Title": "VeriCheck AI"
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt,
              },
              {
                type: "image_url",
                image_url: {
                  url: imageData
                }
              }
            ]
          }
        ],
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const raw = data.choices[0].message.content.trim();
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
    return JSON.parse(cleaned) as VerificationResult;
  } catch (error: any) {
    console.error("Verification error:", error);

    let errorMessage = "Unknown scanning error. Please try again.";
    if (error.message) {
      if (error.message.includes("429")) {
        errorMessage = "API Rate Limit: You have exceeded the usage limit. Please wait a moment and try again.";
      } else if (error.message.includes("401")) {
        errorMessage = "API Authentication Error: Your OpenRouter API key is invalid or expired.";
      } else {
        errorMessage = error.message;
      }
    }

    throw new Error(errorMessage);
  }
}
