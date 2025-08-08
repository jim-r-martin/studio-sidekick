require("dotenv").config();
const OpenAI = require("openai");
const axios = require("axios");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function getGitHubActivity() {
  // Fetch last 7 days of PRs and commits from GitHub
  const sinceDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0]; // YYYY-MM-DD

  // Support multiple repositories from environment variable
  const repos = process.env.GH_REPOS 
    ? process.env.GH_REPOS.split(',').map(repo => repo.trim())
    : ['callinofficial/studio-web']; // Default fallback

  const headers = {
    Authorization: `token ${process.env.GH_PAT}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "axios",
  };

  const activities = [];

  // Fetch PRs
  const repoQuery = repos.map(repo => `repo:${repo}`).join('+');
  const prUrl = `https://api.github.com/search/issues?q=is:pr+${repoQuery}+author:${process.env.GH_USERNAME}+is:merged+merged:>${sinceDate}`;
  
  const prRes = await axios.get(prUrl, { headers });
  activities.push(...prRes.data.items.map((pr) => `PR: ${pr.title}`));

  // Fetch commits for each repository
  for (const repo of repos) {
    const commitsUrl = `https://api.github.com/repos/${repo}/commits?author=${process.env.GH_USERNAME}&since=${sinceDate}T00:00:00Z`;
    
    try {
      const commitsRes = await axios.get(commitsUrl, { headers });
      activities.push(...commitsRes.data.map((commit) => `Commit: ${commit.commit.message.split('\n')[0]}`));
    } catch (error) {
      // Skip repos that might not be accessible or don't exist
      console.warn(`Could not fetch commits for ${repo}: ${error.message}`);
    }
  }

  return activities;
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
