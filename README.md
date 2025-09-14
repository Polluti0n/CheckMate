
# Project Handover: CheckMate Application

Welcome to the team. This document outlines the architecture, functionality, and deployment process of the CheckMate application. This is your comprehensive guide to getting the project running in your own development and production environments.

## 1. What is this App? (Project Overview)

CheckMate is a web-based, single-page application designed to digitize and streamline the process of managing physical payment checks for an accounting or administrative department. It replaces a manual, paper-based workflow with a modern, interactive digital experience backed by a powerful and scalable Firebase backend.

**The core problem it solves:** Manually tracking, verifying, batching, and archiving hundreds of checks is slow, error-prone, and lacks transparency. CheckMate provides a central, real-time, multi-user hub for this entire lifecycle.

### Key Concepts:
- **Kanban Workflow:** The primary interface is a drag-and-drop Kanban board, where checks move through distinct stages (`Received`, `Confirming Details`, `Queued`, `Complete`).
- **Secure AI Data Extraction:** Users can upload a check image via their device camera or file system. The image is uploaded to Firebase Storage, and a secure, backend **Cloud Function** calls the **Gemini API** to extract details. This server-side approach ensures the Gemini API key is never exposed to the client.
- **Real-Time & Collaborative:** All data is stored in **Firestore**, and the app uses real-time listeners. Any change made by one user is instantly reflected on the screens of all other active users.
- **Batch Processing & Export:** The application facilitates grouping processed checks into batches. It uses **ExcelJS** to programmatically generate a complex, multi-sheet Excel tracking log entirely in the browser.
- **Automated Archiving:** Completed checks are automatically moved to a searchable, sortable archive after 10 days, keeping the main dashboard clean.
- **User Customization:** Users can customize Kanban card layouts, column themes, and archive table layouts. Preferences are saved to their browser's `localStorage`.
- **Authentication:** The application is secured with **Firebase Authentication**, requiring users to sign in to access the dashboard.

---

## 2. Software Stack & Architecture

This is a modern React application with a "serverless" backend powered by Firebase services.

- **Framework:** **React 19** with TypeScript.
- **Build Tool:** **Vite**.
- **Styling:** **Tailwind CSS**.
- **Backend & Database:** **Firebase**
    - **Firestore:** NoSQL database for all application data (checks, flags, batches).
    - **Firebase Authentication:** For user sign-in and security.
    - **Firebase Storage:** For storing uploaded check images.
    - **Firebase Functions:** For secure, server-side execution of the Gemini API call.
- **Core Libraries:**
    - **`@google/genai`**: Used within the Firebase Function to call the Gemini API.
    - **`@atlaskit/pragmatic-drag-and-drop`**: For all high-performance drag-and-drop functionality.
    - **`exceljs`**: For client-side generation of `.xlsx` batch logs.

---

## 3. Setup and Deployment Guide

Follow these steps carefully to get your own instance of CheckMate up and running.

### Prerequisites

1.  **Node.js:** Ensure you have Node.js (version 18 or higher) installed.
2.  **Firebase Account:** You need a Google account and a Firebase project.
3.  **Firebase CLI:** Install the Firebase command-line tools globally:
    ```bash
    npm install -g firebase-tools
    ```
    Then, log in to Firebase:
    ```bash
    firebase login
    ```

### Step 1: Firebase Project Setup

1.  **Create a Firebase Project:** Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2.  **Enable Services:**
    - In the "Build" section of your new project, enable **Authentication**, **Firestore**, **Storage**, and **Functions**.
    - For **Authentication**, enable the "Email/Password" sign-in method.
    - For **Firestore**, create a database. Start in **test mode** for easy setup (you can add security rules later).
3.  **Upgrade to Blaze Plan:** Firebase Functions and the Gemini API require your project to be on the "Blaze (Pay as you go)" plan. There is a generous free tier, so you are unlikely to incur costs for development.
4.  **Register a Web App:**
    - In your Project Settings, go to the "General" tab.
    - Click the web icon (`</>`) to "Add app".
    - Give it a nickname (e.g., "CheckMate Web") and register the app.
    - **Crucially, copy the `firebaseConfig` object.** It will look like this:
      ```javascript
      const firebaseConfig = {
        apiKey: "AIza...",
        authDomain: "your-project-id.firebaseapp.com",
        // ... and so on
      };
      ```

### Step 2: Configure the Local Project

1.  **Clone the Repository:** Get the project code onto your local machine.
2.  **Install Dependencies:** Navigate into the project root and run:
    ```bash
    npm install
    ```
    Then navigate into the functions directory and do the same:
    ```bash
    cd functions
    npm install
    cd ..
    ```
3.  **Add Your Firebase Config:**
    - Open the file `src/services/firebase.ts`.
    - You will see a placeholder `firebaseConfig` object. **Paste your own configuration object** that you copied from the Firebase console.
4.  **Set Project ID:**
    - Open the `.firebaserc` file in the project root.
    - Replace `"YOUR_PROJECT_ID_HERE"` with your actual Firebase Project ID.

### Step 3: Configure and Deploy the Backend Function

The app uses a secure Firebase Secret to store the Gemini API key. This ensures the key is never exposed in code or to the client.

1.  **Get a Gemini API Key:** Go to [Google AI Studio](https://aistudio.google.com/app/apikey) to generate an API key.
2.  **Set the API Key as a Secret:** In your terminal at the project root, run this command. It will prompt you to enter the secret value (your API key).
    ```bash
    firebase functions:secrets:set GEMINI_KEY
    ```
    When prompted, paste your API key and press Enter. The secret version will default to `1`.
3.  **Deploy the Function:** Now, deploy your backend function to Firebase. The deployment process will bind the `GEMINI_KEY` secret to the function and grant it the necessary permissions automatically.
    ```bash
    firebase deploy --only functions
    ```

### Step 4: Build and Deploy the Frontend

1.  **Build the React App:** In your terminal at the project root, run the build command:
    ```bash
    npm run build
    ```
    This will create a `dist` folder containing the optimized, production-ready version of your app.
2.  **Deploy to Firebase Hosting:** Finally, deploy the frontend:
    ```bash
    firebase deploy --only hosting
    ```

**That's it!** The command will output your live URL. You can now visit the site, create an account, and start using your fully deployed CheckMate application.
