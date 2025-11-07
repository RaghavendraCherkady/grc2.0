import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const VAPI_API_KEY = "465ae04e-f94a-42a6-bbc3-98e5bf902c4f";
const VAPI_ASSISTANTS = {
  congratulations: "22bef876-2b3a-4946-a30c-1ca609922f1b",
  loan_reminder: "af08fe04-fa7f-48ad-8e68-185fbf92ef15",
};

interface VoiceRequest {
  to: string;
  message: string;
  userId: string;
  notificationType: string;
  entityType?: string;
  entityId?: string;
  customerName?: string;
}

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
    const supabase = createClient(supabaseUrl, supabaseKey);

    const voiceRequest: VoiceRequest = await req.json();
    const { to, message, userId, notificationType, entityType, entityId, customerName } = voiceRequest;

    if (!to || !message || !userId) {
      throw new Error("Missing required fields: to, message, userId");
    }

    // Clean phone number (ensure +91 prefix for India)
    let cleanPhone = to.replace(/\D/g, "");
    if (cleanPhone.length === 10) {
      cleanPhone = `+91${cleanPhone}`;
    } else if (!cleanPhone.startsWith("+")) {
      cleanPhone = `+${cleanPhone}`;
    }

    const notificationId = crypto.randomUUID();

    // Create notification record
    const { error: notifError } = await supabase
      .from("notifications")
      .insert({
        id: notificationId,
        user_id: userId,
        type: notificationType,
        channel: "voice",
        title: "Voice Call Notification",
        message: message,
        status: "pending",
        entity_type: entityType,
        entity_id: entityId,
        metadata: { to: cleanPhone },
      });

    if (notifError) {
      console.error("Failed to create notification record:", notifError);
    }

    let voiceSent = false;
    let errorMessage = null;
    let callId = null;

    try {
      // Determine which Vapi assistant to use based on notification type
      let assistantId = VAPI_ASSISTANTS.loan_reminder; // Default
      
      if (notificationType.includes("approved") || notificationType.includes("kyc_approved") || notificationType.includes("loan_approved")) {
        assistantId = VAPI_ASSISTANTS.congratulations;
      }

      // Prepare assistant overrides with custom context
      const assistantOverrides = {
        variableValues: {
          customerName: customerName || "Customer",
          message: message,
          notificationType: notificationType,
        },
        firstMessage: message,
      };

      // Make voice call using Vapi API
      const vapiResponse = await fetch("https://api.vapi.ai/call/phone", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${VAPI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assistantId: assistantId,
          phoneNumber: cleanPhone,
          customer: {
            number: cleanPhone,
            name: customerName,
          },
          assistantOverrides: assistantOverrides,
        }),
      });

      if (vapiResponse.ok) {
        const responseData = await vapiResponse.json();
        voiceSent = true;
        callId = responseData.id;
        console.log("Voice call initiated via Vapi:", callId);
        console.log("Assistant used:", assistantId === VAPI_ASSISTANTS.congratulations ? "Congratulations" : "Loan Reminder");
      } else {
        const errorData = await vapiResponse.text();
        errorMessage = `Vapi API error: ${errorData}`;
        console.error(errorMessage);
      }
    } catch (error: any) {
      errorMessage = `Voice call failed: ${error.message}`;
      console.error(errorMessage);
    }

    // Update notification status
    await supabase
      .from("notifications")
      .update({
        status: voiceSent ? "sent" : "failed",
        sent_at: voiceSent ? new Date().toISOString() : null,
        error_message: errorMessage,
        metadata: {
          to: cleanPhone,
          vapi_call_id: callId,
          assistant_id: voiceSent ? (notificationType.includes("approved") ? VAPI_ASSISTANTS.congratulations : VAPI_ASSISTANTS.loan_reminder) : null,
        },
      })
      .eq("id", notificationId);

    return new Response(
      JSON.stringify({
        success: voiceSent,
        notificationId,
        callId,
        message: voiceSent ? "Voice call initiated successfully via Vapi" : "Voice call failed",
        error: errorMessage,
        phone: cleanPhone,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error("Error making voice call:", error);
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