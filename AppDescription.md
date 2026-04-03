# CheckMate: Application Analysis & Deep Dive

CheckMate is a sophisticated, real-time React application designed to digitize the manual workflow of physical check processing. It serves as a central hub for accounting and administrative departments to ingest, verify, track, and archive payment checks using modern web technologies and AI-driven automation.

---

## 1. Core Purpose & Problem Solved

**The Problem:** Traditional check processing is paper-heavy, slow, and prone to human error. Tracking the status of hundreds of checks across different stages (Received, Processing, Queued, Complete) without a digital system leads to a lack of transparency and secondary manual logging (e.g., in spreadsheets).

**The Solution:** CheckMate provides a **real-time, collaborative Kanban-style workspace**. It automates the data entry process using **Gemini AI** for optical character recognition (OCR) and structured data extraction, ensuring high accuracy and speed.

---

## 2. Technical Architecture

CheckMate is built on a "Serverless" architecture using the following stack:

### Frontend
- **Framework:** **React 19** with **TypeScript** for type safety and modern hook-based logic.
- **Build Tool:** **Vite** for lightning-fast development and optimized production bundles.
- **Styling:** **Tailwind CSS** with a custom design system including glassmorphism, dark mode, and dynamic color palettes.
- **State Management:** Uses React hooks (useState, useMemo, useEffect) combined with **Firebase Firestore's real-time listeners** (`onSnapshot`) to keep all clients in sync.
- **Drag & Drop:** Powered by **@atlaskit/pragmatic-drag-and-drop** for high-performance interactions on the Kanban board.
- **Client-Side Processing:** 
  - **OpenCV.js:** Used for contour detection and automated cropping of check images.
  - **Tesseract.js:** Used for orientation detection to ensure checks are upright before AI extraction.
  - **ExcelJS:** Generates complex, multi-sheet Excel reports directly in the browser.

### Backend (Firebase)
- **Firestore:** NoSQL database storing checks, flags, batches, notifications, and user profiles.
- **Firebase Auth:** Secure user authentication (Email/Password).
- **Firebase Storage:** Stores physical check images securely.
- **Firebase Cloud Functions:** 
  - **extractCheckInfo:** A callable function that sends base64 check images to the **Gemini 2.5 Flash API** for structured data extraction.
  - **Triggers:** Automatically generates notifications when checks are created, updated, or batched.

---

## 3. Visual Identity & Design Aesthetics

CheckMate is designed with a **premium, utility-first aesthetic**:
- **Aesthetics:** Uses a "Modern Ledger" look—sleek gradients, subtle shadows, and a clean typography (Inter/Roboto).
- **Dark Mode:** Fully responsive dark/light themes that switch seamlessly based on user preference or system settings.
- **Customization:** Users can choose between multiple **Card Styles**:
  - **Classic:** Block layout focused on text fields.
  - **Ledger:** Monospaced, list-based layout for a high-density, professional feel.
  - **Modern:** Visual-heavy cards with image previews and glassmorphic gradients.
- **Theming:** Each Kanban column and the Archive can be individually themed with curated color sets (Sky blue, Emerald green, Amber, etc.).

---

## 4. Screen-by-Screen Breakdown

### 1. Kanban Dashboard (`/`)
- **Purpose:** The primary operational workspace where team members manage the lifecycle of checks.
- **Aesthetics:** Four distinct columns (`Received`, `Confirming Details`, `Queued`, `Complete`) with drag-and-drop functionality. Each column features a header with status indicators, check counts, and running totals.
- **Interactions:** Cards can be dragged between columns, sorted, and multi-selected for bulk actions.

### 2. Stakeholder Dashboard (Alternative Index)
- **Purpose:** High-level analytics view for Managers, Executives, and Admins.
- **Aesthetics:** A dashboard of "Corporate Insights" featuring:
  - **KPI Cards:** Total Processing, Completed, Pending, and Avg Processing Time.
  - **Charts:** Aging Reports (Doughnut) and 6-Month Volume Trends (Line Chart).
  - **Resource Explorer:** A nested list allowing users to drill down from Regions to Branches to individual checks.

### 3. Add Check Wizard (`/add-check`)
- **Purpose:** A structured, multi-step process for ingesting new checks.
- **Steps:**
  1. **Category:** Choose the check type (Homeowner, Commercial, etc.).
  2. **Upload:** Capture via camera or upload file (supports single or multi-upload).
  3. **Crop (Preview):** Automated OpenCV cropping allows fine-tuning of the image area.
  4. **Details:** AI-powered extraction fills the form automatically; users verify and save.

### 4. Check Detail Modal (`/check/:id`)
- **Purpose:** The "Single Source of Truth" for an individual check.
- **Aesthetics:** Large side-by-side view with the check image on one side and a comprehensive form on the other. 
- **Features:**
  - **Audit Trail:** A complete history of every change made to the check.
  - **Collaboration:** Add comments and mention team members.
  - **Flagging:** Apply status flags (e.g., "Urgent", "Missing Signature").
  - **Data Management:** Full editing of extracted fields and category-specific inputs.

### 5. Archive View (`/archive`)
- **Purpose:** A searchable, filterable repository of checks that have reached the 'Archived' status (auto-archived after 10 days in Complete).
- **Aesthetics:** A high-density data table with customizable columns, row-level themes, and multi-select capabilities.

### 6. Batch History (`/batch-history`)
- **Purpose:** Tracks groups of checks that were processed together (e.g., for bank deposit or mailing).
- **Aesthetics:** A timeline or list of batches, showing tracking numbers, totals, and who processed the batch. Users can click into a batch to see all associated checks.

### 7. Preferences & Theme Picker
- **Purpose:** Personalization interface for users.
- **Aesthetics:** Clean modals with toggles for Dark Mode, Card Style selection, and Column Display options. The Theme Picker provides a visual grid of color schemes for workspace columns.

### 8. Admin Panel (`/admin`)
- **Purpose:** Organization and user management.
- **Aesthetics:** Management interface for viewing all users, modifying roles (Stakeholder, Manager, Admin, etc.), and managing organizational data like Regions and Branches.
