import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SMSRequest {
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

    const smsRequest: SMSRequest = await req.json();
    const { to, message, userId, notificationType, entityType, entityId } = smsRequest;

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
        channel: "sms",
        title: "SMS Notification",
        message: message,
        status: "pending",
        entity_type: entityType,
        entity_id: entityId,
        metadata: { to: cleanPhone },
      });

    if (notifError) {
      console.error("Failed to create notification record:", notifError);
    }

    let smsSent = false;
    let errorMessage = null;

    // Send SMS using Twilio if credentials are available
    if (twilioAccountSid && twilioAuthToken && twilioPhoneNumber) {
      try {
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
        const authHeader = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

        const formData = new URLSearchParams({
          To: cleanPhone,
          From: twilioPhoneNumber,
          Body: message,
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
          smsSent = true;
          const responseData = await twilioResponse.json();
          console.log("SMS sent via Twilio:", responseData.sid);
        } else {
          const errorData = await twilioResponse.text();
          errorMessage = `Twilio API error: ${errorData}`;
          console.error(errorMessage);
        }
      } catch (error: any) {
        errorMessage = `SMS delivery failed: ${error.message}`;
        console.error(errorMessage);
      }
    } else {
      // Fallback: Log SMS (for development/testing)
      console.log("=== SMS NOTIFICATION ===");
      console.log("To:", cleanPhone);
      console.log("Message:", message);
      console.log("======================");
      smsSent = true;
    }

    // Update notification status
    await supabase
      .from("notifications")
      .update({
        status: smsSent ? "sent" : "failed",
        sent_at: smsSent ? new Date().toISOString() : null,
        error_message: errorMessage,
      })
      .eq("id", notificationId);

    return new Response(
      JSON.stringify({
        success: smsSent,
        notificationId,
        message: smsSent ? "SMS sent successfully" : "SMS delivery failed",
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
    console.error("Error sending SMS:", error);
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
