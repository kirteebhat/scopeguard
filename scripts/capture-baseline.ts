import fs from "fs";
import path from "path";
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// Load .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...vals] = trimmed.split("=");
    if (key && vals.length > 0) {
      process.env[key.trim()] = vals.join("=").trim();
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function main() {
  const outputDir = path.resolve(process.cwd(), "docs/screenshots/baseline");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const timestamp = Date.now();
  const testEmail = `baseline_ui_${timestamp}@test.com`;
  const testPassword = "Password123!";
  const testName = "Morgan Vance";
  const wsName = `Acme Studio ${timestamp}`;

  console.log("Provisioning test user & workspace...");
  const { data: userData, error: userErr } = await admin.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
    user_metadata: { full_name: testName },
  });

  if (userErr || !userData.user) {
    throw new Error(`Failed to create user: ${userErr?.message}`);
  }
  const userId = userData.user.id;

  const { data: ws, error: wsErr } = await admin
    .from("workspaces")
    .insert({
      name: wsName,
      slug: `acme-studio-${timestamp}`,
      plan: "free",
    })
    .select()
    .single();

  if (wsErr || !ws) {
    throw new Error(`Failed to create workspace: ${wsErr?.message}`);
  }

  await admin.from("workspace_members").insert({
    workspace_id: ws.id,
    user_id: userId,
    role: "owner",
  });

  // Create Project
  const { data: project, error: projErr } = await admin
    .from("projects")
    .insert({
      workspace_id: ws.id,
      name: "BioHealth Telehealth Platform",
      client_name: "Northwestern Health",
      currency: "USD",
      budget_minor: 8500000, // $85,000.00
      hourly_rate_minor: 18500, // $185.00/hr
      start_date: "2026-09-01",
      original_deadline: "2026-12-15",
      status: "active",
      created_by: userId,
    })
    .select()
    .single();

  if (projErr || !project) {
    throw new Error(`Failed to create project: ${projErr?.message}`);
  }

  // Create Deliverable
  const { data: deliverable } = await admin
    .from("deliverables")
    .insert({
      project_id: project.id,
      title: "Telehealth WebRTC Engine",
      description: "Encrypted video consultation architecture",
      status: "in_progress",
    })
    .select()
    .single();

  // Create Change Request
  const { data: changeRequest, error: crErr } = await admin
    .from("change_requests")
    .insert({
      project_id: project.id,
      title: "Biometric MFA & Provider Identity Verification",
      description: "Addition of biometric facial recognition and ID document upload pipeline before consultation.",
      affected_deliverable_id: deliverable?.id || null,
      pricing_method: "hourly",
      estimated_hours: 24.0,
      hourly_rate_minor: 18500,
      cost_minor: 444000, // $4,440.00
      proposed_deadline: "2026-12-24",
      reason: "Clinical compliance board audit mandated biometric verification.",
      internal_notes: "Agency margin is 45% using AWS Rekognition.",
      status: "pending_approval",
      current_version: 1,
      created_by: userId,
    })
    .select()
    .single();

  if (crErr || !changeRequest) {
    throw new Error(`Failed to create change request: ${crErr?.message}`);
  }

  // Create Version 1 snapshot
  await admin.from("change_request_versions").insert({
    change_request_id: changeRequest.id,
    version_number: 1,
    title: changeRequest.title,
    description: changeRequest.description,
    pricing_method: changeRequest.pricing_method,
    cost_minor: changeRequest.cost_minor,
    currency: "USD",
    proposed_deadline: changeRequest.proposed_deadline,
    snapshot: {
      title: changeRequest.title,
      description: changeRequest.description,
      cost_minor: changeRequest.cost_minor,
      currency: "USD",
      proposed_deadline: changeRequest.proposed_deadline,
    },
    published_by: userId,
  });

  console.log("Launching browser to capture baseline screenshots...");
  const browser = await chromium.launch({ headless: true });

  const routes = [
    { name: "dashboard", path: "/dashboard" },
    { name: "projects", path: "/projects" },
    { name: "project-detail", path: `/projects/${project.id}` },
    { name: "change-request", path: `/changes/${changeRequest.id}` },
    { name: "settings", path: "/settings" },
  ];

  // 1. Desktop Viewport (1440x900)
  console.log("Capturing desktop screenshots (1440x900)...");
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const desktopPage = await desktopContext.newPage();

  // Login
  await desktopPage.goto("http://localhost:3000/login");
  await desktopPage.fill('input[name="email"]', testEmail);
  await desktopPage.fill('input[name="password"]', testPassword);
  await desktopPage.click('button[type="submit"]');
  await desktopPage.waitForURL("**/dashboard", { timeout: 15000 });
  await desktopPage.waitForTimeout(1000); // Allow any entrance animations to settle

  for (const route of routes) {
    console.log(`Navigating to ${route.path} (desktop)...`);
    await desktopPage.goto(`http://localhost:3000${route.path}`, { waitUntil: "networkidle" });
    await desktopPage.waitForTimeout(600);
    const dest = path.join(outputDir, `${route.name}-desktop.png`);
    await desktopPage.screenshot({ path: dest, fullPage: true });
    console.log(`Saved ${dest}`);
  }
  await desktopContext.close();

  // 2. Mobile Viewport (390x844)
  console.log("Capturing mobile screenshots (390x844)...");
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });
  const mobilePage = await mobileContext.newPage();

  // Login
  await mobilePage.goto("http://localhost:3000/login");
  await mobilePage.fill('input[name="email"]', testEmail);
  await mobilePage.fill('input[name="password"]', testPassword);
  await mobilePage.click('button[type="submit"]');
  await mobilePage.waitForURL("**/dashboard", { timeout: 15000 });
  await mobilePage.waitForTimeout(1000);

  for (const route of routes) {
    console.log(`Navigating to ${route.path} (mobile)...`);
    await mobilePage.goto(`http://localhost:3000${route.path}`, { waitUntil: "networkidle" });
    await mobilePage.waitForTimeout(600);
    const dest = path.join(outputDir, `${route.name}-mobile.png`);
    await mobilePage.screenshot({ path: dest, fullPage: true });
    console.log(`Saved ${dest}`);
  }
  await mobileContext.close();

  await browser.close();
  console.log("All 10 baseline screenshots successfully captured in docs/screenshots/baseline/");
}

main().catch((err) => {
  console.error("Error capturing baseline:", err);
  process.exit(1);
});
