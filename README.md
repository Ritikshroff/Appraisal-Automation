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
