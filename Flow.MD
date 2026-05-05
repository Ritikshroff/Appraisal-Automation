# Cybermedia Appraisal Management System: Flow & Documentation

The Cybermedia Appraisal Management System is a streamlined, role-based platform designed for performance reviews and salary calibration. It has been optimized for a manual, transparent workflow with real-time feedback and secure access.

---

## 👥 1. User Roles & Access Control
The system is strictly role-based, ensuring data privacy and scoped responsibility:
- **Employee**: Submits self-appraisals, performs self-ratings on KRAs/Skills, and views finalized results (Rating & Hike %).
- **Manager**: Reviews direct reports, provides calibrated ratings, and narrative feedback.
- **CEO (Approver)**: High-level visibility across the organization; performs final calibration and assigns salary hikes.

---

## ⚙️ 2. The Appraisal Lifecycle (5-Phase Engine)
The appraisal process follows a structured sequence:

### **Phase 1: Deep Insight (Self-Appraisal)**
Employees provide narrative answers regarding their achievements, business impact, and challenges.

### **Phase 2: KRA Portfolio**
Quantitative tracking of Key Responsibility Areas.
- **Employee**: Provides a self-rating (0-10).
- **Manager**: Provides a calibrated rating (0-10) and specific guidance.

### **Phase 3: Competency Matrix**
A skills-based evaluation (e.g., Technical Knowledge, Communication) where both Employee and Manager provide ratings to identify alignment gaps.

### **Phase 4: Manager Calibration**
The Manager provides an overall official rating and qualitative performance comments. Once submitted, the appraisal moves to the CEO for final approval.

### **Phase 5: Executive Decision**
The CEO reviews the calibrated data from the Manager and assigns:
- **Final Rating**: The official performance score.
- **Hike Percentage (%)**: The approved salary increase.
- **CEO Comments**: Final feedback for the employee.

---

## 🔄 3. Data & Status Flow
1. **DRAFT**: Employee starts filling out the form.
2. **SUBMITTED**: Employee submits the form; it becomes read-only for them and appears on the Manager's worklist.
3. **MANAGER_REVIEW**: Manager fills their section and submits; it appears on the CEO's worklist.
4. **COMPLETED**: CEO finalizes the rating and hike; the results are instantly visible to the Employee.

---

## ✨ 4. Enhanced UI/UX Features
To improve the user experience and data integrity, the following features have been implemented:

### **Validation & Feedback (Toasts)**
- **Smart Validation**: The system prevents submission if required fields are missing (Narrative answers, KRA ratings, Manager comments, etc.).
- **Real-Time Toasts**: Uses `sonner` for professional notifications (Success, Error, and Loading states).

### **Security & Accessibility**
- **Password Toggle**: An "Eye" button is integrated into login/signup forms to allow users to verify their password entry.
- **Role-Based Routing**: Automatic redirection to the appropriate workspace (`my-appraisal`, `team-reviews`, or `ceo-panel`) based on authentication status.

---

## 🛠️ 5. Technical Notes (Current Implementation)
- **AI Analytics**: AI-driven sentiment and summary analysis (via Google Gemini) are currently **disabled** to prioritize the manual calibration flow.
- **Database**: Uses SQLite for local development, with JSON fields stringified for compatibility.
- **System Calculations**: Aggregated metrics like "Budget Impact" and "Top Performers" are currently hidden to focus on individual employee appraisals.

---
*Last Updated: 2026-05-05*


Summary of Permissions
User Role	Can fill own appraisal?	Can review a team?	Can manage all talent?	Can approve hikes?
Employee	✅	❌	❌	❌
Manager	✅	✅	❌	❌
HR	✅	✅	✅	❌
CEO	✅	✅	❌	✅