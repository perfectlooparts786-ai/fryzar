import sys
import json

TEMPLATES = {
    "challenge": {
        "title": "Bet You Can't Spot Where This Loop Restarts 🤯",
        "alt_titles": [
            "Can You Find The Exact Loop Seam? (Impossible)",
            "Oddly Satisfying 3D Loop That Never Ends...",
            "Watch Until The Marble Drops (Wait For It)",
            "This 3D Loop Broke My Physics Engine 😳"
        ],
        "screen_hook": "DO NOT BLINK 👁️",
        "pinned_comment": "🔥 Challenge: Kitni dafa dekhne ke baad loop pakra gaya? 1 ya 3 dafa? Sach sach batana 👇",
        "description": """🌀 Watch closely... Can you spot the exact frame where this loop restarts?
Created with precision 3D physics & kinetic motion design.

👇 Drop the exact millisecond you think it resets!

#Shorts #Satisfying #3DAnimation #OddlySatisfying #InfiniteLoopFormation #KineticArt #ASMR #Blender3D #SatisfyingVideo"""
    },
    "asmr": {
        "title": "Most Satisfying 3D Marble Run (Use Headphones 🎧)",
        "alt_titles": [
            "Pure ASMR: 60 Seconds Of Infinite Satisfaction",
            "This Kinetic Loop Will Relax Your Brain Instantly",
            "Liquid Metal Physics Test (Extremely Oddly Satisfying)"
        ],
        "screen_hook": "USE HEADPHONES 🎧",
        "pinned_comment": "🎧 Sound On or Off? Kitna satisfying laga 1 se 10 mein rate karein! 👇",
        "description": """✨ Close your eyes, put on headphones and enjoy pure kinetic visual ASMR.
Zero cut, zero jump — seamless mechanical perfection.

💬 Comment your favorite sound moment below!

#Shorts #Satisfying #ASMR #OddlySatisfying #Relaxing #3DLoop #InfiniteLoopFormation #KineticSculpture"""
    }
}

def generate(topic="Marble Run", category="challenge"):
    cat = TEMPLATES.get(category, TEMPLATES["challenge"])
    return {
        "topic": topic,
        "selected_title": cat["title"],
        "alternative_titles": cat["alt_titles"],
        "video_screen_text_hook": cat["screen_hook"],
        "pinned_comment_strategy": cat["pinned_comment"],
        "viral_description": cat["description"],
        "algorithm_checklist": [
            "Video duration strictly between 7 to 15 seconds (Looping multiplier effect)",
            "Audio seam is masked with continuous white noise / room reverb (no sudden silence cut)",
            "Last frame matches First frame 100% in velocity and color",
            "Upload with 'Related Video' linking to your long-form or top performing short",
            "Post between 6:00 PM and 10:00 PM PKT for US/UK audience reach"
        ]
    }

if __name__ == "__main__":
    t = sys.argv[1] if len(sys.argv) > 1 else "Marble Kinetic Loop"
    c = sys.argv[2] if len(sys.argv) > 2 else "challenge"
    res = generate(t, c)
    print(json.dumps(res, indent=2))
