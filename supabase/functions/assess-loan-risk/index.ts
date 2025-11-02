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

    const { loanApplicationId } = await req.json();

    if (!loanApplicationId) {
      throw new Error("Missing loanApplicationId");
    }

    const { data: loanApp, error: fetchError } = await supabase
      .from("loan_applications")
      .select("*, kyc_applications(*)")
      .eq("id", loanApplicationId)
      .single();

    if (fetchError || !loanApp) {
      throw new Error("Loan application not found");
    }

    const debtToIncome = (
      (parseFloat(loanApp.existing_emi) + parseFloat(loanApp.credit_card_outstanding)) /
      parseFloat(loanApp.monthly_income)
    ) * 100;

    let riskFactors: string[] = [];
    let riskScore = 0;

    if (debtToIncome > 50) {
      riskFactors.push("high_debt_to_income_ratio");
      riskScore += 30;
    } else if (debtToIncome > 40) {
      riskFactors.push("moderate_debt_to_income_ratio");
      riskScore += 15;
    }

    const creditScore = loanApp.credit_score || 0;
    if (creditScore < 650) {
      riskFactors.push("low_credit_score");
      riskScore += 25;
    } else if (creditScore < 700) {
      riskFactors.push("below_average_credit_score");
      riskScore += 10;
    }

    if (loanApp.employment_type === "Self Employed") {
      riskFactors.push("self_employed");
      riskScore += 10;
    }

    const loanAmount = parseFloat(loanApp.loan_amount);
    const annualIncome = parseFloat(loanApp.monthly_income) * 12;
    if (loanAmount > annualIncome * 3) {
      riskFactors.push("loan_amount_exceeds_3x_annual_income");
      riskScore += 20;
    }

    let aiAnalysis = "";
    if (openaiKey) {
      try {
        const openai = new OpenAI({ apiKey: openaiKey });
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are an expert loan risk analyst for Indian banking. Provide concise risk assessment."
            },
            {
              role: "user",
              content: `Analyze this loan application:
- Loan Amount: ₹${loanAmount.toLocaleString('en-IN')}
- Monthly Income: ₹${loanApp.monthly_income.toLocaleString('en-IN')}
- Employment: ${loanApp.employment_type}
- Credit Score: ${creditScore || 'N/A'}
- Existing EMI: ₹${loanApp.existing_emi}
- Debt-to-Income: ${debtToIncome.toFixed(1)}%
- Risk Factors: ${riskFactors.join(', ') || 'None'}

Provide 2-3 sentence risk assessment.`
            }
          ],
          temperature: 0.3,
          max_tokens: 200,
        });

        aiAnalysis = response.choices[0]?.message?.content || "";
      } catch (error: any) {
        console.error("OpenAI analysis failed:", error.message);
      }
    }

    let riskRating: "low" | "medium" | "high";
    if (riskScore >= 40) {
      riskRating = "high";
    } else if (riskScore >= 20) {
      riskRating = "medium";
    } else {
      riskRating = "low";
    }

    const { error: updateError } = await supabase
      .from("loan_applications")
      .update({
        ai_risk_score: riskScore,
        ai_risk_rating: riskRating,
        ai_risk_factors: riskFactors,
        debt_to_income_ratio: debtToIncome,
        ai_processed_at: new Date().toISOString(),
        status: riskRating === "high" ? "pending_governance_review" : "under_assessment",
      })
      .eq("id", loanApplicationId);

    if (updateError) {
      throw updateError;
    }

    if (riskRating === "high") {
      await supabase.from("governance_alerts").insert({
        alert_type: "high_risk_loan",
        severity: "high",
        title: "High Risk Loan Application Detected",
        description: `Loan application from ${loanApp.kyc_applications?.customer_name} flagged as high risk. Risk score: ${riskScore}`,
        related_loan_id: loanApplicationId,
        alert_data: {
          riskScore,
          riskFactors,
          aiAnalysis,
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        loanApplicationId,
        riskScore,
        riskRating,
        riskFactors,
        debtToIncome,
        aiAnalysis,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error("Error assessing loan risk:", error);
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
