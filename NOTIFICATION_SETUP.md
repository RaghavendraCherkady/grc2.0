# Notification System Setup Guide

This guide will help you configure SMS, Email, and Voice notifications using Twilio, Resend, and Vapi.

## Overview

Your credentials have been provided. Here's what needs to be configured:

### 1. SMS Notifications (Twilio)
- **Twilio Phone Number**: `+12175877364`
- **Twilio Auth Token**: `f34733eb1613c3fb1abb99022e910b42`
- **Twilio Account SID**: ⚠️ **REQUIRED** - Please provide your Twilio Account SID

### 2. Email Notifications (Resend)
- **Resend API Key**: `re_tfBD5Hdt_9QPugNU6Q1SC7FqysPBEGDSf`

### 3. Voice Notifications (Vapi)
- **Vapi API Key**: Already configured in the edge function
- **Vapi Phone Number ID**: ⚠️ **REQUIRED** - See VAPI_SETUP_GUIDE.md

---

## Configuration Steps

### Step 1: Get Your Twilio Account SID

1. Go to [Twilio Console](https://console.twilio.com/)
2. On the main dashboard, you'll see:
   - **Account SID** (starts with "AC...")
   - **Auth Token** (already provided)
3. Copy your **Account SID**

### Step 2: Configure Environment Variables in Supabase

1. Go to your Supabase Dashboard
2. Navigate to **Project Settings** → **Edge Functions**
3. Add the following environment variables:

#### SMS (Twilio) Configuration
```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=f34733eb1613c3fb1abb99022e910b42
TWILIO_PHONE_NUMBER=+12175877364
```

#### Email (Resend) Configuration
```
RESEND_API_KEY=re_tfBD5Hdt_9QPugNU6Q1SC7FqysPBEGDSf
```

#### Voice (Vapi) Configuration
```
VAPI_PHONE_NUMBER_ID=phn_xxxxxxxxxxxxxxxxxxxxxxxxx
```
*(See VAPI_SETUP_GUIDE.md for getting this ID)*

### Step 3: Verify Resend Domain (Important for Email)

⚠️ **Important**: Resend requires domain verification before sending emails.

1. Go to [Resend Dashboard](https://resend.com/domains)
2. Click **"Add Domain"**
3. Enter your domain (e.g., `novagrc.com`)
4. Add the DNS records provided by Resend to your domain registrar
5. Wait for verification (usually takes a few minutes)

**Temporary Solution**: For testing, you can use Resend's test mode which allows sending to verified email addresses only.

### Step 4: Update Email "From" Address

After verifying your domain, update the edge function:

Edit `/supabase/functions/send-email-notification/index.ts`:

```typescript
// Change this line (around line 76):
from: "NOVA-GRC <notifications@novagrc.com>",

// To use your verified domain:
from: "NOVA-GRC <notifications@your-verified-domain.com>",
```

---

## Testing the Setup

### Test SMS Notifications

1. Go to **Communication Log** in your application
2. Click **"Send Test Notification"**
3. Select **SMS** as the channel
4. Enter a phone number (with country code)
5. Click **Send**
6. Check if the SMS is received

### Test Email Notifications

1. Go to **Communication Log** in your application
2. Click **"Send Test Notification"**
3. Select **Email** as the channel
4. Enter an email address
5. Click **Send**
6. Check your inbox

### Test Voice Notifications

1. Go to **Voice Call Demo**
2. Enter a phone number
3. Select notification type
4. Click **"Make Voice Call"**
5. Answer the incoming call

---

## Troubleshooting

### SMS Not Working

**Error: "Twilio API error: 20003"**
- Your Twilio Account SID is incorrect
- Verify the Account SID in your Twilio Console

**Error: "Twilio API error: 21408"**
- Your Twilio phone number is not configured for SMS
- Verify the phone number in your Twilio Console

**Error: "Twilio API error: 21211"**
- The recipient's phone number is invalid
- Ensure the number includes country code (e.g., +919876543210)

### Email Not Working

**Error: "Resend API error: 403"**
- Your domain is not verified in Resend
- Follow Step 3 above to verify your domain

**Error: "Resend API error: 422"**
- The "from" email address doesn't match a verified domain
- Update the "from" address to use your verified domain

### Voice Not Working

**Error: "Couldn't Get Phone Number"**
- You need to configure VAPI_PHONE_NUMBER_ID
- See VAPI_SETUP_GUIDE.md for instructions

---

## Environment Variables Summary

Here's a complete list of all environment variables you need to set in Supabase:

```bash
# Twilio (SMS)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  # ⚠️ YOU NEED TO PROVIDE THIS
TWILIO_AUTH_TOKEN=f34733eb1613c3fb1abb99022e910b42
TWILIO_PHONE_NUMBER=+12175877364

# Resend (Email)
RESEND_API_KEY=re_tfBD5Hdt_9QPugNU6Q1SC7FqysPBEGDSf

# Vapi (Voice)
VAPI_PHONE_NUMBER_ID=phn_xxxxxxxxxxxxxxxxxxxxxxxxx  # ⚠️ SEE VAPI_SETUP_GUIDE.md
```

---

## Cost Estimates

### Twilio SMS
- India: ~₹0.50-1.00 per SMS
- USA: ~$0.0079 per SMS
- Other countries: Varies

### Resend Email
- Free tier: 3,000 emails/month
- Paid: $20/month for 50,000 emails

### Vapi Voice
- Phone number: ~$1-2/month
- Outbound calls: ~$0.01-0.03/minute

---

## Security Best Practices

1. **Never commit API keys** to version control
2. **Use environment variables** for all sensitive data
3. **Rotate credentials** regularly (every 90 days)
4. **Enable 2FA** on all third-party services
5. **Monitor usage** to detect unauthorized access

---

## Support

### Twilio
- [Twilio Console](https://console.twilio.com/)
- [Twilio Docs](https://www.twilio.com/docs/sms)
- [Twilio Support](https://support.twilio.com/)

### Resend
- [Resend Dashboard](https://resend.com/overview)
- [Resend Docs](https://resend.com/docs)
- [Resend Support](https://resend.com/support)

### Vapi
- [Vapi Dashboard](https://dashboard.vapi.ai/)
- [Vapi Docs](https://docs.vapi.ai/)
- [Vapi Discord](https://discord.gg/vapi)

---

## Next Steps

1. ✅ Provide your **Twilio Account SID**
2. ✅ Configure all environment variables in Supabase
3. ✅ Verify your domain in Resend
4. ✅ Purchase a phone number in Vapi (for voice calls)
5. ✅ Test all notification channels
6. ✅ Set up monitoring and alerts
