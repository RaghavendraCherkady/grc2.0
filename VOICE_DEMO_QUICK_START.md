# Voice Call Demo - Quick Start Guide

## 🎯 Where to Find It

After logging in to the NOVA-GRC application, look for the **Phone icon (📞)** in the top navigation bar:

```
Navigation Bar:
┌─────────────────────────────────────────────────────────────┐
│ 🛡️ NOVA-GRC | Dashboard | Review | ... | 📞 Voice Call Demo │
└─────────────────────────────────────────────────────────────┘
```

Click on **"Voice Call Demo"** to access the testing interface.

## 🚀 Quick Test (30 seconds)

### 1. Open Demo Page
- Click **"Voice Call Demo"** in navigation

### 2. Enter Your Details
```
Customer Name: [Your Name]
Phone Number: +91[Your 10-digit number]
Notification Type: KYC Approved (Congratulations)
Message: [Pre-filled - you can edit]
```

### 3. Make the Call
- Click blue **"Make Voice Call"** button
- Wait 5-10 seconds for confirmation
- Your phone will ring in 30-60 seconds

### 4. Answer the Call
- AI assistant will greet you
- Message will be delivered naturally
- Call ends automatically

### 5. Verify in Logs
- Go to **"Communication Log"**
- Filter: Channel = Voice
- See your call record with status and details

## 📱 Example Test Call

**Configuration:**
```
Customer Name: Rahul Kumar
Phone Number: +919876543210
Type: KYC Approved
Message: Congratulations! Your KYC has been approved.
```

**What Happens:**
1. ✅ System creates notification record
2. ✅ Selects "Congratulations" AI assistant
3. ✅ Vapi initiates call to +919876543210
4. ✅ Phone rings within 60 seconds
5. ✅ AI says: "Hello Rahul Kumar, Congratulations! Your KYC has been approved."
6. ✅ Call logged in Communication Log

## 🎨 Demo Page Features

### Visual Layout
```
┌──────────────────────────────────────────────┐
│ 📞 Voice Call Demo                           │
│ Test AI-powered voice notifications via Vapi │
├──────────────────────────────────────────────┤
│ Call Configuration                           │
│                                              │
│ Customer Name: [____________]                │
│ Phone Number:  [+91_________]                │
│ Notification Type: [▼ Select]               │
│ Message: [________________]                  │
│          [________________]                  │
│                                              │
│         [▶ Make Voice Call]                  │
├──────────────────────────────────────────────┤
│ ✅ Success Message (after call)              │
│ Call ID: xxx-xxx-xxx                         │
│ Phone: +919876543210                         │
└──────────────────────────────────────────────┘
```

## 🔍 Notification Types Available

1. **KYC Approved** → Uses Congratulations Assistant
2. **Loan Approved** → Uses Congratulations Assistant
3. **EMI Reminder - 7 Days** → Uses Loan Reminder Assistant
4. **EMI Reminder - 3 Days** → Uses Loan Reminder Assistant
5. **EMI Reminder - 1 Day** → Uses Loan Reminder Assistant

## ✅ Success Confirmation

After clicking "Make Voice Call", you'll see:

```
┌─────────────────────────────────────────┐
│ ✅ Call Initiated Successfully!        │
│                                         │
│ The voice call has been initiated.     │
│ The customer should receive a call     │
│ shortly.                                │
│                                         │
│ Call ID: abc-123-def-456               │
│ Phone Number: +919876543210            │
│ Notification ID: xyz-789-uvw-012       │
└─────────────────────────────────────────┘
```

## 🎯 Testing Tips

### ✅ DO:
- Use your own phone number first
- Test with both "Congratulations" and "Reminder" types
- Check Communication Log after each call
- Try different messages
- Verify call metadata is logged

### ❌ DON'T:
- Use random phone numbers
- Make excessive test calls (costs money)
- Test without confirming phone number is correct
- Forget to check Communication Log

## 📊 Where to See Call Records

### Communication Log
```
Navigation: Communication Log → Filter: Voice

┌───────────────────────────────────────────┐
│ 📞 Voice | KYC Approved | ✅ Delivered   │
│ 2025-11-07 18:30                         │
│ +919876543210                            │
│ Vapi Call ID: abc-123-def                │
└───────────────────────────────────────────┘
```

## 🛠️ Troubleshooting

### Call Not Working?

1. **Check Phone Number Format**
   - ✅ Correct: +919876543210
   - ✅ Correct: 9876543210 (auto-converted)
   - ❌ Wrong: 919876543210 (missing +)

2. **Verify You're Logged In**
   - Must be authenticated user
   - Check top-right shows your name

3. **Check Error Message**
   - Red error box shows specific issue
   - Common: "Invalid phone number"

4. **Wait Longer**
   - Calls can take up to 60 seconds to connect
   - Don't click button multiple times

## 🎬 Demo Video Flow

**Imagine this sequence:**

1️⃣ User logs in → Sees Voice Call Demo in nav
2️⃣ Clicks Voice Call Demo → Form appears
3️⃣ Enters details → Clicks Make Voice Call
4️⃣ Green success box → Shows call ID
5️⃣ Phone rings → User answers
6️⃣ AI speaks message → Clear and natural
7️⃣ Call ends → User checks Communication Log
8️⃣ Sees call record → Status: Delivered ✅

## 🌟 Key Advantages

1. **Smart AI Selection**: Automatically picks right assistant
2. **Natural Speech**: AI sounds human, not robotic
3. **Full Logging**: Every call tracked in database
4. **Error Handling**: Clear messages if issues occur
5. **Easy Testing**: One-click demo interface
6. **Real Integration**: Uses production Vapi API

## 📞 Ready to Test?

1. Open the app
2. Look for 📞 icon in top navigation
3. Click "Voice Call Demo"
4. Enter your phone number
5. Click "Make Voice Call"
6. Answer your phone!

That's it! The voice calling system is ready to demonstrate. 🎉
