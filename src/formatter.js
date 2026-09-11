const chalk = require("chalk");

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "k";
  return num.toString();
}

function getScoreColor(score) {
  if (score >= 80) return chalk.green;
  if (score >= 60) return chalk.yellow;
  if (score >= 40) return chalk.orange;
  return chalk.red;
}

function getScoreEmoji(score) {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  return "Needs Attention";
}

function printHeader() {
  console.log(
    chalk.bold.cyan("\n╔══════════════════════════════════════════╗")
  );
  console.log(
    chalk.bold.cyan("║") +
      chalk.bold.white("        REPO HEALTH DASHBOARD             ") +
      chalk.bold.cyan("║")
  );
  console.log(
    chalk.bold.cyan("╚══════════════════════════════════════════╝\n")
  );
}

function printRepoInfo(repo) {
  console.log(chalk.bold.white("Repository Information"));
  console.log(chalk.gray("─".repeat(45)));
  console.log(`  Name:        ${chalk.bold(repo.fullName)}`);
  if (repo.description) {
    console.log(`  Description: ${chalk.gray(repo.description)}`);
  }
  console.log(`  Language:    ${repo.language || "N/A"}`);
  console.log(`  License:     ${repo.license}`);
  console.log(`  Branch:      ${repo.defaultBranch}`);
  if (repo.topics.length > 0) {
    console.log(
      `  Topics:      ${repo.topics.map((t) => chalk.cyan(t)).join(", ")}`
    );
  }
  console.log(
    `  Created:     ${new Date(repo.createdAt).toLocaleDateString()}`
  );
  console.log(
    `  Last Push:   ${new Date(repo.pushedAt).toLocaleDateString()}`
  );
  console.log();
}

function printHealthScore(score, warnings, positives) {
  const color = getScoreColor(score);
  const grade = getScoreEmoji(score);

  console.log(chalk.bold.white("Health Score"));
  console.log(chalk.gray("─".repeat(45)));

  const barLength = 30;
  const filled = Math.round((score / 100) * barLength);
  const empty = barLength - filled;
  const bar = "█".repeat(filled) + "░".repeat(empty);

  console.log(
    `  Score: ${color.bold(score + "/100")} ${chalk.gray("(" + grade + ")")}`
  );
  console.log(`  ${color(bar)}`);
  console.log();

  if (positives.length > 0) {
    console.log(chalk.green.bold("  Strengths:"));
    positives.forEach((p) => console.log(chalk.green(`    + ${p}`)));
    console.log();
  }

  if (warnings.length > 0) {
    console.log(chalk.yellow.bold("  Concerns:"));
    warnings.forEach((w) => console.log(chalk.yellow(`    ! ${w}`)));
    console.log();
  }
}

function printIssues(issues) {
  console.log(chalk.bold.white("Issues Overview"));
  console.log(chalk.gray("─".repeat(45)));
  console.log(`  Open Issues:       ${chalk.bold(issues.total)}`);
  console.log(`  Open PRs:          ${chalk.bold(issues.pullRequests)}`);
  console.log(
    `  Stale (>30 days):  ${chalk.yellow(issues.staleIssues)}`
  );
  console.log();
}

function printPullRequests(prs) {
  console.log(chalk.bold.white("Pull Requests"));
  console.log(chalk.gray("─".repeat(45)));
  console.log(`  Open PRs:              ${chalk.bold(prs.openCount)}`);
  console.log(`  Closed (last 30 days): ${chalk.green(prs.closedLast30Days)}`);
  console.log(
    `  Avg Time to Merge:     ${chalk.cyan(prs.avgTimeToMerge + " days")}`
  );
  if (prs.oldestOpenPR) {
    const daysOpen = Math.floor(
      (new Date() - new Date(prs.oldestOpenPR.created_at)) /
        (1000 * 60 * 60 * 24)
    );
    console.log(
      `  Oldest Open PR:        ${chalk.yellow(
        "#" + prs.oldestOpenPR.number + " (" + daysOpen + " days old)"
      )}`
    );
  }
  console.log();
}

function printContributors(contributors) {
  console.log(chalk.bold.white("Contributors"));
  console.log(chalk.gray("─".repeat(45)));
  console.log(
    `  Total Contributors:    ${chalk.bold(contributors.count)}`
  );
  console.log(
    `  Total Contributions:   ${chalk.bold(contributors.totalContributions)}`
  );

  if (contributors.topContributors.length > 0) {
    console.log();
    console.log(chalk.gray("  Top Contributors:"));
    contributors.topContributors.forEach((c, i) => {
      const bar = "█".repeat(
        Math.min(
          20,
          Math.round(
            (c.contributions / contributors.topContributors[0].contributions) *
              20
          )
        )
      );
      console.log(
        `    ${i + 1}. ${chalk.cyan(c.login.padEnd(18))} ${chalk.gray(
          bar
        )} ${c.contributions}`
      );
    });
  }
  console.log();
}

function printActivity(activity) {
  console.log(chalk.bold.white("Recent Activity"));
  console.log(chalk.gray("─".repeat(45)));

  if (activity.lastCommit) {
    const daysSince = Math.floor(
      (new Date() - new Date(activity.lastCommit.date)) / (1000 * 60 * 60 * 24)
    );
    console.log(`  Last Commit:`);
    console.log(`    SHA:     ${chalk.cyan(activity.lastCommit.sha)}`);
    console.log(
      `    Message: ${chalk.gray(activity.lastCommit.message.substring(0, 50))}`
    );
    console.log(`    Author:  ${activity.lastCommit.author}`);
    console.log(`    Date:    ${activity.lastCommit.date} (${daysSince} days ago)`);
  }

  if (activity.recentReleases.length > 0) {
    console.log();
    console.log(chalk.gray("  Recent Releases:"));
    activity.recentReleases.forEach((r) => {
      console.log(
        `    ${chalk.green(r.name)} - ${chalk.gray(
          new Date(r.date).toLocaleDateString()
        )}`
      );
    });
  }
  console.log();
}

function printSummary(data) {
  console.log(chalk.bold.cyan("Summary"));
  console.log(chalk.gray("─".repeat(45)));
  console.log(
    `  ${formatNumber(data.repo.stars)} stars | ${formatNumber(
      data.repo.forks
    )} forks | ${formatNumber(data.issues.total)} issues | ${formatNumber(
      data.pullRequests.openCount
    )} open PRs`
  );
  console.log(
    `  ${data.contributors.count} contributors | ${data.repo.language || "N/A"} | ${
      data.repo.license
    }`
  );
  console.log();
}

function printFullReport(data) {
  printHeader();
  printRepoInfo(data.repo);
  printHealthScore(data.score, data.warnings, data.positives);
  printIssues(data.issues);
  printPullRequests(data.pullRequests);
  printContributors(data.contributors);
  printActivity(data.activity);
  printSummary(data);
}

module.exports = {
  printFullReport,
  printHeader,
  formatNumber,
};
