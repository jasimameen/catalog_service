const GROUP_RULES: { group: string; keywords: string[] }[] = [
  { group: "Mops & Buckets", keywords: ["mop", "bucket"] },
  { group: "Brooms", keywords: ["broom"] },
  { group: "Dustpans", keywords: ["dustpan"] },
  { group: "Brushes", keywords: ["brush", "plunger", "scrubber"] },
  { group: "Scourers & Sponges", keywords: ["scourer", "scouring", "sponge"] },
  { group: "Cloths & Dusters", keywords: ["cloth", "duster", "towel", "glove"] },
  { group: "Squeegees", keywords: ["squeegee"] },
];

export function groupForCategory(category: string): string {
  const lower = category.toLowerCase();
  for (const rule of GROUP_RULES) {
    if (rule.keywords.some((k) => lower.includes(k))) return rule.group;
  }
  return "Other";
}

export const GROUP_ORDER = [
  "Mops & Buckets",
  "Brooms",
  "Dustpans",
  "Brushes",
  "Scourers & Sponges",
  "Cloths & Dusters",
  "Squeegees",
  "Other",
];
