#!/usr/bin/env node

require("dotenv").config();
const { Command } = require("commander");
const GitHubAPI = require("../src/api");
const { printFullReport, printHeader } = require("../src/formatter");

const program = new Command();

program
  .name("repo-health")
  .description("Analyze GitHub repository health metrics")
  .version("1.0.0")
  .argument("[repository]", "GitHub repository (owner/repo format)")
  .option("-t, --token <token>", "GitHub personal access token")
  .option("-j, --json", "Output as JSON")
  .action(async (repository, options) => {
    const token = options.token || process.env.GITHUB_TOKEN;

    if (!repository) {
      printHeader();
      console.log("  Usage: repo-health <owner/repo>");
      console.log();
      console.log("  Examples:");
      console.log("    repo-health facebook/react");
      console.log("    repo-health microsoft/vscode");
      console.log("    repo-health vercel/next.js");
      console.log();
      console.log("  Options:");
      console.log("    -t, --token <token>   GitHub personal access token");
      console.log("    -j, --json            Output as JSON");
      console.log("    -h, --help           Display help");
      console.log();
      console.log("  Environment:");
      console.log("    GITHUB_TOKEN   GitHub personal access token (alternative to -t)");
      console.log();
      if (!token) {
        console.log(
          "  Note: Set GITHUB_TOKEN for higher rate limits (5000 req/hr vs 60 req/hr)"
        );
      }
      process.exit(0);
    }

    const parts = repository.split("/");
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      console.error("Error: Repository must be in owner/repo format");
      console.error("Example: repo-health facebook/react");
      process.exit(1);
    }

    const [owner, repo] = parts;

    try {
      const api = new GitHubAPI(token);

      if (!token) {
        console.log(
          "Note: No GitHub token provided. Using unauthenticated requests (60 req/hr limit)\n"
        );
      }

      const data = await api.getHealthScore(owner, repo);

      if (options.json) {
        console.log(JSON.stringify(data, null, 2));
      } else {
        printFullReport(data);
      }
    } catch (error) {
      if (error.status === 404) {
        console.error(`Error: Repository "${owner}/${repo}" not found`);
        console.error("Make sure the repository exists and is spelled correctly");
      } else if (error.status === 403) {
        console.error("Error: Rate limit exceeded");
        console.error(
          "Set a GitHub token: export GITHUB_TOKEN=your_token_here"
        );
      } else {
        console.error("Error:", error.message);
      }
      process.exit(1);
    }
  });

program.parse();
