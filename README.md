# github-actions-secops-pipeline

> Production-grade DevSecOps pipelines using GitHub Actions.  
> Security scanning baked into every stage — secrets, code, containers, IaC, and live web apps.

[![DevSecOps Pipeline](https://github.com/venkatanaveenrk/github-actions-secops-pipeline/actions/workflows/devsecops-pipeline.yml/badge.svg)](https://github.com/venkatanaveenrk/github-actions-secops-pipeline/actions/workflows/devsecops-pipeline.yml)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Security](https://img.shields.io/badge/security-DevSecOps-red)](https://github.com/venkatanaveenrk/github-actions-secops-pipeline/security)

---

## Prerequisites

### Required — security gates & application scanning
These are all you need to fork this repo and get a fully working, all-green pipeline:

| Requirement | Why |
|---|---|
| A GitHub account, with Actions enabled on your fork | All pipelines run as GitHub Actions workflows |
| [Git](https://git-scm.com/) | To clone and push |
| [Node.js 20+](https://nodejs.org/) and npm | To run/test `sample-app` locally |
| [Docker](https://www.docker.com/products/docker-desktop/) | To build/run the container image locally |

Nothing else is required. Secret scanning (Gitleaks), dependency scanning (npm audit + Trivy), container scanning (Trivy), and DAST (OWASP ZAP) all run out of the box with **no external accounts and no cloud credentials**.

### Optional — extra integrations
Each of these is independently opt-in. If skipped, the corresponding pipeline job/step auto-skips cleanly (no red ❌) rather than failing.

| Integration | Needed for | Setup |
|---|---|---|
| SonarCloud (`SONAR_TOKEN`) | Code quality / SAST dashboard | Free for public repos — [sonarcloud.io](https://sonarcloud.io) |
| Infracost (`INFRACOST_API_KEY`) | Cloud cost estimates on PRs | Only relevant if you keep `terraform/` — [infracost.io](https://infracost.io) |
| Gitleaks license (`GITLEAKS_LICENSE`) | Nothing required — free tier works for public repos | [gitleaks.io](https://gitleaks.io) |
| Terraform CLI + Azure CLI + an Azure subscription | Only if you want to actually provision the sample Azure infra in `terraform/main.tf` | The pipelines only *scan* `terraform/main.tf` with Checkov — they never run `terraform apply` or need Azure credentials. Delete the `terraform/` folder entirely and Checkov/Infracost jobs skip automatically. |

> **Azure infra is entirely optional.** The `terraform/` folder exists to give Checkov something to scan as a demo. If you don't need IaC scanning, delete the folder — the rest of the pipeline (all security gates + app scanning) is unaffected.

---

## What This Does

Most CI/CD pipelines only check if code works. This repo shows how to check if code is **secure** — at every stage of the pipeline, automatically, for free.

```
Developer pushes code
        ↓
🔑 Gitleaks      — scans for accidentally committed secrets
📊 SonarCloud    — code quality, bugs, security vulnerabilities
📦 npm audit     — checks dependencies for known CVEs
🐳 Trivy (FS)    — scans filesystem for vulnerabilities
🐳 Docker build  — builds container image
🔍 Trivy (image) — scans container for CVEs
🏗️ Checkov       — scans Terraform for misconfigurations
💰 Infracost     — estimates cloud cost on every PR
🌐 OWASP ZAP     — scans running app for web vulnerabilities
📋 Summary       — posts results to GitHub UI
```

---

## Pipelines

| Pipeline | File | Trigger | Purpose |
|---|---|---|---|
| Full DevSecOps | `devsecops-pipeline.yml` | Push to main/develop, PRs, manual | Complete security scan |
| PR Security Check | `pr-security-check.yml` | Every PR | Fast feedback in <5 min |
| Publish Container | `publish-container.yml` | Push to main | Build + scan + push to GHCR |
| Weekly Audit | `weekly-audit.yml` | Manual always; scheduled Monday 2AM only if opted in | Full audit + auto GitHub Issue |

> **Weekly Audit is off by default.** The scheduled Monday run only executes once you set a repo variable `ENABLE_WEEKLY_AUDIT=true` (Settings → Secrets and variables → Actions → Variables tab). Until then, the cron still fires on schedule but the job skips immediately at ~zero cost. You can always trigger a one-off run manually via Actions → Weekly Security Audit → Run workflow, regardless of the variable.

---

## Security Tools Used

### 🔑 Gitleaks — Secret Detection
Scans entire git history for accidentally committed secrets: API keys, passwords, tokens, connection strings. Runs on every push and PR.

**Catches:** AWS keys, Azure credentials, GitHub tokens, database passwords, private keys

### 📊 SonarCloud — Code Quality + SAST *(optional)*
Static Application Security Testing. Finds security vulnerabilities in source code before it runs anywhere.

**Catches:** SQL injection patterns, XSS vulnerabilities, hardcoded credentials, insecure crypto usage, code smells

**Free for public repos** — sign up at sonarcloud.io. Without a `SONAR_TOKEN` secret, this step auto-skips (tests still run — only the SonarCloud upload is skipped).

### 📦 Trivy — Vulnerability Scanner
Scans both the filesystem (dependencies) and Docker container image for known CVEs from NVD, GitHub Advisory Database, and OS package databases.

**Catches:** Outdated npm packages with CVEs, vulnerable OS packages in Docker base image, exposed secrets in container layers

### 🏗️ Checkov — IaC Security *(optional — requires `terraform/`)*
Scans Terraform files for misconfigurations against 1000+ security checks including CIS Benchmarks, NIST, PCI-DSS, HIPAA. No Azure credentials needed — it's a static scan of `.tf` files only, never a `terraform apply`.

**Catches:** Storage accounts with public access, VMs with open ports, missing encryption, no audit logging

Auto-skips if the `terraform/` folder doesn't exist.

### 🌐 OWASP ZAP — DAST
Dynamic Application Security Testing — actually runs the app and attacks it to find vulnerabilities.

**Catches:** XSS, SQL injection, insecure headers, CSRF, path traversal, exposed admin interfaces

### 💰 Infracost — Cost Estimation *(optional — requires `terraform/` and `INFRACOST_API_KEY`)*
Shows estimated monthly AWS/Azure cost of Terraform changes on every PR — before you merge and get surprised by a bill. Auto-skips if the `terraform/` folder doesn't exist.

---

## Quick Start

### 1. Fork this repo

### 2. (Optional) Set up secrets in GitHub
Skip this step entirely if you just want the security gates and app scanning — everything runs with zero secrets configured. Add these only if you want the matching optional integration:

Go to your repo → Settings → Secrets and variables → Actions → New repository secret

| Secret | Where to get it | Enables |
|---|---|---|
| `SONAR_TOKEN` | sonarcloud.io → My Account → Security | Code quality / SAST dashboard |
| `INFRACOST_API_KEY` | infracost.io → Org Settings → API keys | Cloud cost estimation (only relevant with `terraform/`) |
| `GITLEAKS_LICENSE` | gitleaks.io (free for public repos) | Nothing required for public repos — optional |

### 3. (Optional) Set up SonarCloud
Only needed if you added `SONAR_TOKEN` above.
1. Go to [sonarcloud.io](https://sonarcloud.io) and sign in with GitHub
2. Click + → Analyze new project → select your fork
3. `sonar-project.properties`'s org/project key don't need editing — the pipeline overrides them automatically from your repo owner at run time

### 4. Push code — pipeline runs automatically
```bash
git clone https://github.com/YOUR_USERNAME/github-actions-secops-pipeline
cd github-actions-secops-pipeline
# Make a change
git add . && git commit -m "test: trigger pipeline"
git push origin main
```

Go to **Actions** tab in GitHub to watch the pipeline run.

### 5. Run it locally before you push (recommended)
```bash
cd sample-app
npm install
npm test    # 14 tests, should all pass
npm run lint  # ESLint + security rules
npm start   # serves on http://localhost:8080

# In another terminal:
docker build -t devsecops-sample-app .
docker run -d -p 8080:8080 devsecops-sample-app
curl http://localhost:8080/health
```

---

## Sample App Security Features

The included Node.js app demonstrates security best practices in code:

| Feature | Implementation |
|---|---|
| Security headers | Helmet middleware (CSP, HSTS, X-Frame-Options) |
| Rate limiting | express-rate-limit (100 req/15min global, 30 req/min API) |
| Input sanitization | XSS pattern removal, type checking, length limits |
| JSON size limits | 10KB maximum request body |
| No sensitive data | Users endpoint never returns passwords/tokens/emails |
| Error handling | Stack traces never exposed in responses |
| Non-root Docker | Runs as uid 1001, not root |
| Multi-stage build | Minimal final image (no dev dependencies) |

---

## Understanding Pipeline Results

### GitHub Security Tab
All SARIF results (Trivy, Checkov) appear in **Security → Code scanning alerts** automatically. No extra setup.

### PR Comments
- Infracost posts cost estimate as a PR comment
- Security summary posted to each workflow run

### GitHub Issues
Weekly audit automatically creates a GitHub Issue if critical vulnerabilities are found — with links to the scan results and a remediation checklist. Requires opting in via `ENABLE_WEEKLY_AUDIT=true` (see Pipelines table above), or run it manually any time from the Actions tab.

---

## Folder Structure

```
github-actions-secops-pipeline/
├── .github/
│   └── workflows/
│       ├── devsecops-pipeline.yml    ← Main pipeline (9 jobs)
│       ├── pr-security-check.yml     ← Fast PR checks (<5 min)
│       ├── publish-container.yml     ← Build + push to GHCR
│       └── weekly-audit.yml          ← Full audit (opt-in schedule, always manual)
├── .zap/
│   └── rules.tsv                     ← OWASP ZAP rule config
├── sample-app/
│   ├── src/app.js                    ← Secure Node.js app
│   ├── tests/security.test.js        ← Security-focused tests
│   ├── .eslintrc.json                ← ESLint + security-rule config
│   ├── Dockerfile                    ← Secure multi-stage build
│   └── package.json
├── terraform/                        ← Optional — delete freely, see Prerequisites
│   └── main.tf                       ← Azure IaC (Checkov scans this)
├── .gitleaks.toml                    ← Secret detection config
├── sonar-project.properties          ← SonarCloud config (optional integration)
├── LICENSE
└── README.md
```

---

## Connecting to terraform-azure-launchpad (optional)

If you do keep the `terraform/` folder and want to actually provision the infra it describes (rather than just have Checkov scan it), this repo is designed to work alongside a companion infra repo, e.g. `terraform-azure-launchpad`:

1. Use your infra repo to provision the actual Azure resources (`terraform apply`, real Azure credentials)
2. Use this repo's pipelines to scan that Terraform code for security issues before applying
3. Use Checkov results to ensure your infra meets CIS Azure benchmarks

This step is entirely optional — skip it if you only want the security gates and application scanning.

---

## License

MIT — free to use, fork, and adapt for your own projects.

---

*Built by [venkatanaveenrk](https://github.com/venkatanaveenrk) — Azure & DevOps Engineer*
