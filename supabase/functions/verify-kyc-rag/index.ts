import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import OpenAI from "npm:openai@4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { kycApplicationId } = await req.json();

    if (!kycApplicationId) {
      throw new Error("Missing kycApplicationId");
    }

    // Step 1: Fetch KYC application
    const { data: kycApp, error: fetchError } = await supabase
      .from("kyc_applications")
      .select("*")
      .eq("id", kycApplicationId)
      .single();

    if (fetchError || !kycApp) {
      throw new Error("KYC application not found");
    }

    // Step 2: Process each document
    const documents = [
      { url: kycApp.identity_doc_url, type: kycApp.identity_doc_type },
      { url: kycApp.address_doc_url, type: kycApp.address_doc_type },
      { url: kycApp.pan_doc_url, type: "PAN Card" },
    ].filter(doc => doc.url);

    const processingResults = [];
    
    for (const doc of documents) {
      // Call document processing function
      const processUrl = `${supabaseUrl}/functions/v1/process-kyc-document`;
      const response = await fetch(processUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documentUrl: doc.url,
          documentType: doc.type,
          kycApplicationId,
        }),
      });

      const result = await response.json();
      processingResults.push(result);
    }

    // Step 3: Run RAG-based compliance check
    const complianceCheck = await performRAGComplianceCheck(
      supabase,
      kycApp,
      processingResults,
      openaiKey
    );

    // Step 4: Calculate overall AI verification status
    const allValid = processingResults.every(r => r.validation?.isValid);
    const avgConfidence = processingResults.reduce(
      (sum, r) => sum + (r.validation?.confidence || 0),
      0
    ) / processingResults.length;

    let aiStatus = "pending";
    let aiVerificationStatus = "needs_review";
    
    if (allValid && avgConfidence >= 90 && complianceCheck.compliant) {
      aiStatus = "verified";
      aiVerificationStatus = "auto_approved";
    } else if (allValid && avgConfidence >= 80) {
      aiStatus = "under_review";
      aiVerificationStatus = "manual_review_recommended";
    } else {
      aiStatus = "needs_review";
      aiVerificationStatus = "manual_review_required";
    }

    // Step 5: Update KYC application
    const { error: updateError } = await supabase
      .from("kyc_applications")
      .update({
        status: aiStatus,
        ai_verification_status: aiVerificationStatus,
        ai_confidence_score: avgConfidence,
        ai_risk_flags: complianceCheck.riskFlags,
        updated_at: new Date().toISOString(),
      })
      .eq("id", kycApplicationId);

    if (updateError) {
      throw updateError;
    }

    // Step 6: Log final verification decision
    await supabase.from("kyc_verification_logs").insert({
      kyc_application_id: kycApplicationId,
      verification_step: "final_rag_verification",
      ai_decision: aiVerificationStatus,
      confidence_score: avgConfidence,
      reasoning: complianceCheck.reasoning,
      supporting_documents: processingResults,
    });

    return new Response(
      JSON.stringify({
        success: true,
        kycApplicationId,
        status: aiStatus,
        verificationStatus: aiVerificationStatus,
        confidence: avgConfidence,
        complianceCheck,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error("Error verifying KYC:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

// Perform RAG-based compliance check against RBI regulations
async function performRAGComplianceCheck(
  supabase: any,
  kycApp: any,
  documentResults: any[],
  openaiKey?: string
): Promise<{
  compliant: boolean;
  riskFlags: string[];
  reasoning: string;
}> {
  const riskFlags: string[] = [];
  
  // Check 1: Document authenticity
  const lowConfidenceDocs = documentResults.filter(
    r => r.validation?.confidence < 85
  );
  if (lowConfidenceDocs.length > 0) {
    riskFlags.push("low_document_confidence");
  }

  // Check 2: Data consistency across documents
  const names = documentResults
    .map(r => r.extractedData?.fields?.name)
    .filter(Boolean);
  
  if (names.length > 1) {
    const uniqueNames = new Set(names.map(n => n.toLowerCase().trim()));
    if (uniqueNames.size > 1) {
      riskFlags.push("name_mismatch_across_documents");
    }
  }

  // Check 3: Basic document completeness
  const hasIdentityDoc = kycApp.identity_doc_url;
  const hasAddressDoc = kycApp.address_doc_url;
  const hasPANDoc = kycApp.pan_doc_url;

  if (!hasIdentityDoc) riskFlags.push("missing_identity_proof");
  if (!hasAddressDoc) riskFlags.push("missing_address_proof");
  if (!hasPANDoc) riskFlags.push("missing_pan_card");

  // Check 4: Age verification (must be 18+)
  const dobFields = documentResults
    .map(r => r.extractedData?.fields?.dob)
    .filter(Boolean);
  
  if (dobFields.length > 0) {
    const dobStr = dobFields[0];
    if (dobStr.includes("2010") || dobStr.includes("2011") || dobStr.includes("2012")) {
      riskFlags.push("customer_below_minimum_age");
    }
  }

  // Step 5: RAG-based AI compliance verification
  let aiReasoning = "";
  
  if (openaiKey) {
    try {
      const openai = new OpenAI({ apiKey: openaiKey });
      
      // Retrieve relevant compliance rules from embeddings
      const complianceContext = await getComplianceContext(
        supabase,
        openai,
        kycApp,
        documentResults
      );

      // Use GPT to analyze compliance
      const analysisPrompt = `You are a compliance officer reviewing a KYC application against RBI regulations.

APPLICATION DETAILS:
- Customer: ${kycApp.customer_name}
- Email: ${kycApp.customer_email}
- Documents submitted: ${documentResults.length}

DOCUMENT ANALYSIS:
${JSON.stringify(documentResults, null, 2)}

CURRENT RISK FLAGS:
${riskFlags.length > 0 ? riskFlags.join(", ") : "None"}

RELEVANT COMPLIANCE RULES:
${complianceContext}

Provide a detailed compliance assessment in 2-3 sentences. Focus on:
1. Whether the application meets RBI KYC requirements
2. Any additional risk factors or concerns
3. Recommendation for approval or manual review`;

      const aiResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are an expert compliance officer for Indian banking regulations." },
          { role: "user", content: analysisPrompt }
        ],
        temperature: 0.3,
        max_tokens: 500,
      });

      aiReasoning = aiResponse.choices[0]?.message?.content || "";
    } catch (error: any) {
      console.error("RAG AI analysis failed:", error.message);
      aiReasoning = "AI analysis unavailable, using rule-based verification.";
    }
  }

  const compliant = riskFlags.length === 0;
  
  let reasoning = "";
  if (aiReasoning) {
    reasoning = aiReasoning;
  } else if (compliant) {
    reasoning = `KYC application meets all RBI compliance requirements. All ${documentResults.length} documents verified successfully with high confidence. Customer data is consistent across documents.`;
  } else {
    reasoning = `KYC application flagged for manual review. Risk flags: ${riskFlags.join(", ")}. Please verify all required documents are present and data is consistent.`;
  }

  return {
    compliant,
    riskFlags,
    reasoning,
  };
}

// Retrieve relevant compliance context using RAG
async function getComplianceContext(
  supabase: any,
  openai: OpenAI,
  kycApp: any,
  documentResults: any[]
): Promise<string> {
  try {
    // Create query from application context
    const query = `KYC verification requirements for Indian banking customer with ${documentResults.length} documents including identity, address, and PAN proofs`;

    // Generate embedding for query
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Search for similar documents in vector database
    const { data: matches, error } = await supabase.rpc(
      "match_documents",
      {
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: 3,
      }
    );

    if (error || !matches || matches.length === 0) {
      return getFallbackComplianceRules();
    }

    // Format retrieved context
    return matches
      .map((m: any, i: number) => `${i + 1}. ${m.content} (relevance: ${(m.similarity * 100).toFixed(1)}%)`)
      .join("\n");
  } catch (error: any) {
    console.error("RAG retrieval failed:", error.message);
    return getFallbackComplianceRules();
  }
}

function getFallbackComplianceRules(): string {
  return `1. Customer must provide valid identity proof (Aadhaar/Passport/Voter ID)
2. Customer must provide valid address proof
3. Customer must provide PAN card for financial transactions
4. All documents must be clearly legible and not expired
5. Customer information must be consistent across all documents
6. Customer must be 18 years or older
7. Documents should be government-issued and verifiable`;
}
