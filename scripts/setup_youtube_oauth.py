import os
import json
from google_auth_oauthlib.flow import InstalledAppFlow

"""
One-Click Helper to generate YOUTUBE_REFRESH_TOKEN:
1. Put client_secret.json (downloaded from Google Cloud Console) in project root.
2. Run: python scripts/setup_youtube_oauth.py
3. It will open your browser for one-click approval and print your exact GitHub Secrets!
"""

SCOPES = [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube.force-ssl"
]

def main():
    secret_file = "client_secret.json"
    if not os.path.exists(secret_file):
        print(f"❌ '{secret_file}' nahi mila!")
        print("Google Cloud Console se OAuth 2.0 Client credentials download kar ke 'client_secret.json' ke naam se yahan rakh dein.")
        return

    flow = InstalledAppFlow.from_client_secrets_file(secret_file, SCOPES)
    credentials = flow.run_local_server(port=8080)

    print("\n" + "="*50)
    print("✅ MUBARAK HO! Aapka Google Authorization kamiyab ho gaya!")
    print("="*50)
    print("\n👉 Niche di gayi values apne GitHub Secrets mein daal dein:\n")
    print(f"YOUTUBE_CLIENT_ID: {credentials.client_id}")
    print(f"YOUTUBE_CLIENT_SECRET: {credentials.client_secret}")
    print(f"YOUTUBE_REFRESH_TOKEN: {credentials.refresh_token}")
    print("\n" + "="*50)

if __name__ == "__main__":
    main()
