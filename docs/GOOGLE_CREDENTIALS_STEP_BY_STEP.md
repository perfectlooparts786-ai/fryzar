# 📍 Google Cloud Credentials Kahan Aur Kaise Set Karne Hain (Complete Direct Links)

Yeh sirf ek dafa ka 4-5 minute ka process hai. Niche diye gaye direct links kholte jayein:

---

### 1️⃣ Step 1: Project Banayein Aur YouTube API On Karein
1. Browser mein yeh direct link kholein:  
   👉 [Google Cloud Console - Create Project](https://console.cloud.google.com/projectcreate)
2. **Project Name** mein likhein: `YouTube Automation` aur **Create** par click karein.
3. Ab yeh direct link kholein:  
   👉 [YouTube Data API v3 Page](https://console.cloud.google.com/apis/library/youtube.googleapis.com)
4. Blue button **"ENABLE"** par click karein.

---

### 2️⃣ Step 2: OAuth Consent Screen Setup
1. Yeh direct link kholein:  
   👉 [OAuth Consent Screen](https://console.cloud.google.com/apis/credentials/consent)
2. **User Type:** **External** choose karein aur **Create** dabayein.
3. **App name:** `AutoUploader` likhein.
4. **User support email** aur **Developer contact information** mein apna Gmail address likhein.
5. Save & Continue karte hue aage jayein.
6. **Test Users** screen par aakar **"ADD USERS"** click karein aur apna YouTube wala Gmail address daal kar Save karein.

---

### 3️⃣ Step 3: Client ID Download Karein
1. Yeh direct link kholein:  
   👉 [Credentials Page](https://console.cloud.google.com/apis/credentials)
2. Upar **"+ CREATE CREDENTIALS"** par click karein aur **OAuth client ID** select karein.
3. **Application type:** **Desktop app** choose karein.
4. **Name:** `AutoPoster` likhein aur **Create** dabayein.
5. Pop-up mein **"DOWNLOAD JSON"** ka button hoga, us par click karein.
6. Download ki hui file ko rename karke `client_secret.json` rakh dein aur isay apne is project folder mein daal dein:  
   📁 `C:\Users\Huzaifah\Links\client_secret.json`

---

### 4️⃣ Step 4: 1-Click Refresh Token Generate Karein
Project terminal mein sirf yeh command enter karein:
```powershell
python scripts/setup_youtube_oauth.py
```
* Browser khud khulay ga. Apna Google account select karke **"Continue / Allow"** karein.
* Terminal par aapko yeh 3 keys print mil jayengi:
  - `YOUTUBE_CLIENT_ID`
  - `YOUTUBE_CLIENT_SECRET`
  - `YOUTUBE_REFRESH_TOKEN`

---

### 5️⃣ Step 5: GitHub Secrets Mein Add Karein
1. Apne GitHub repository ki settings ka yeh link kholein:  
   👉 [GitHub Actions Secrets](https://github.com/perfectlooparts786-ai/FRYZAR/settings/secrets/actions)
2. **"New repository secret"** dabayein aur teeno keys add kar dein:
   - Name: `YOUTUBE_CLIENT_ID` | Value: `...`
   - Name: `YOUTUBE_CLIENT_SECRET` | Value: `...`
   - Name: `YOUTUBE_REFRESH_TOKEN` | Value: `...`

Bas kaam khatam! Iske baad videos khud banegi, khud optimize hongi, aur khud din mein 4 dafa upload hongi!
