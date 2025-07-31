require("dotenv").config();
const OpenAI = require("openai");
const axios = require("axios");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function getGitHubActivity() {
  // Example: fetch last 7 days of PRs from GitHub
  const sinceDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0]; // YYYY-MM-DD

  const url = `https://api.github.com/search/issues?q=is:pr+repo:callinofficial/studio-web+author:${process.env.GH_USERNAME}+is:merged+merged:>${sinceDate}`;

  const headers = {
    Authorization: `token ${process.env.GH_PAT}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "axios",
  };

  const res = await axios.get(url, { headers });
  return res.data.items.map((pr) => `PR: ${pr.title}`);
}

async function getJiraActivity() {
  const auth = Buffer.from(
    `${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`
  ).toString("base64");
  const jql = encodeURIComponent(
    `assignee = currentUser() AND status = Done AND updated >= -7d`
  );
  const url = `${process.env.JIRA_BASE_URL}/rest/api/3/search?jql=${jql}`;

  const res = await axios.get(url, {
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
    },
  });

  return res.data.issues.map((issue) => `Jira: ${issue.fields.summary}`);
}

async function generateReport(lines) {
  const prompt = `
You are an AI assistant that summarizes a developer’s weekly accomplishments.

Below is a list of work items from GitHub and Jira for the past week:

${lines.join("\n")}

Write a Markdown-formatted list of the 3 most impactful accomplishments.

Each bullet should be a single sentence that is:
- Clear and concise
- Easy to understand by non-technical readers
- Focused on outcomes or impact

**Instructions:**
- Group similar work items together into one bullet if they share a theme (e.g. multiple updates to a chat feature, or multiple copy tweaks).
- Prioritize meaningful work over minor changes.
- If referencing Jira items, use the ticket *titles*, not the ticket numbers.
- Avoid duplication or overly technical language.
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
  });
  return response.choices[0].message.content;
}

async function sendToSlack(message) {
  await axios.post(process.env.SLACK_WEBHOOK_URL, {
    text: `🤖 *Weekly Work Summary*:\n${message}`,
  });
}

(async () => {
  const gh = await getGitHubActivity();
  const jira = await getJiraActivity();
  const summary = await generateReport([...gh, ...jira]);
  await sendToSlack(summary);
})();
