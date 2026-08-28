import assert from "node:assert/strict";
import test from "node:test";

import {
  extractJobPage,
  isPublicIp,
  validateSupportedJobUrl,
} from "@/lib/job-intelligence/url-import";

test("job URL validation accepts known ATS hosts and rejects SSRF-shaped inputs", () => {
  assert.equal(
    validateSupportedJobUrl("https://jobs.lever.co/example/123#apply").adapter,
    "lever",
  );
  assert.throws(() => validateSupportedJobUrl("http://jobs.lever.co/example/123"));
  assert.throws(() => validateSupportedJobUrl("https://127.0.0.1/job"));
  assert.throws(() => validateSupportedJobUrl("https://lever.co.attacker.example/job"));
  assert.throws(() => validateSupportedJobUrl("https://user:pass@jobs.lever.co/job"));
});

test("public IP validation rejects private, link-local, documentation, and mapped addresses", () => {
  for (const address of ["127.0.0.1", "10.0.0.4", "169.254.169.254", "192.168.1.2", "203.0.113.5", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1"]) {
    assert.equal(isPublicIp(address), false, address);
  }
  assert.equal(isPublicIp("8.8.8.8"), true);
  assert.equal(isPublicIp("2606:4700:4700::1111"), true);
});

test("job page extraction prefers JobPosting JSON-LD and returns sanitized text", () => {
  const page = `<!doctype html><html><head><script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: "Senior Backend Engineer",
    hiringOrganization: { name: "Example & Co" },
    jobLocation: { address: { addressLocality: "Toronto", addressRegion: "ON", addressCountry: "CA" } },
    description: "<p>Build reliable APIs &amp; services.</p><p>Work with &quot;PostgreSQL&quot; and TypeScript across production systems.</p>",
  })}</script></head><body><script>ignore()</script>Navigation noise</body></html>`;
  assert.deepEqual(extractJobPage(page), {
    roleTitle: "Senior Backend Engineer",
    company: "Example & Co",
    location: "Toronto, ON, CA",
    description: "Build reliable APIs & services.\nWork with \"PostgreSQL\" and TypeScript across production systems.",
  });
});
