# Atomic Habits AI - Habit Tracker & Personal Library

Atomic Habits AI is a cross-platform mobile and web application designed to help users build lasting habits through a science-backed tracking system and a personalized AI-powered library. It combines local-first performance with cloud synchronization and AI insights.

---

## 🏗 Architecture

The application follows a **Local-First, Cloud-Sync** architecture.

### Frontend
- **Framework:** [Expo](https://expo.dev/) (React Native) with [Expo Router](https://docs.expo.dev/router/introduction/) for file-based routing.
- **Language:** TypeScript.
- **State Management:** Local SQLite database for offline-first capabilities, synced with Supabase.
- **UI/UX:** Custom design system built with `Vanilla CSS` (via React Native Stylesheets), utilizing `Lucide React Native` for iconography and `Reanimated` for smooth transitions.

### Backend & Cloud
- **Platform:** [Supabase](https://supabase.com/)
- **Authentication:** Supabase Auth (Email/Password, JWT).
- **Database:** PostgreSQL (Cloud) + SQLite (Local).
- **Storage:** Supabase Storage for PDF/Epub books.
- **Edge Functions:** Supabase Edge Functions (Deno) for AI processing and book parsing.

### AI Integration
- **Models:** Gemini (via Supabase Edge Functions).
- **Features:** Automated book metadata extraction, AI-generated reading insights/synthesis, and interactive habit coaching.

---

## 🔐 Security

Security is integrated at every layer of the stack:

1.  **Authentication:** Secure session management using `AsyncStorage` and Supabase JWTs.
2.  **Row Level Security (RLS):** Supabase RLS policies ensure users can only access their own habits, books, and logs.
3.  **Secure Storage:** sensitive files are accessed via **Signed URLs** with limited expiration windows (1 hour) rather than public links.
4.  **Local Encryption:** (Optional/Roadmap) Local SQLite data protection.
5.  **Environment Variables:** All sensitive keys (Supabase URL, Anon Key) are managed via `.env` files and `EXPO_PUBLIC_` prefixes.

---

## 🗄 Database Schema

The system uses a mirrored schema between local SQLite and cloud PostgreSQL.

### Core Tables:
-   **`books`**: Stores library items (`id`, `user_id`, `title`, `author`, `file_uri`, `current_page`, `status`).
-   **`habits`**: Core habit tracking logic (`id`, `user_id`, `name`, `frequency`, `streak`, `last_completed`).
-   **`reading_logs`**: Tracks progress over time (`id`, `book_id`, `duration_seconds`, `pages_read`).
-   **`chat_history`**: Persists AI interactions for context-aware coaching.

---

## 🛠 Running the Project

### Prerequisites
- Node.js (v18+)
- Expo Go app (for physical device testing) or Android Studio / Xcode (for emulators).

### Installation
```bash
# Clone the repository
git clone <repo-url>
cd atomichabitsai

# Install dependencies
npm install
```

### Development
```bash
# Start the Expo development server
npx expo start
```

-   Press **`a`** for Android emulator.
-   Press **`i`** for iOS simulator.
-   Press **`w`** for web.

---

## 🐞 Debugging Details

### Logging
The application uses structured logs for critical paths:
-   **`[PdfReader]`**: WebView lifecycle and file writing logs.
-   **`[downloadBook]`**: Sync and storage fetch status.
-   **`[resolveFileUri]`**: Path resolution debugging for iOS container changes.

### Common Troubleshooting
1.  **Stale iOS Paths:** If files don't open on iOS after an update, the `resolveFileUri` utility automatically corrects absolute paths that contain outdated container UUIDs.
2.  **Sync Failures:** Check the `performMutation` calls in `sync.ts`. Ensure the device has internet access for Supabase connectivity.
3.  **PDF Reader Crashes:** Ensure the library `@bildau/rn-pdf-reader` is correctly patched via `patch-package` to handle the Legacy FileSystem API in Expo 54.

---

## 🧑‍💻 Backend Developer Notes

### Edge Functions
Located in `/supabase/functions/`:
-   **`process-book-ai`**: Parses uploaded filenames to suggest titles/authors and generates reading summaries.
-   **`chat-ai`**: The core engine for the AI habit coach.

### Storage
-   Bucket name: `books`
-   Access: Private (accessed via `createSignedUrl` in `src/lib/file-utils.ts`).
