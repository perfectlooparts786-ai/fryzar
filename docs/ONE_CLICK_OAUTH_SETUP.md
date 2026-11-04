# 🔑 One-Time Google Cloud & YouTube Setup (5 Minutes Guide)

Aapka poora automation system (GitHub Actions multi-poster) tayar ho chuka hai. 
Google ki security policy ke mutabiq YouTube channel ka access sirf channel owner (aap) hi approve kar sakta hai. 

Yeh 3 aasan steps karein, baqi sab automated ho jayega:

---

### Step 1: Google Cloud Console par YouTube API Enable Karein (2 Minutes)
1. Browser mein yeh link kholein: [Google Cloud Console](https://console.cloud.google.com/)
2. Naya project banayein: `YouTube Automation`
3. **APIs & Services > Library** mein ja kar search karein: **"YouTube Data API v3"** aur **Enable** par click karein.
4. **OAuth Consent Screen** par jayein:
   - User Type: **External** select karein.
   - App Name mein `Loop Automation` likh kar Save karein.
   - Test Users mein apna YouTube wala Gmail address add kar dein.

---

### Step 2: OAuth Client ID Download Karein (1 Minute)
1. **APIs & Services > Credentials** mein jayein.
2. Click karein: **Create Credentials > OAuth client ID**
   - Application Type: **Desktop app**
   - Name: `AutoUploader`
3. **Download JSON** par click karein aur us file ko rename kar ke apne project folder mein rakh dein:
   📁 `C:\Users\Huzaifah\Links\client_secret.json`

---

### Step 3: One-Click Secret Generator Run Karein (10 Seconds)
Terminal mein yeh command chalayein:
```powershell
python scripts/setup_youtube_oauth.py
```
* Browser khud khulay ga, apne YouTube Google account se **Allow** karein.
* Terminal par aapko aapki 3 keys nazar aa jayengi:
  - `YOUTUBE_CLIENT_ID`
  - `YOUTUBE_CLIENT_SECRET`
  - `YOUTUBE_REFRESH_TOKEN`

---

### Step 4: GitHub Secrets Mein Paste Kar Dein
1. Apne GitHub Repo par jayein:  
   `https://github.com/perfectlooparts786-ai/FRYZAR/settings/secrets/actions`
2. **New repository secret** par click karein aur yeh teeno daal dein:
   - Name: `YOUTUBE_CLIENT_ID` | Value: `(jo step 3 mein mili)`
   - Name: `YOUTUBE_CLIENT_SECRET` | Value: `(jo step 3 mein mili)`
   - Name: `YOUTUBE_REFRESH_TOKEN` | Value: `(jo step 3 mein mili)`

Bas! Iske baad daily 4 videos automatic high-CTR aur millions views tags ke sath post hoti rahengi.
