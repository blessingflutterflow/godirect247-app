# GoDirect247 Generosity Rewards System — Client Testing Guide

> **What is this?** This guide walks you through testing the new "Generosity Rewards" feature from beginning to end, using South African names and real scenarios.

---

## Step 1: Sign Up as Sipho (The Leader)

1. Open the app in your browser (the Vercel URL).
2. Click **"Sign Up"**.
3. Fill in the form as follows:
   - **Full Name:** Sipho Mkhize
   - **Email:** `test.sipho@example.com` (or your email + `+sipho`)
   - **Password:** Choose any password you will remember
   - **Phone:** 082 000 0001
   - **ID Number:** 850101 0000 001
   - **Employment Status:** Employed
   - **Where did you hear about us?:** Social Media
   - **Plan Type:** Select **Plus**
   - **Tier:** Silver Plus
4. Submit the form.

**What you should see:**
- You land on the **Dashboard**.
- At the top, you see "Welcome, Sipho Mkhize".
- Scroll down to **"Steps To The Top"** card.
- It says: **"Not Started"** and your **Harvest Balance is R0**.

---

## Step 2: Get Your Referral Link

1. On your dashboard, scroll to the **"Referral Hub"** section.
2. You will see a link like:
   ```
   https://your-app.vercel.app/signup?ref=ABCD1234
   ```
3. Click **"Copy Link"**.
4. Keep this link safe — you will send it to your 2 team members.

---

## Step 3: Sign Up Nomusa (Team Member 1)

**Important:** Use a different browser or open an **Incognito/Private window** so you are not logged in as Sipho.

1. Paste Sipho's referral link into the address bar:
   ```
   https://your-app.vercel.app/signup?ref=ABCD1234
   ```
2. Fill in the form:
   - **Full Name:** Nomusa Dlamini
   - **Email:** `test.nomusa@example.com`
   - **Phone:** 082 000 0002
   - **ID Number:** 900202 0000 002
   - **Plan Type:** Plus
   - **Tier:** Silver Plus
3. Submit.

**What happens behind the scenes:**
- Nomusa is now linked to Sipho as a referral.
- In the **Admin Dashboard**, the admin will see a new referral record.

---

## Step 4: Sign Up Thabo (Team Member 2)

1. Again, use a **new Incognito/Private window**.
2. Paste the **same referral link** (`?ref=ABCD1234`).
3. Fill in the form:
   - **Full Name:** Thabo Nkosi
   - **Email:** `test.thabo@example.com`
   - **Phone:** 082 000 0003
   - **ID Number:** 880303 0000 003
   - **Plan Type:** Plus
   - **Tier:** Silver Plus
4. Submit.

**Now Sipho has 2 referrals.** But they are not "paid" yet — so no rewards are unlocked.

---

## Step 5: Activate Nomusa and Thabo

Each member must pay their **R650 activation fee** and the admin must verify it.

### For Nomusa:
1. Log in as Nomusa.
2. On the dashboard, you will see a button: **"Activate Account (R650)"**.
3. Click it and follow the payment steps (this simulates payment — in production, admin will verify a real bank payment).
4. **Or:** Log in as the **Admin** → go to the **Payments** tab → find Nomusa's pending payment → click **"Verify"**.

### For Thabo:
1. Log in as Thabo.
2. Click **"Activate Account (R650)"**.
3. Or verify Thabo's payment in the **Admin Dashboard**.

---

## Step 6: Check Sipho's Auto-Rewards (The Big Moment)

1. Log back in as **Sipho**.
2. Go to the dashboard.
3. Scroll to **"Steps To The Top"**.

**What you should see now:**
- **Current Status:** Silver Plan
- **Harvest Balance:** **R3,000**
- A new card: **"My Team"**
  - Leader: Sipho Mkhize
  - Members: Nomusa Dlamini, Thabo Nkosi
  - Team step: **1 of 9**
- A **notification bell** at the top should show:
  > "Your trio is formed with Nomusa Dlamini & Thabo Nkosi! Step 1 unlocked."

---

## Step 7: Understand the 9 Steps

| Step | Name | You Pay (Seed) | You Earn (Harvest) | You Keep |
|------|------|-----------------|-------------------|----------|
| 1 | Silver Plan | R650 | R3,000 | — |
| 2 | Silver Gold Plan | R1,550 | R9,000 | R1,450 |
| 3 | Gold Plan | R4,900 | R10,750 | R4,100 |
| 4 | Platinum Plan | R10,000 | R20,090 | R850 |
| 5 | Diamond Gold | R15,000 | R31,890 | R5,850 |
| 6 | Premier Gold | R15,000 | R31,890 | R5,850 |
| 7 | Prestige Gold | R20,000 | R40,090 | R11,890 |
| 8 | King Gold | R25,000 | R50,890 | R15,090 |
| 9 | Superior Gold | R40,000 | R100,090 | R10,890 |

---

## Step 8: Sipho Seeds to Step 2

1. Still logged in as Sipho.
2. In the **"Steps To The Top"** card, click:
   > **"Seed Silver Gold Plan"**
3. It costs **R1,550** from your Harvest Balance.

**What happens:**
- Harvest Balance: R3,000 → **R1,450**
- Your main **Earnings** increase by **R1,450** (the "keep" amount)
- You are now at **Step 2: Silver Gold Plan**
- Team step updates to **2 of 9**

---

## Step 9: Test Downstream Rewards (R2,500 Bonus)

This is where it gets interesting. **When Nomusa reaches Step 5 (Diamond Gold), Sipho automatically earns R2,500.**

### To test this:
1. Log in as **Nomusa**.
2. Nomusa must also get her own 2 referrals, activate them, and seed through steps 1–5.
3. **Shortcut for testing:** Ask the admin to manually set Nomusa's `generosityStep` to `5` in the Firebase console (for testing only).
4. Log back in as **Sipho**.

**What you should see:**
- A new card: **"Team Rewards: R2,500"**
- Notification: *"R2,500 earned! Nomusa Dlamini reached Diamond Gold Status."*
- Your **Total Earnings** increased by R2,500.

---

## Step 10: Test the Admin Dashboard

1. Go to `/admin` on the app.
2. Log in with the admin credentials (email + password from the `seed-admin` script).
   - Default: `admin@godirect247.co.za` / `Admin@2026!`
3. You will see tabs:
   - **Members** — view all users, click any row to see their details drawer
   - **Payments** — verify pending payments
   - **Rewards** — release pre-launch rewards
   - **Referrals** — view all referral links
   - **Withdrawals** — approve/reject withdrawal requests
   - **Teams** (new!) — view all Generosity Trios

### In the Members Drawer:
Click on Sipho's name. You will now see:
- Generosity Step: 2 / 9
- Harvest Balance: R1,450
- Team ID
- Funded By
- Downstream Rewards: R2,500

### In the Teams Tab:
You will see Sipho's trio:
- Leader: Sipho Mkhize
- Members: Nomusa Dlamini, Thabo Nkosi
- Step: 2 / 9
- Status: Active

---

## Step 11: Test Withdrawals

1. Log in as Sipho.
2. Make sure your **Total Earnings** are above R100 (share earnings or referral commissions).
3. Go to dashboard → click **"Request Withdrawal"**.
4. Fill in bank details:
   - Bank: FNB
   - Account Number: 1234567890
   - Account Holder: Sipho Mkhize
   - Account Type: Cheque
5. Submit.
6. Log in as **Admin** → **Withdrawals** tab.
7. Find Sipho's request → click **"Approve"** or **"Reject"**.

---

## Step 12: Test Link Sharing (Pay-per-Share)

1. Log in as any user.
2. In the Referral Hub, click **"Share on WhatsApp"** or **"Copy Link"**.
3. Each share action earns **R0.10** (up to 50 shares per day).
4. Check dashboard → **Share Earnings** increases.

---

## Quick Reference: What Was Built

| Feature | What It Does |
|---------|-------------|
| Trio/Team Formation | Auto-creates a 3-person team when you get 2 paid referrals |
| 9-Step Generosity Roadmap | Seed → Harvest → Keep progression |
| Auto Milestone Checks | Step 1 unlocks automatically when 2 referrals pay |
| Downstream Rewards | Leader earns R2,500 when a team member hits Step 5 |
| Admin Teams Tab | View all trios, leaders, members, and steps |
| Admin Member Drawer | See generosity step, harvest, team ID, downstream rewards |
| Harvest Balance | Internal wallet for seeding between steps |
| Keep Amount | Portion of harvest that goes to real earnings |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Trio not showing | Make sure 2 referrals have `status: paid` (activated) |
| Harvest balance is 0 | Check that generosityStep is at least 1 |
| Downstream reward not showing | Member must reach exactly Step 5; check `fundedBy` field |
| Admin can't see Teams tab | Make sure you are logged in as admin (`/admin`) |
| 404 errors | Make sure Vercel Root Directory is set to `my-app` and Framework Preset is `Next.js` |

---

## Questions?

If anything breaks or doesn't work as described above, check the browser **Console** (F12 → Console tab) for error messages and share them with the developer.
