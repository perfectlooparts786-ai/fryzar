import sys
import json

def generate_video_seo(topic):
    title_suggestions = [
        f"I Built {topic} in 24 Hours — Here's What Happened",
        f"Stop Doing {topic} The Wrong Way (Do This Instead)",
        f"The Ultimate {topic} Masterclass (2026 Edition)",
        f"How I Scaled {topic} for $0"
    ]

    tags = [
        topic,
        f"{topic} tutorial",
        f"{topic} 2026",
        "INFINITE LOOP FORMATION",
        "youtube growth",
        "coding",
        "tech insights",
        "viral content strategy"
    ]

    description_template = f"""🚀 In this video, we break down {topic} step-by-step.

📌 Timestamps:
0:00 - Introduction & Key Results
1:30 - Core Strategy for {topic}
4:15 - Implementation & Live Demo
7:00 - Pro Tips & Next Steps

💬 Question of the Day: What is your main challenge with {topic}? Let us know in the comments below!

#INFINITELOOPFORMATION #{topic.replace(' ', '')} #Tech #Developer #ContentStrategy
"""

    return {
        "topic": topic,
        "recommended_titles": title_suggestions,
        "recommended_tags": tags,
        "description_template": description_template
    }

if __name__ == "__main__":
    topic_input = sys.argv[1] if len(sys.argv) > 1 else "YouTube Growth"
    seo_data = generate_video_seo(topic_input)
    print(json.dumps(seo_data, indent=2))
