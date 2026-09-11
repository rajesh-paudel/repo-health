const { Octokit } = require("@octokit/rest");
const { graphql } = require("@octokit/graphql");

class GitHubAPI {
  constructor(token) {
    this.octokit = new Octokit({ auth: token });
    this.graphqlWithAuth = token
      ? graphql.defaults({ headers: { authorization: `token ${token}` } })
      : null;
  }

  async getRepo(owner, repo) {
    const { data } = await this.octokit.repos.get({ owner, repo });
    return {
      name: data.name,
      fullName: data.full_name,
      description: data.description,
      stars: data.stargazers_count,
      forks: data.forks_count,
      openIssues: data.open_issues_count,
      language: data.language,
      license: data.license?.spdx_id || "None",
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      pushedAt: data.pushed_at,
      defaultBranch: data.default_branch,
      size: data.size,
      topics: data.topics || [],
      archived: data.archived,
      disabled: data.disabled,
      visibility: data.visibility,
    };
  }

  async getOpenIssues(owner, repo) {
    const { data } = await this.octokit.issues.listForRepo({
      owner,
      repo,
      state: "open",
      per_page: 100,
    });
    const now = new Date();
    const stale = data.filter((issue) => {
      const daysSinceUpdate = Math.floor(
        (now - new Date(issue.updated_at)) / (1000 * 60 * 60 * 24)
      );
      return daysSinceUpdate > 30 && !issue.pull_request;
    });
    return {
      total: data.filter((i) => !i.pull_request).length,
      pullRequests: data.filter((i) => i.pull_request).length,
      staleIssues: stale.length,
    };
  }

  async getPullRequests(owner, repo) {
    const { data: open } = await this.octokit.pulls.list({
      owner,
      repo,
      state: "open",
      per_page: 100,
    });
    const { data: closed } = await this.octokit.pulls.list({
      owner,
      repo,
      state: "closed",
      per_page: 30,
    });

    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const recentClosed = closed.filter(
      (pr) => new Date(pr.closed_at) > thirtyDaysAgo
    );

    const avgMergeTime =
      recentClosed.length > 0
        ? recentClosed.reduce((sum, pr) => {
            const created = new Date(pr.created_at);
            const closed = new Date(pr.closed_at);
            return sum + (closed - created);
          }, 0) / recentClosed.length / (1000 * 60 * 60 * 24)
        : 0;

    return {
      openCount: open.length,
      closedLast30Days: recentClosed.length,
      avgTimeToMerge: avgMergeTime.toFixed(1),
      oldestOpenPR:
        open.length > 0
          ? open.reduce((oldest, pr) =>
              new Date(pr.created_at) < new Date(oldest.created_at)
                ? pr
                : oldest
            )
          : null,
    };
  }

  async getContributors(owner, repo) {
    const { data } = await this.octokit.repos.listContributors({
      owner,
      repo,
      per_page: 100,
    });
    const totalContributions = data.reduce(
      (sum, c) => sum + c.contributions,
      0
    );
    return {
      count: data.length,
      topContributors: data.slice(0, 5).map((c) => ({
        login: c.login,
        contributions: c.contributions,
        url: c.html_url,
      })),
      totalContributions,
    };
  }

  async getRecentActivity(owner, repo) {
    const { data: commits } = await this.octokit.repos.listCommits({
      owner,
      repo,
      per_page: 1,
    });
    const { data: releases } = await this.octokit.repos.listReleases({
      owner,
      repo,
      per_page: 5,
    });

    return {
      lastCommit: commits[0]
        ? {
            sha: commits[0].sha.substring(0, 7),
            message: commits[0].commit.message.split("\n")[0],
            date: commits[0].commit.author.date,
            author: commits[0].commit.author.name,
          }
        : null,
      recentReleases: releases.slice(0, 3).map((r) => ({
        name: r.name || r.tag_name,
        date: r.published_at,
        tag: r.tag_name,
      })),
    };
  }

  async getHealthScore(owner, repo) {
    const [repoData, issues, prs, contributors, activity] = await Promise.all([
      this.getRepo(owner, repo),
      this.getOpenIssues(owner, repo),
      this.getPullRequests(owner, repo),
      this.getContributors(owner, repo),
      this.getRecentActivity(owner, repo),
    ]);

    let score = 100;
    const warnings = [];
    const positives = [];

    // Stale issues penalty
    if (issues.staleIssues > 10) {
      score -= 15;
      warnings.push(`${issues.staleIssues} stale issues (>30 days without activity)`);
    } else if (issues.staleIssues > 0) {
      score -= 5;
      warnings.push(`${issues.staleIssues} stale issues`);
    } else {
      positives.push("No stale issues");
    }

    // PR merge time
    if (parseFloat(prs.avgTimeToMerge) > 14) {
      score -= 15;
      warnings.push(`Slow PR merge time: ${prs.avgTimeToMerge} days avg`);
    } else if (parseFloat(prs.avgTimeToMerge) > 7) {
      score -= 5;
      warnings.push(`Moderate PR merge time: ${prs.avgTimeToMerge} days avg`);
    } else if (prs.avgTimeToMerge > 0) {
      positives.push(`Fast PR merges: ${prs.avgTimeToMerge} days avg`);
    }

    // Contributor bus factor
    if (contributors.count <= 2) {
      score -= 20;
      warnings.push(`Low contributor count: ${contributors.count} (bus factor risk)`);
    } else if (contributors.count <= 5) {
      score -= 5;
      warnings.push(`Moderate contributor count: ${contributors.count}`);
    } else {
      positives.push(`Healthy contributor base: ${contributors.count} contributors`);
    }

    // Last commit freshness
    if (activity.lastCommit) {
      const daysSinceLastCommit = Math.floor(
        (new Date() - new Date(activity.lastCommit.date)) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceLastCommit > 90) {
        score -= 20;
        warnings.push(`Last commit was ${daysSinceLastCommit} days ago`);
      } else if (daysSinceLastCommit > 30) {
        score -= 10;
        warnings.push(`Last commit was ${daysSinceLastCommit} days ago`);
      } else {
        positives.push(`Active development: last commit ${daysSinceLastCommit} days ago`);
      }
    }

    // Open PRs backlog
    if (prs.openCount > 20) {
      score -= 10;
      warnings.push(`Large PR backlog: ${prs.openCount} open PRs`);
    }

    // Archived repo
    if (repoData.archived) {
      score = 0;
      warnings.push("Repository is archived");
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      warnings,
      positives,
      repo: repoData,
      issues,
      pullRequests: prs,
      contributors,
      activity,
    };
  }
}

module.exports = GitHubAPI;
