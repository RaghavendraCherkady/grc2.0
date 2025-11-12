# Vapi Voice Calling Setup Guide

## Error: "Couldn't Get Phone Number. Need Either `phoneNumberId` Or `phoneNumber`."

This error occurs because Vapi requires a verified phone number to make outbound calls.

## Solution: Add a Phone Number to Your Vapi Account

### Step 1: Purchase a Phone Number in Vapi Dashboard

1. Go to [Vapi Dashboard](https://dashboard.vapi.ai/)
2. Navigate to **Phone Numbers** section in the left sidebar
3. Click **"Buy Phone Number"**
4. Choose your country (India for +91 numbers)
5. Select a phone number from the available options
6. Complete the purchase

### Step 2: Get Your Phone Number ID

1. After purchasing, go back to **Phone Numbers** section
2. Click on your newly purchased phone number
3. Copy the **Phone Number ID** (it looks like: `phn_xxxxxxxxxxxxxxxxxxxxxxxxx`)

### Step 3: Configure Environment Variable

You have two options:

#### Option A: Set Environment Variable in Supabase (Recommended)

1. Go to your Supabase dashboard
2. Navigate to **Project Settings** → **Edge Functions**
3. Under **Environment Variables**, add:
   - Name: `VAPI_PHONE_NUMBER_ID`
   - Value: `phn_xxxxxxxxxxxxxxxxxxxxxxxxx` (your phone number ID)
4. Save the changes

#### Option B: Hardcode in Edge Function (Not Recommended for Production)

Edit `/supabase/functions/send-voice-notification/index.ts`:

```typescript
// Replace this line:
phoneNumberId: Deno.env.get("VAPI_PHONE_NUMBER_ID") || null,

// With your actual phone number ID:
phoneNumberId: "phn_xxxxxxxxxxxxxxxxxxxxxxxxx",
```

### Step 4: Redeploy the Edge Function (if using Option A)

After adding the environment variable, you may need to redeploy the function for changes to take effect.

## Vapi Pricing Information

- **Phone Number**: ~$1-2/month (depending on region)
- **Outbound Calls**: ~$0.01-0.03/minute (depending on destination)
- **AI Assistant Usage**: Included in Vapi pricing

## Alternative: Use Vapi Web Calling (No Phone Number Required)

If you want to test without purchasing a phone number, use the **Web Voice Call Demo** instead:

1. Navigate to **Voice Call Demo** → **Web Voice** tab
2. This uses browser-based calling (no phone number required)
3. Perfect for testing and development

## Troubleshooting

### Error: "Phone Number ID Invalid"
- Verify the phone number ID is correct
- Ensure the phone number is active in your Vapi dashboard
- Check that the environment variable name matches exactly: `VAPI_PHONE_NUMBER_ID`

### Error: "Insufficient Funds"
- Add credits to your Vapi account
- Go to **Billing** section in Vapi dashboard

### Error: "Assistant Not Found"
- Verify the assistant IDs in the edge function are correct
- Check that assistants are published and active in Vapi dashboard

## Testing the Setup

After completing the setup:

1. Go to **Voice Call Demo** in your application
2. Enter a valid phone number (with country code)
3. Select a notification type
4. Click **"Make Voice Call"**
5. The call should be initiated successfully

## API Request Format

The correct Vapi API request format is:

```json
{
  "assistantId": "your-assistant-id",
  "phoneNumberId": "phn_xxxxxxxxxxxxxxxxxxxxxxxxx",
  "customer": {
    "number": "+919876543210",
    "name": "Customer Name"
  },
  "assistantOverrides": {
    "variableValues": {
      "customerName": "Customer Name",
      "message": "Your message here"
    },
    "firstMessage": "Your message here"
  }
}
```

## Support

For Vapi-specific issues:
- [Vapi Documentation](https://docs.vapi.ai/)
- [Vapi Discord Community](https://discord.gg/vapi)
- [Vapi Support](https://vapi.ai/support)
