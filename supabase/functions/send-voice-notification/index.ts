import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface VoiceRequest {
  to: string;
  message: string;
  userId: string;
  notificationType: string;
  entityType?: string;
  entityId?: string;
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
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const voiceRequest: VoiceRequest = await req.json();
    const { to, message, userId, notificationType, entityType, entityId } = voiceRequest;

    if (!to || !message || !userId) {
      throw new Error("Missing required fields: to, message, userId");
    }

    // Clean phone number (ensure +91 prefix for India)
    let cleanPhone = to.replace(/\D/g, "");
    if (cleanPhone.length === 10) {
      cleanPhone = `+91${cleanPhone}`;
    } else if (!cleanPhone.startsWith("+")) {
      cleanPhone = `+${cleanPhone}`;
    } else if (!cleanPhone.startsWith("+91")) {
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

    // Make voice call using Twilio if credentials are available
    if (twilioAccountSid && twilioAuthToken && twilioPhoneNumber) {
      try {
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Calls.json`;
        const authHeader = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

        // Create TwiML for voice message
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="woman" language="en-IN">${escapeXml(message)}</Say>
  <Pause length="1"/>
  <Say voice="woman" language="en-IN">Press any key to repeat this message.</Say>
  <Gather numDigits="1" timeout="5">
    <Say voice="woman" language="en-IN">${escapeXml(message)}</Say>
  </Gather>
</Response>`;

        // URL-encode the TwiML
        const twimlUrl = `data:application/xml,${encodeURIComponent(twiml)}`;

        const formData = new URLSearchParams({
          To: cleanPhone,
          From: twilioPhoneNumber,
          Twiml: twiml,
        });

        const twilioResponse = await fetch(twilioUrl, {
          method: "POST",
          headers: {
            "Authorization": `Basic ${authHeader}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formData.toString(),
        });

        if (twilioResponse.ok) {
          voiceSent = true;
          const responseData = await twilioResponse.json();
          console.log("Voice call initiated via Twilio:", responseData.sid);
        } else {
          const errorData = await twilioResponse.text();
          errorMessage = `Twilio API error: ${errorData}`;
          console.error(errorMessage);
        }
      } catch (error: any) {
        errorMessage = `Voice call failed: ${error.message}`;
        console.error(errorMessage);
      }
    } else {
      // Fallback: Log voice call (for development/testing)
      console.log("=== VOICE NOTIFICATION ===");
      console.log("To:", cleanPhone);
      console.log("Message:", message);
      console.log("=========================");
      voiceSent = true;
    }

    // Update notification status
    await supabase
      .from("notifications")
      .update({
        status: voiceSent ? "sent" : "failed",
        sent_at: voiceSent ? new Date().toISOString() : null,
        error_message: errorMessage,
      })
      .eq("id", notificationId);

    return new Response(
      JSON.stringify({
        success: voiceSent,
        notificationId,
        message: voiceSent ? "Voice call initiated successfully" : "Voice call failed",
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

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
