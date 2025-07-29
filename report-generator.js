const { Configuration, OpenAIApi } = require("openai");
const axios = require("axios");

const openai = new OpenAIApi(
  new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  })
);

async function getGitHubActivity() {
  // Example: fetch last 7 days of PRs from GitHub
  const headers = { Authorization: `token ${process.env.GH_PAT}` };
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const url = `https://github.com/callinofficial/studio-web/pulls?q=merged:>${since}`;

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
Here is a list of work items from GitHub and Jira for the past week:

${lines.join("\n")}

Summarize my 3 most important work wins in markdown format. Each item should be a one-sentence bullet point.
`;

  const response = await openai.createChatCompletion({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
  });

  return response.data.choices[0].message.content;
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
  console.log(summary);
  // await sendToSlack(summary);
})();
