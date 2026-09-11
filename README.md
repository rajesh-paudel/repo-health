# repo-health

A CLI tool that analyzes GitHub repository health metrics and provides actionable insights.

## Features

- **Health Score** - Composite score (0-100) based on repository activity
- **Issue Analysis** - Open issues, stale issues, PR backlog
- **PR Metrics** - Merge time, open PRs, oldest pending PR
- **Contributor Stats** - Bus factor analysis, top contributors
- **Activity Tracking** - Last commit, recent releases
- **JSON Output** - Machine-readable format for CI/CD integration

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/repo-health.git
cd repo-health

# Install dependencies
npm install

# Link globally (optional)
npm link
```

## Usage

```bash
# Basic usage
repo-health facebook/react

# With GitHub token (recommended for higher rate limits)
repo-health microsoft/vscode -t ghp_your_token_here

# Or set environment variable
export GITHUB_TOKEN=ghp_your_token_here
repo-health vercel/next.js

# JSON output
repo-health facebook/react --json
```

## GitHub Token

Without a token, you're limited to 60 requests/hour. With a token, you get 5,000 requests/hour.

1. Go to https://github.com/settings/tokens
2. Generate a new token (classic)
3. Select the `repo` scope
4. Copy the token

## Health Score Calculation

The health score is based on:

| Factor | Impact |
|--------|--------|
| Stale issues (>30 days) | -5 to -15 points |
| PR merge time | -5 to -15 points |
| Contributor count (bus factor) | -5 to -20 points |
| Last commit freshness | -10 to -20 points |
| Open PR backlog | -10 points |
| Archived repository | Auto 0 |

## Development

```bash
# Run directly
node bin/cli.js facebook/react

# Run tests
npm test
```

## License

MIT
