import os
import sys
import json
import glob
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from generate_viral_package import generate

"""
100% Free & Automated Multi-Post YouTube Viral Engine
- Uses GitHub Actions Free Compute (2,000 mins/month)
- Uses YouTube Data API v3 Free Tier (10,000 units/day)
- Automatically picks videos from 'content/videos/' queue
- Injects viral psychological title, description, tags & pinned comment
"""

SCOPES = [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube.force-ssl"
]

def get_authenticated_service():
    client_id = os.environ.get("YOUTUBE_CLIENT_ID")
    client_secret = os.environ.get("YOUTUBE_CLIENT_SECRET")
    refresh_token = os.environ.get("YOUTUBE_REFRESH_TOKEN")

    if not all([client_id, client_secret, refresh_token]):
        print("[DEMO/DRY-RUN MODE] API secrets not set in environment. Generating preview payload.")
        return None

    credentials = Credentials(
        None,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=client_id,
        client_secret=client_secret,
        scopes=SCOPES
    )
    return build("youtube", "v3", credentials=credentials)

def pick_next_video():
    video_files = sorted(glob.glob("content/videos/*.mp4"))
    if not video_files:
        return None
    return video_files[0]

def upload_and_pin_comment():
    video_path = pick_next_video()
    topic = "Satisfying 3D Physics Loop"

    if video_path:
        base_name = os.path.basename(video_path).replace(".mp4", "").replace("_", " ").title()
        topic = base_name

    meta = generate(topic, category="challenge")
    service = get_authenticated_service()

    if not service or not video_path:
        print("Dry run completed successfully. Viral payload ready:")
        print(json.dumps(meta, indent=2))
        return

    # 1. Upload Video
    body = {
        "snippet": {
            "title": meta["selected_title"],
            "description": meta["viral_description"],
            "tags": [
                "Shorts", "Satisfying", "3DAnimation", "OddlySatisfying",
                "InfiniteLoopFormation", "KineticArt", "ASMR", "Blender3D"
            ],
            "categoryId": "28"
        },
        "status": {
            "privacyStatus": "public",
            "selfDeclaredMadeForKids": False
        }
    }

    media = MediaFileUpload(video_path, chunksize=-1, resumable=True)
    request = service.videos().insert(part="snippet,status", body=body, media_body=media)
    response = request.execute()
    video_id = response.get("id")
    print(f"✅ Video successfully uploaded! Video ID: {video_id}")

    # 2. Automatically Post & Pin Engagement Comment
    try:
        comment_body = {
            "snippet": {
                "videoId": video_id,
                "topLevelComment": {
                    "snippet": {
                        "textOriginal": meta["pinned_comment_strategy"]
                    }
                }
            }
        }
        comment_res = service.commentThreads().insert(part="snippet", body=comment_body).execute()
        comment_id = comment_res.get("id")
        print(f"✅ Engagement Comment Posted (ID: {comment_id})")
    except Exception as e:
        print(f"Warning: Comment posting skipped or failed: {e}")

    # 3. Move uploaded video to published folder so it doesn't repeat
    os.makedirs("content/published", exist_ok=True)
    dest_path = os.path.join("content/published", os.path.basename(video_path))
    os.rename(video_path, dest_path)
    print(f"✅ Video moved to {dest_path}")

if __name__ == "__main__":
    upload_and_pin_comment()
