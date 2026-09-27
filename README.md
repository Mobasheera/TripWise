# ✈️ TripWise

### **Travel together. Spend smarter. Settle instantly.**

> **TripWise is an AI-powered group travel platform that brings itinerary planning, collaborative expense management, intelligent settlement, spending insights, and instant UPI payments into one unified experience.**

<p align="center">

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge\&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge\&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge\&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?style=for-the-badge\&logo=supabase)](https://supabase.com/)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-AI-4285F4?style=for-the-badge\&logo=google)](https://ai.google.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge\&logo=tailwindcss)](https://tailwindcss.com/)

</p>

<p align="center">
  <a href="#-overview">Overview</a> •
  <a href="#-features">Features</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-getting-started">Getting Started</a> •
  <a href="#-project-structure">Structure</a>
</p>

---

## 🌍 Overview

Planning a group trip sounds simple.

Until someone pays for the hotel.

Someone else pays for dinner.

Another person books the tickets.

Taxes and service charges get added.

Then everyone starts asking:

> **"Who owes whom how much?"**

Traditional expense-splitting tools can calculate balances, but they often treat a trip as nothing more than a list of transactions.

**TripWise treats the trip as a complete system.**

It connects:

**Planning → Spending → Analysis → Settlement → Payment**

into one experience.

Instead of switching between itinerary apps, expense trackers, spreadsheets, calculators and payment apps, TripWise provides a single workspace for the entire group trip.

---

# 🚀 Why TripWise?

### The problem

Group travel creates multiple layers of coordination:

* 🗺️ Where are we going?
* 📅 What are we doing each day?
* 💰 Who paid for what?
* 👥 Who participated in each expense?
* 🧾 How should taxes and service charges be divided?
* 📊 Where did the trip budget actually go?
* 🔄 How can we minimize the number of transactions?
* 💸 How does someone actually pay what they owe?

Most solutions solve only one or two of these problems.

### The TripWise approach

TripWise combines them into a single workflow:

```text
                 ┌──────────────────┐
                 │    PLAN TRIP     │
                 └────────┬─────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │   ADD EXPENSES   │
                 └────────┬─────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │  SPLIT EXPENSES  │
                 └────────┬─────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │ ANALYZE SPENDING │
                 └────────┬─────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │ SETTLEMENT ENGINE│
                 └────────┬─────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │   UPI PAYMENT    │
                 └──────────────────┘
```

---

# ✨ Features

## 🗺️ Collaborative Trip Planning

Create a trip and organize the journey around a shared itinerary.

Members can participate in the same trip while keeping trip-specific information organized in one place.

---

## 👥 Group-Based Expense Management

Track expenses across the entire group.

Each expense can capture:

* Amount
* Category
* Person who paid
* Participants
* Individual shares
* Additional charges

This creates a clear financial record for the trip.

---

## 🧾 Intelligent Expense Splitting

TripWise goes beyond simply dividing a bill by the number of people.

Expenses can account for:

* Different participants
* Different amounts owed
* Taxes
* Service charges
* Category-based spending
* Item-level attribution

This makes the resulting balances much closer to the way real group expenses actually happen.

---

# 🤖 AI-Powered Expense Understanding

TripWise integrates **Google Gemini** to introduce AI into the expense workflow.

A receipt can follow a pipeline such as:

```text
Receipt
   │
   ▼
Gemini Vision
   │
   ▼
Extracted Items
   │
   ▼
Item Attribution
   │
   ▼
Split Calculator
   │
   ▼
Settlement Engine
   │
   ▼
AI Explanation
```

Instead of manually entering every item from a receipt, the system can use AI-assisted extraction and attribution to reduce repetitive work.

---

# 🧠 Explainable Settlement

A settlement should not simply say:

> **"You owe ₹437."**

It should explain **why**.

TripWise is designed around explainable settlement so users can understand how their final balance was calculated.

For example:

```text
You owe ₹437

₹250  → Hotel
₹100  → Dinner
₹50   → Transport
₹37   → Taxes & service charges
────────────────────────
₹437  → Total
```

The goal is to make every settlement understandable rather than turning the calculation into a black box.

---

# 💸 Smart Settlement

TripWise calculates the group's outstanding balances and determines who needs to pay whom.

Instead of manually comparing every person's expenses:

```text
Alice → Bob
Bob   → Charlie
Charlie → Alice
...
```

the settlement engine processes the group's balances and generates the required payment relationships.

### Goal

> **Minimize unnecessary transactions while preserving the correct final balances.**

---

# 📱 One-Tap UPI Payments

This is where TripWise connects **expense management directly to payment execution**.

When a participant owes another member money, TripWise can generate a UPI payment deep link containing information such as:

```text
Receiver
Amount
Currency
UPI ID
```

The user can then launch a compatible UPI application directly from the settlement interface.

### Flow

```text
TripWise Settlement
        │
        ▼
   Amount Owed
        │
        ▼
   UPI Deep Link
        │
        ▼
 ┌───────────────┐
 │ UPI App       │
 │               │
 │ Amount: ₹300  │
 │ Receiver: ... │
 └───────────────┘
```

This turns:

**"I owe you money."**

into:

**"Pay now."**

---

# 📊 Spending Summary

TripWise provides a visual overview of where the group's money is going.

Expenses can be categorized into areas such as:

* 🍔 Food
* 🏨 Accommodation
* 🚕 Transport
* 🎟️ Entertainment
* 🛍️ Shopping
* 📦 Other

The spending summary helps the group understand the financial shape of the trip rather than only looking at individual transactions.

---

# 📄 Expense Reports

TripWise also supports generating structured expense information for easier sharing and record keeping.

The project includes PDF-generation capabilities for producing useful trip/expense documentation.

---

# 🧭 Interactive Maps & Trip Visualization

TripWise includes interactive geospatial components for representing trip-related information visually.

The project uses technologies including:

* Leaflet
* React Leaflet
* Three.js
* React Globe GL

This provides the foundation for map-based and globe-based trip visualization.

---

# 🧬 Digital Trip Visualization

TripWise also explores a more visual representation of a trip through its digital-twin / geospatial experience.

The idea is to transform a traditional list of destinations into a spatial representation of the journey.

```text
Trip
 │
 ├── Locations
 │
 ├── Routes
 │
 ├── Activities
 │
 ├── Expenses
 │
 └── Participants
```

This creates the foundation for richer travel analytics and visualization.

---

# 🔐 Authentication

TripWise uses **Supabase** for authentication and backend services.

The authentication architecture supports:

```text
User
 │
 ▼
Google Authentication
 │
 ▼
Authentication Callback
 │
 ▼
Profile / Onboarding
 │
 ▼
Payment Preference
 │
 ▼
TripWise Dashboard
```

The onboarding flow can also capture the user's preferred payment method and UPI information for later settlement.

---

# 🏗️ Architecture

At a high level:

```text
┌───────────────────────────────────────────────────────┐
│                    TRIPWISE CLIENT                    │
│                                                       │
│  Next.js + React + TypeScript + Tailwind CSS          │
│                                                       │
│  ┌───────────┐ ┌───────────┐ ┌────────────────────┐   │
│  │ Dashboard │ │ Itinerary │ │ Expense Management │   │
│  └───────────┘ └───────────┘ └────────────────────┘   │
│                                                       │
│  ┌───────────┐ ┌───────────┐ ┌────────────────────┐   │
│  │ Settlement│ │  Summary  │ │ Maps / Visualization│  │
│  └───────────┘ └───────────┘ └────────────────────┘   │
└─────────────────────────┬─────────────────────────────┘
                          │
                          ▼
┌───────────────────────────────────────────────────────┐
│                     APPLICATION LOGIC                 │
│                                                       │
│  Authentication                                      │
│  Expense Processing                                   │
│  Settlement Engine                                   │
│  Payment Generation                                  │
│  Validation                                          │
│  AI Integration                                      │
└──────────────┬────────────────────────┬───────────────┘
               │                        │
               ▼                        ▼
      ┌────────────────┐       ┌──────────────────┐
      │    Supabase    │       │  Google Gemini   │
      │                │       │                  │
      │ Auth           │       │ Receipt analysis │
      │ Database       │       │ AI explanations  │
      └────────────────┘       └──────────────────┘
               │
               ▼
      ┌────────────────┐
      │   UPI Layer    │
      │                │
      │ Deep Links     │
      │ Payment Launch │
      └────────────────┘
```

---

# 🔄 Core Expense Pipeline

One of the central workflows in TripWise is:

```text
┌─────────┐
│ Receipt │
└────┬────┘
     │
     ▼
┌───────────────┐
│ Gemini Vision │
└──────┬────────┘
       │
       ▼
┌─────────────────┐
│ Extracted Items │
└───────┬─────────┘
        │
        ▼
┌──────────────────┐
│ Item Attribution │
└────────┬─────────┘
         │
         ▼
┌─────────────────┐
│ Split Calculator │
└────────┬────────┘
         │
         ▼
┌──────────────────┐
│ Settlement Engine│
└────────┬─────────┘
         │
         ▼
┌─────────────────┐
│ AI Explanation  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  UPI Deep Link  │
└─────────────────┘
```

---

# 🛠️ Tech Stack

| Layer            | Technology                |
| ---------------- | ------------------------- |
| Framework        | Next.js 15                |
| UI               | React 19                  |
| Language         | TypeScript                |
| Styling          | Tailwind CSS 4            |
| Authentication   | Supabase Auth             |
| Database         | Supabase                  |
| AI               | Google Gemini             |
| Validation       | Zod                       |
| Maps             | Leaflet / React Leaflet   |
| 3D Visualization | Three.js / React Globe GL |
| PDF Generation   | jsPDF / jsPDF AutoTable   |
| Icons            | Lucide React              |
| Package Manager  | npm                       |

The current project dependencies include Next.js, React, Supabase, Gemini, Leaflet, React Leaflet, Three.js, React Globe GL, jsPDF, Zod and related TypeScript tooling.

---

# 📁 Project Structure

```text
TripWise/
│
├── app/
│   ├── dashboard/
│   ├── onboarding/
│   ├── trip/
│   ├── digital-twin/
│   ├── summary/
│   └── auth/
│
├── backend/
│
├── components/
│   └── reusable UI components
│
├── lib/
│   ├── Supabase utilities
│   ├── AI / Gemini logic
│   ├── settlement logic
│   ├── payment utilities
│   └── validation
│
├── public/
│   └── images and static assets
│
├── supabase/
│   └── database configuration / migrations
│
├── types/
│   └── TypeScript definitions
│
├── package.json
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

The repository currently separates application pages, reusable components, backend logic, libraries, Supabase resources, public assets and TypeScript types.

---

# ⚙️ Getting Started

## 1. Clone the repository

```bash
git clone https://github.com/Mobasheera/TripWise.git
cd TripWise
```

## 2. Install dependencies

```bash
npm install
```

## 3. Configure environment variables

Create:

```text
.env.local
```

Add the required Supabase and Gemini configuration.

Example:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

GEMINI_API_KEY=your_gemini_api_key
```

> **Never commit `.env.local` or expose private API keys.**

## 4. Start the development server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## 5. Production build

```bash
npm run build
```

## 6. Run the production server

```bash
npm start
```

---

# 🔑 Environment Variables

| Variable                        | Purpose                    |
| ------------------------------- | -------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL       |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public client key |
| `GEMINI_API_KEY`                | Google Gemini API access   |

Your local `.env.local` should **never** be committed to Git.

---

# 🧪 Development Workflow

### Install

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Production

```bash
npm start
```

### Lint

```bash
npm run lint
```

---

# 🧩 Core Modules

### Authentication

Handles:

* Google authentication
* Authentication callbacks
* User onboarding
* Profile information
* Payment preferences

### Trip Management

Handles:

* Trip creation
* Participants
* Invitations / joining
* Itinerary
* Trip-specific data

### Expense Engine

Handles:

* Expense creation
* Categories
* Participants
* Splitting
* Additional charges

### Settlement Engine

Handles:

* Group balances
* Debtor / creditor relationships
* Transaction minimization
* Settlement generation

### AI Layer

Handles:

* Receipt understanding
* Item extraction
* Expense attribution
* Settlement explanations

### Payment Layer

Handles:

* UPI information
* UPI deep-link generation
* One-tap payment launching

---

# 🎯 Design Philosophy

TripWise follows a simple principle:

> ### **Don't just calculate the expense. Explain it, optimize it, and help the user settle it.**

That means every major part of the system is designed around reducing friction.

```text
Manual Calculation
       ↓
Automated Calculation
       ↓
Explainable Result
       ↓
Optimized Settlement
       ↓
Instant Payment
```

---

# 🚧 Roadmap

TripWise is an actively developed project.

Potential future improvements include:

* [ ] More advanced AI trip planning
* [ ] Smarter itinerary recommendations
* [ ] Budget forecasting
* [ ] Advanced spending analytics
* [ ] Improved receipt recognition
* [ ] Multi-currency support
* [ ] Currency conversion
* [ ] Notifications and reminders
* [ ] Richer digital-trip visualization
* [ ] More UPI/payment integrations
* [ ] Offline-friendly trip access
* [ ] Expanded trip reports

---

# 🛡️ Security

TripWise is designed with security in mind.

Important principles include:

* Authentication handled through Supabase
* Environment secrets kept outside source control
* Client/server separation for sensitive operations
* Input validation using Zod
* Database-backed user and trip access control
* No payment credentials are stored by TripWise

> TripWise launches UPI payment intents; it does not process or store users' bank credentials or UPI PINs.

---

# 👨‍💻 Development Team

TripWise is developed as a collaborative engineering project.

### Contributors

* **Moba** — Development, architecture & product implementation
* **Jay** — Development & collaboration
* **Avi** — Development & collaboration

---

# 📜 Project Status

**Active Development**

TripWise is being developed as a full-stack software engineering project exploring the intersection of:

```text
AI
+
Travel
+
FinTech
+
Data Visualization
+
Collaborative Systems
```

---

# ⭐ Support the Project

If you find TripWise interesting:

⭐ **Star the repository**

🐛 **Open an issue**

💡 **Suggest an improvement**

🔀 **Submit a pull request**

Every contribution helps improve the project.

---

# 📄 License

This project is currently developed as an academic / engineering project.

License terms can be added here when the project adopts an open-source license.

---

<p align="center">

### ✈️ TripWise

**Plan together. Spend transparently. Settle effortlessly.**

Built with ❤️ and a lot of debugging.

</p>
