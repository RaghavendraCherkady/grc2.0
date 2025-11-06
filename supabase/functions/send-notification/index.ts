import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface NotificationRequest {
  userId: string;
  templateCode: string;
  variables: Record<string, any>;
  entityType?: string;
  entityId?: string;
  channels?: ('email' | 'sms' | 'voice')[];
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

    const request: NotificationRequest = await req.json();
    const { userId, templateCode, variables, entityType, entityId, channels } = request;

    if (!userId || !templateCode) {
      throw new Error("Missing required fields: userId, templateCode");
    }

    // Step 1: Fetch user preferences and profile
    const { data: prefs, error: prefsError } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (prefsError) {
      console.error("Failed to fetch preferences:", prefsError);
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      throw new Error("User profile not found");
    }

    // Step 2: Determine notification type from template code
    const notificationType = templateCode.replace(/_email$|_sms$|_voice$/, "");

    // Step 3: Check if notification type is enabled
    const typeEnabled = getNotificationTypeEnabled(prefs, notificationType);
    if (!typeEnabled) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Notification skipped - user has disabled this type",
          sent: [],
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Step 4: Determine which channels to use
    let activeChannels: ('email' | 'sms' | 'voice')[] = channels || [];
    if (!channels || channels.length === 0) {
      activeChannels = [];
      if (prefs?.email_enabled) activeChannels.push('email');
      if (prefs?.sms_enabled) activeChannels.push('sms');
      if (prefs?.voice_enabled) activeChannels.push('voice');
    }

    // Step 5: Send notifications on each active channel
    const results = [];
    
    for (const channel of activeChannels) {
      try {
        // Fetch template for this channel
        const { data: template, error: templateError } = await supabase
          .from("notification_templates")
          .select("*")
          .eq("template_code", `${notificationType}_${channel}`)
          .eq("is_active", true)
          .single();

        if (templateError || !template) {
          console.log(`No template found for ${notificationType}_${channel}`);
          continue;
        }

        // Render template with variables
        const renderedSubject = template.subject ? renderTemplate(template.subject, variables) : "";
        const renderedBody = renderTemplate(template.body, variables);

        // Send via appropriate channel
        let result;
        switch (channel) {
          case 'email':
            result = await sendEmail(
              supabaseUrl,
              supabaseKey,
              profile.email,
              renderedSubject,
              renderedBody,
              userId,
              notificationType,
              entityType,
              entityId
            );
            break;
          case 'sms':
            result = await sendSMS(
              supabaseUrl,
              supabaseKey,
              prefs?.phone_number || "",
              renderedBody,
              userId,
              notificationType,
              entityType,
              entityId
            );
            break;
          case 'voice':
            result = await sendVoice(
              supabaseUrl,
              supabaseKey,
              prefs?.phone_number || "",
              renderedBody,
              userId,
              notificationType,
              entityType,
              entityId,
              profile.full_name || variables.customerName || "Customer"
            );
            break;
        }

        results.push({ channel, success: result?.success, ...result });
      } catch (error: any) {
        console.error(`Failed to send ${channel} notification:`, error);
        results.push({ channel, success: false, error: error.message });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Notifications processed",
        sent: results,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error("Error sending notification:", error);
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

function renderTemplate(template: string, variables: Record<string, any>): string {
  let rendered = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    rendered = rendered.replace(regex, String(value));
  }
  return rendered;
}

function getNotificationTypeEnabled(prefs: any, notificationType: string): boolean {
  if (!prefs) return true;
  
  if (notificationType.includes('kyc')) return prefs.kyc_alerts !== false;
  if (notificationType.includes('loan')) return prefs.loan_alerts !== false;
  if (notificationType.includes('emi')) return prefs.emi_reminders !== false;
  if (notificationType.includes('payment')) return prefs.payment_alerts !== false;
  
  return true;
}

async function sendEmail(
  supabaseUrl: string,
  supabaseKey: string,
  to: string,
  subject: string,
  body: string,
  userId: string,
  notificationType: string,
  entityType?: string,
  entityId?: string
) {
  const response = await fetch(`${supabaseUrl}/functions/v1/send-email-notification`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ to, subject, body, userId, notificationType, entityType, entityId }),
  });
  return await response.json();
}

async function sendSMS(
  supabaseUrl: string,
  supabaseKey: string,
  to: string,
  message: string,
  userId: string,
  notificationType: string,
  entityType?: string,
  entityId?: string
) {
  if (!to) {
    return { success: false, error: "Phone number not available" };
  }
  const response = await fetch(`${supabaseUrl}/functions/v1/send-sms-notification`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ to, message, userId, notificationType, entityType, entityId }),
  });
  return await response.json();
}

async function sendVoice(
  supabaseUrl: string,
  supabaseKey: string,
  to: string,
  message: string,
  userId: string,
  notificationType: string,
  entityType?: string,
  entityId?: string,
  customerName?: string
) {
  if (!to) {
    return { success: false, error: "Phone number not available" };
  }
  const response = await fetch(`${supabaseUrl}/functions/v1/send-voice-notification`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ to, message, userId, notificationType, entityType, entityId, customerName }),
  });
  return await response.json();
}
