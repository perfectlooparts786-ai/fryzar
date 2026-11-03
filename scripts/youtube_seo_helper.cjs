const topic = process.argv[2] || "YouTube Growth";

const titleSuggestions = [
  `I Built ${topic} in 24 Hours — Here's What Happened`,
  `Stop Doing ${topic} The Wrong Way (Do This Instead)`,
  `The Ultimate ${topic} Masterclass (2026 Edition)`,
  `How I Scaled ${topic} for $0`
];

const tags = [
  topic,
  `${topic} tutorial`,
  `${topic} 2026`,
  "INFINITE LOOP FORMATION",
  "youtube growth",
  "tech insights",
  "viral strategy"
];

const descriptionTemplate = `🚀 In this video, we break down ${topic} step-by-step.

📌 Timestamps:
0:00 - Introduction & Key Results
1:30 - Core Strategy for ${topic}
4:15 - Implementation & Live Demo
7:00 - Pro Tips & Next Steps

💬 Question of the Day: What is your main challenge with ${topic}? Let us know in the comments below!

#INFINITELOOPFORMATION #${topic.replace(/\s+/g, '')} #Tech #Developer #ContentStrategy
`;

console.log("=== INFINITE LOOP FORMATION — YOUTUBE SEO GENERATOR ===");
console.log("\n📌 Recommended Titles:");
titleSuggestions.forEach((t, i) => console.log(`  ${i + 1}. ${t}`));
console.log("\n🏷️ Tags:");
console.log(`  ${tags.join(", ")}`);
console.log("\n📝 Description Template:\n");
console.log(descriptionTemplate);
