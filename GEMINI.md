## Project Context: CheckMate

CheckMate is a React 19 (Vite) Single Page Application for digitizing physical check workflows. It utilizes a serverless Firebase architecture (Firestore, Auth, Functions, Storage). The app features real-time collaboration, client-side image processing (OpenCV/Tesseract), and server-side AI data extraction (Gemini 2.5 Flash).

## 1. Tech Stack & Core Libraries

-   **Framework:** React 19, TypeScript, Vite.
    
-   **Styling:** Tailwind CSS (Utility-first, custom color palette in tailwind.config.js).
    
-   **State/DB:** Firebase Firestore (Real-time onSnapshot listeners via src/services/firestoreService.ts).
    
-   **Drag & Drop:**  @atlaskit/pragmatic-drag-and-drop (Performance-focused).
    
-   **Image Processing:**
    
    -   **Client:**  opencv.js (window.cv) for contour detection/cropping.
        
    -   **Client:**  tesseract.js for orientation detection.
        
    -   **Client:** Custom MICR scanner logic (src/utils/MICRScanner.js).
        
-   **AI/ML:** Google Gemini 2.5 Flash (via Firebase Cloud Functions).
    
-   **Export:**  exceljs (Client-side .xlsx generation).
    

## 2. Data Architecture

**Core Entity: Check**  
The Check object is the central data point.

codeTypeScript

```
// Located in src/types.ts
interface Check {
  id: string;
  status: 'Received' | 'Confirming Details' | 'Queued' | 'Complete' | 'Archived';
  category: CheckCategory; // Determines form fields (see src/formConfig.ts)
  
  // Extracted/Entered Data
  payor: string;
  payee: string;
  amount: number;
  date: string; // ISO Date YYYY-MM-DD
  checkNumber: string;
  memo: string;
  payorAddress: { street: string; city: string; state: string; zip: string };
  
  // Conditional Fields (Based on Category)
  associationName?: string;
  clientAccountNumber?: string;
  glCode?: string;
  
  // System Data
  imageUrl?: string;
  auditTrail: AuditLog[];
  comments: Comment[];
  flags: string[]; // Array of Flag IDs
  boardOrder?: number; // For manual sorting in Kanban columns
}
```

**Configuration-Driven Forms**  
Forms in AddCheckWizard and CheckDetailModal are generated dynamically based on src/formConfig.ts. Do not hardcode inputs; refer to formConfig[category].

## 3. Key Architectural Patterns

### A. Data Access Layer (src/services/firestoreService.ts)

-   **Do not call db.collection directly in components.** Use the exported service functions.
    
-   **Real-time:** Data is fetched via onChecksSnapshot, onFlagsSnapshot, etc.
    
-   **Optimistic UI:** The KanbanBoard handles optimistic drag-and-drop updates visually, while the service layer updates Firestore in the background.
    
-   **Audit Logging:** Every mutation (update/add) requires an AuditLog entry appended to the auditTrail array.
    

### B. Image Processing Pipeline

1.  **Ingestion (AddCheckWizard):** User captures image.
    
2.  **Client-side Processing (src/utils/imageProcessor.ts):**
    
    -   OpenCV detects contours to crop the check background.
        
    -   Tesseract detects orientation (rotation).
        
    -   Custom MICR scanner attempts to read routing/account numbers.
        
3.  **AI Extraction (functions/src/index.ts):**
    
    -   The processed, cropped image is uploaded to Firebase Storage.
        
    -   A **Callable Cloud Function** (extractCheckInfo) sends the base64 image to **Gemini 2.5 Flash**.
        
    -   Gemini returns structured JSON conforming to checkDetailsSchema.
        

### C. Drag and Drop (CheckDashboard.tsx)

-   Uses @atlaskit/pragmatic-drag-and-drop.
    
-   **Components:**
    
    -   CheckCard: Uses draggable.
        
    -   KanbanColumn: Uses dropTargetForElements.
        
-   **Logic:**
    
    -   monitorForElements in the parent component orchestrates the state updates.
        
    -   getDestinationIndex calculates the drop position.
        

### D. Notifications

-   **Trigger:** Cloud Functions (onCheckCreate, onCheckUpdate, onBatchCreate) listen to Firestore changes.
    
-   **Logic:** Notifications are written to a /notifications/{id} collection.
    
-   **Frontend:**  NotificationContext listens to this collection and displays Toasts via NotificationStack.
    

## 4. Coding Standards

-   **Imports:** Use named imports. Resolve paths using @/ alias (mapped to ./src).
    
-   **Icons:** Use the custom set in src/components/icons.tsx (Tailwind styled SVGs). Do not import new icon libraries.
    
-   **Types:** Strictly adhere to src/types.ts. No any types unless absolutely necessary for external libraries (like opencv).
    
-   **Tailwind:** Use the extended color palette (e.g., bg-sky-50, text-slate-800) defined in tailwind.config.js.
    

## 5. Folder Structure

-   src/components/board: Kanban logic (CheckDashboard, CardStyles).
    
-   src/components/common: Shared UI (Header, Toast, MainMenu).
    
-   src/hooks: Logic encapsulation (useCheckData, useCheckActions).
    
-   src/services: Firebase wrappers (firebase.ts, firestoreService.ts, geminiService.ts).
    
-   functions: Backend logic (Node.js/TypeScript).
    

## 6. Common Tasks Reference

### A. Adding a New Field to the Check Object

Use this workflow when tracking a new piece of data (e.g., "Invoice Number").

1.  **Define Type:** Add the field to the Check interface in src/types.ts.
    
2.  **Register Field:** Add the field definition to ALL_CHECK_FIELDS in src/constants.ts.
    
    -   Note: If it should be draggable onto the Kanban card, also add it to AVAILABLE_CARD_FIELDS.
        
3.  **UI Input:** Add the field to formConfig in src/formConfig.ts.
    
    -   Add it to common if it applies to all checks.
        
    -   Add it to specific category arrays (e.g., CheckCategory.HOMEOWNER_LOCKBOX) if it is conditional.
        
4.  **AI Extraction (Optional):** If Gemini should extract this field:
    
    -   Update checkDetailsSchema in functions/src/index.ts.
        
    -   Update the prompt text in functions/src/index.ts to specifically ask for this field if it's ambiguous.
        

### B. Modifying the Excel Export Layout

The Excel generation happens entirely client-side using exceljs.

1.  **Locate Logic:** Open src/components/BatchingModal.tsx.
    
2.  **Find Handler:** Look for the handleProcessBatch function.
    
3.  **Edit Structure:**
    
    -   **Headers/Rows:** The specific sheets ('HO LOCKBOX', 'COMM-ARCH', etc.) are mapped in the switch (sheetName) block.
        
    -   **Columns:** Data insertion happens in the dataToInsert array. Ensure the order matches the template columns.
        
    -   **Formatting:** Cell formatting (currency, date) is applied immediately after worksheet.insertRow.
        

### C. Creating a New Check Category

Use this to add a new business vertical (e.g., "Parking Violation").

1.  **Update Enum:** Add the new category key to CheckCategory enum in src/types.ts.
    
2.  **Configure UI:** Update categoryConfig in src/formConfig.ts.
    
    -   Assign an icon, description, and a color theme from tailwind.config.js.
        
3.  **Define Form:** Add a new key to formConfig in src/formConfig.ts defining which inputs appear for this category.
    
4.  **Assign Color:** Map the category to a background color style in CHECK_TYPE_COLORS in src/constants.ts.
    

### D. Customizing Kanban Cards

The project supports "Classic", "Ledger", and "Modern" styles.

1.  **Locate Styles:** Open src/components/CardStyles.tsx.
    
2.  **Edit Components:**
    
    -   ClassicCard: Standard block layout.
        
    -   LedgerCard: Monospace, list-based layout.
        
    -   ModernCard: Image-heavy, gradient backgrounds.
        
3.  **Layout Zones:** The cards use "Zones" (title, topRight, body1, etc.). To change where data appears by default, update DEFAULT_PREFERENCES.cardLayout in src/constants.ts.
    

### E. Adjusting AI Logic & Backend

The backend logic is in a separate build context.

1.  **Modify Code:** Edit functions/src/index.ts.
    
2.  **Test Locally:** Use npm run shell inside the /functions directory to invoke the function with mock data.
    
3.  **Deploy:** Run firebase deploy --only functions.
    
    -   Crucial: If you change the GEMINI_KEY or secrets, use firebase functions:secrets:set.
        

### F. Troubleshooting Image Processing

If users report issues with auto-cropping or MICR reading.

1.  **Contour Detection:** Adjust parameters in scanConfigs within src/utils/imageProcessor.ts.
    
    -   Blur/BlockSize: Tweak these to handle different lighting/shadows.
        
2.  **MICR Logic:** Edit src/utils/MICRScanner.js. This uses a custom pixel-matching algorithm against a reference font image (MICR_REFERENCE).
    
3.  **Orientation:** Tesseract.js handles rotation in standardizeOutputImage (imageProcessor.ts). Check confidence thresholds there.