import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailRequest {
  to: string;
  subject: string;
  body: string;
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
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const emailRequest: EmailRequest = await req.json();
    const { to, subject, body, userId, notificationType, entityType, entityId } = emailRequest;

    if (!to || !subject || !body || !userId) {
      throw new Error("Missing required fields: to, subject, body, userId");
    }

    const notificationId = crypto.randomUUID();

    // Create notification record
    const { error: notifError } = await supabase
      .from("notifications")
      .insert({
        id: notificationId,
        user_id: userId,
        type: notificationType,
        channel: "email",
        title: subject,
        message: body,
        status: "pending",
        entity_type: entityType,
        entity_id: entityId,
        metadata: { to, subject },
      });

    if (notifError) {
      console.error("Failed to create notification record:", notifError);
    }

    let emailSent = false;
    let errorMessage = null;

    // Send email using Resend API if available
    if (resendApiKey) {
      try {
        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "NOVA-GRC <notifications@novagrc.com>",
            to: [to],
            subject: subject,
            html: body.replace(/\n/g, "<br>"),
          }),
        });

        if (resendResponse.ok) {
          emailSent = true;
          console.log("Email sent via Resend:", await resendResponse.json());
        } else {
          const errorData = await resendResponse.text();
          errorMessage = `Resend API error: ${errorData}`;
          console.error(errorMessage);
        }
      } catch (error: any) {
        errorMessage = `Email delivery failed: ${error.message}`;
        console.error(errorMessage);
      }
    } else {
      // Fallback: Log email (for development/testing)
      console.log("=== EMAIL NOTIFICATION ===");
      console.log("To:", to);
      console.log("Subject:", subject);
      console.log("Body:", body);
      console.log("=========================");
      emailSent = true;
    }

    // Update notification status
    await supabase
      .from("notifications")
      .update({
        status: emailSent ? "sent" : "failed",
        sent_at: emailSent ? new Date().toISOString() : null,
        error_message: errorMessage,
      })
      .eq("id", notificationId);

    return new Response(
      JSON.stringify({
        success: emailSent,
        notificationId,
        message: emailSent ? "Email sent successfully" : "Email delivery failed",
        error: errorMessage,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error("Error sending email:", error);
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
