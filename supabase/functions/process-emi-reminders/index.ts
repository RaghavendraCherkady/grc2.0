import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
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
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Calculate reminder dates
    const in7Days = new Date(today);
    in7Days.setDate(in7Days.getDate() + 7);
    const in7DaysStr = in7Days.toISOString().split('T')[0];
    
    const in3Days = new Date(today);
    in3Days.setDate(in3Days.getDate() + 3);
    const in3DaysStr = in3Days.toISOString().split('T')[0];
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const results = {
      reminders_7days: 0,
      reminders_3days: 0,
      reminders_1day: 0,
      overdue: 0,
      errors: [] as string[],
    };

    // Process 7-day reminders
    const { data: emis7Days, error: error7Days } = await supabase
      .from("emi_schedules")
      .select(`
        *,
        loan_applications(
          created_by,
          kyc_applications(
            customer_name
          )
        )
      `)
      .eq("due_date", in7DaysStr)
      .eq("status", "upcoming")
      .eq("reminder_sent_7days", false);

    if (!error7Days && emis7Days) {
      for (const emi of emis7Days) {
        try {
          await sendReminderNotification(
            supabaseUrl,
            supabaseKey,
            supabase,
            emi,
            "emi_reminder_7days",
            7
          );
          
          await supabase
            .from("emi_schedules")
            .update({ reminder_sent_7days: true })
            .eq("id", emi.id);
          
          results.reminders_7days++;
        } catch (error: any) {
          results.errors.push(`7-day reminder failed for EMI ${emi.id}: ${error.message}`);
        }
      }
    }

    // Process 3-day reminders
    const { data: emis3Days, error: error3Days } = await supabase
      .from("emi_schedules")
      .select(`
        *,
        loan_applications(
          created_by,
          kyc_applications(
            customer_name
          )
        )
      `)
      .eq("due_date", in3DaysStr)
      .eq("status", "upcoming")
      .eq("reminder_sent_3days", false);

    if (!error3Days && emis3Days) {
      for (const emi of emis3Days) {
        try {
          await sendReminderNotification(
            supabaseUrl,
            supabaseKey,
            supabase,
            emi,
            "emi_reminder_3days",
            3
          );
          
          await supabase
            .from("emi_schedules")
            .update({ reminder_sent_3days: true })
            .eq("id", emi.id);
          
          results.reminders_3days++;
        } catch (error: any) {
          results.errors.push(`3-day reminder failed for EMI ${emi.id}: ${error.message}`);
        }
      }
    }

    // Process 1-day (urgent) reminders - includes SMS and voice
    const { data: emis1Day, error: error1Day } = await supabase
      .from("emi_schedules")
      .select(`
        *,
        loan_applications(
          created_by,
          kyc_applications(
            customer_name
          )
        )
      `)
      .eq("due_date", tomorrowStr)
      .eq("status", "upcoming")
      .eq("reminder_sent_1day", false);

    if (!error1Day && emis1Day) {
      for (const emi of emis1Day) {
        try {
          // Send via all channels for urgent reminders
          await sendReminderNotification(
            supabaseUrl,
            supabaseKey,
            supabase,
            emi,
            "emi_reminder_1day",
            1,
            ['email', 'sms', 'voice']
          );
          
          await supabase
            .from("emi_schedules")
            .update({ reminder_sent_1day: true })
            .eq("id", emi.id);
          
          results.reminders_1day++;
        } catch (error: any) {
          results.errors.push(`1-day reminder failed for EMI ${emi.id}: ${error.message}`);
        }
      }
    }

    // Process overdue EMIs - voice call priority
    const { data: overdueEmis, error: errorOverdue } = await supabase
      .from("emi_schedules")
      .select(`
        *,
        loan_applications(
          created_by,
          kyc_applications(
            customer_name
          )
        )
      `)
      .lt("due_date", todayStr)
      .eq("status", "upcoming");

    if (!errorOverdue && overdueEmis) {
      for (const emi of overdueEmis) {
        try {
          // Update status to overdue
          await supabase
            .from("emi_schedules")
            .update({ status: "overdue" })
            .eq("id", emi.id);

          // Send overdue notification with voice priority
          await sendReminderNotification(
            supabaseUrl,
            supabaseKey,
            supabase,
            emi,
            "emi_overdue",
            0,
            ['voice', 'email', 'sms']
          );
          
          results.overdue++;
        } catch (error: any) {
          results.errors.push(`Overdue notification failed for EMI ${emi.id}: ${error.message}`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed_at: new Date().toISOString(),
        results,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error("Error processing EMI reminders:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

async function sendReminderNotification(
  supabaseUrl: string,
  supabaseKey: string,
  supabase: any,
  emi: any,
  templateType: string,
  daysUntilDue: number,
  channels?: ('email' | 'sms' | 'voice')[]
) {
  const userId = emi.loan_applications?.created_by;
  if (!userId) {
    throw new Error("User ID not found for loan application");
  }

  const customerName = emi.loan_applications?.kyc_applications?.customer_name || "Customer";
  const dueDate = new Date(emi.due_date).toLocaleDateString('en-IN');

  const variables = {
    customerName,
    loanId: emi.loan_application_id.substring(0, 8),
    emiNumber: emi.emi_number,
    amount: emi.amount.toLocaleString('en-IN'),
    dueDate,
    formattedAmount: `rupees ${Math.floor(emi.amount)}`,
    urgency: daysUntilDue === 0 ? "overdue" : daysUntilDue === 1 ? "urgent" : "normal",
  };

  const response = await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId,
      templateCode: templateType,
      variables,
      entityType: "emi_schedule",
      entityId: emi.id,
      channels,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send notification: ${error}`);
  }

  return await response.json();
}
