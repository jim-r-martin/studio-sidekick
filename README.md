# Studio Sidekick - Weekly Report Generator

A Node.js application that automatically generates weekly work summaries by fetching activity from GitHub (PRs and commits) and Jira, then sends a formatted report to Slack.

## Features

- Fetches merged pull requests and commits from multiple GitHub repositories
- Retrieves completed Jira tickets from the past week
- Generates AI-powered summaries using OpenAI GPT-4
- Sends formatted reports to Slack via webhook
- Supports automated scheduling via GitHub Actions

## Setup

### 1. Clone and Install Dependencies

```bash
git clone <your-repo-url>
cd studio-sidekick
npm install
```

### 2. Configure Environment Variables

Copy the example environment file and fill in your credentials:

```bash
cp .example.env .env
```

Edit `.env` with your actual values:

- **OpenAI API Key**: Get from [OpenAI Platform](https://platform.openai.com/api-keys)
- **GitHub PAT**: Create at [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
- **Jira API Token**: Generate at [Atlassian Account Settings > Security > API tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
- **Slack Webhook**: Set up at [Slack API > Incoming Webhooks](https://api.slack.com/messaging/webhooks)

### 3. GitHub Configuration

Set your repositories in the `GH_REPOS` environment variable:
```
GH_REPOS=callinofficial/studio-web,owner2/repo2,owner3/repo3
```

## Manual Usage

Run the report generator manually:

```bash
node report-generator.js
```

## Automated Scheduling with GitHub Actions

### 1. Set Repository Secrets

Add the following secrets to your GitHub repository at `Settings > Secrets and variables > Actions`:

- `OPENAI_API_KEY`
- `GH_USERNAME`
- `GH_PAT`
- `GH_REPOS`
- `JIRA_EMAIL`
- `JIRA_API_TOKEN`
- `JIRA_BASE_URL`
- `SLACK_WEBHOOK_URL`

### 2. Create GitHub Actions Workflow

Create `.github/workflows/weekly-report.yml`:

```yaml
name: Weekly Report Generator

on:
  schedule:
    # Run every Friday at 9:00 AM UTC (adjust timezone as needed)
    - cron: '0 9 * * 5'
  workflow_dispatch: # Allows manual triggering

jobs:
  generate-report:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout repository
      uses: actions/checkout@v4
      
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install dependencies
      run: npm install
      
    - name: Generate and send report
      env:
        OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        GH_USERNAME: ${{ secrets.GH_USERNAME }}
        GH_PAT: ${{ secrets.GH_PAT }}
        GH_REPOS: ${{ secrets.GH_REPOS }}
        JIRA_EMAIL: ${{ secrets.JIRA_EMAIL }}
        JIRA_API_TOKEN: ${{ secrets.JIRA_API_TOKEN }}
        JIRA_BASE_URL: ${{ secrets.JIRA_BASE_URL }}
        SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
      run: node report-generator.js
```

### 3. Customize Timing

The cron expression `0 9 * * 5` runs every Friday at 9:00 AM UTC. Adjust as needed:

- `0 14 * * 5` - Friday 2:00 PM UTC (9:00 AM EST)
- `0 16 * * 5` - Friday 4:00 PM UTC (9:00 AM PST)

Use [Crontab Guru](https://crontab.guru/) to help create custom schedules.

## Permissions Required

### GitHub Personal Access Token

Your GitHub PAT needs the following scopes:
- `repo` (for private repositories)
- `public_repo` (for public repositories)

### Jira API Token

Ensure your Jira user has permission to:
- View issues assigned to you
- Access the projects you want to report on

## Troubleshooting

### Common Issues

1. **GitHub API Rate Limits**: The free tier allows 5,000 requests per hour. Multiple repositories may increase usage.

2. **Jira Connection Issues**: Verify your `JIRA_BASE_URL` format (should include `https://` and domain only).

3. **Empty Reports**: Check that:
   - Your GitHub username matches exactly
   - Repository names are in `owner/repo` format
   - Date ranges capture your recent activity

### Testing

#### Local Testing

Test individual components:

```bash
# Test with console output instead of Slack
# Temporarily comment out the sendToSlack call in report-generator.js
node report-generator.js
```

#### GitHub Actions Testing

To test the GitHub Action without waiting for the Friday cron schedule:

1. **Manual Trigger via GitHub UI**:
   - Go to your repository on GitHub
   - Navigate to the "Actions" tab
   - Select "Weekly Report Generator" workflow
   - Click "Run workflow" button (only available because we included `workflow_dispatch` in the workflow)
   - Click the green "Run workflow" button to trigger immediately

2. **Manual Trigger via GitHub CLI**:
   ```bash
   # Install GitHub CLI if not already installed
   gh workflow run "Weekly Report Generator"
   
   # Or trigger by filename
   gh workflow run weekly-report.yml
   ```

3. **Monitor the Action**:
   - Check the "Actions" tab to see the workflow run
   - Click on the run to view logs and debug any issues
   - Verify the Slack message was sent successfully

The `workflow_dispatch` trigger in the workflow allows manual execution for testing purposes.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
