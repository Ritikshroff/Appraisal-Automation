# Cybermedia Appraisal Management System

Internal role-based appraisal platform for performance reviews and salary calibration.

## 🔐 Demo Login Credentials

> [!IMPORTANT]
> All accounts use the same default password: **`Cybermedia@123`**

### 🏢 Organization Leadership (CEO)

| Name | Email | Role |
| :--- | :--- | :--- |
| Meera Kapoor | `meera.kapoor@cmrsl.example` | CEO (Full Visibility & Final Calibration) |

### 👥 Management Team (Managers)

| Name | Email | Department |
| :--- | :--- | :--- |
| Anita Rao | `anita.rao@cmrsl.example` | Engineering Manager (Tech Team) |
| Vikram Singh | `vikram.singh@cmrsl.example` | Media Manager (Media Team) |

### 💻 Staff Members (Employees)

| Name | Email | Department |
| :--- | :--- | :--- |
| Rahul Sharma | `rahul.sharma@cmrsl.example` | Tech (Senior Software Engineer) |
| Priya Nair | `priya.nair@cmrsl.example` | Tech (Frontend Engineer) |
| Sneha Patel | `sneha.patel@cmrsl.example` | Media (Content Strategist) |

---

## 🚀 Technical Stack

- **Framework**: Next.js 15+ (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: NextAuth.js v5 (Beta)
- **Insights**: OpenAI API (GPT-4o)
- **Styling**: Tailwind CSS 4.0

## 🛠️ Development Setup

1. **Install dependencies**:

   ```bash
   pnpm install
   ```

2. **Database Setup**:

   ```bash
   npx prisma generate
   npx prisma db push
   npx prisma db seed
   ```

3. **Run Dev Server**:

   ```bash
   npm run dev
   ```

## 📜 Deployment Note

This application uses a Lazy Proxy pattern for Prisma to ensure stability during Next.js build phases on platforms like Vercel. Database URL checks are deferred to runtime.







<!-- new implemntations -->
# 🚀 Future Appraisal System Integrations

This document tracks the specific organizational requirements to be implemented for the final production version of the CyberMedia Appraisal Automation system.

---

## 1. 📝 Employee Input Enhancements
- [ ] **Employee Overall Rating**: Add a "Self-Rating" field in the employee section (Step 1). This allows employees to provide an official overall score before the manager review.
- [ ] **Narrative Deep-Dive**: Expand the "Employee Comments" section to allow for multi-part responses (Achievements vs. Challenges).

## 2. 📊 The "CM Standard" Rating System
- [ ] **Dropdown Integration**: Replace numeric inputs (0-10) in KRAs and Skills with a standardized dropdown menu.
- [ ] **CM Scale Implementation**: (Pending values) Define the mapping for the CyberMedia rating scale:
  - *Example: [1: Poor, 2: Average, 3: Good, 4: Very Good, 5: Outstanding]*
- [ ] **Validation**: Ensure both Employee (Self) and Manager ratings use the same standardized scale for alignment gap analysis.

## 3. 🏢 Organizational Data Sync
- [ ] **Bulk Import**: Implement a script/API to ingest the `employee_import.csv` (Hierarchy, Emails, Teams, and Manager IDs).
- [ ] **Dynamic Hierarchy**: Ensure the "Team Reviews" and "CEO Panel" views update automatically based on the `reportsTo` logic in the data import.

## 💰 4. Financial & Executive Decision
- [ ] **Budget Impact View**: (Currently Hidden) Reactivate the "Budget Impact" card in the CEO Panel to show total salary hike commitments in real-time.
- [ ] **Hike Calibration**: Link the "Calibrated Rating" directly to suggested "Hike %" ranges based on company policy.

---
*Note: These points were prioritized on 2026-05-11 to make the system "Real Usable" for organization-wide deployment.*

