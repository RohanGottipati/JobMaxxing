import { lookup as lookupCallback, type LookupAddress, type LookupOptions } from "node:dns";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import { Agent, fetch as undiciFetch } from "undici";

import {
  ByteLimitExceededError,
  readBoundedBytes,
} from "@/lib/http/read-bounded-bytes";

const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const MAX_DESCRIPTION_CHARS = 200_000;
const MAX_REDIRECTS = 3;

const supportedHosts = [
  { suffix: "greenhouse.io", adapter: "greenhouse" },
  { suffix: "lever.co", adapter: "lever" },
  { suffix: "ashbyhq.com", adapter: "ashby" },
  { suffix: "myworkdayjobs.com", adapter: "workday" },
  { suffix: "dayforcehcm.com", adapter: "dayforce" },
  { suffix: "dayforce.com", adapter: "dayforce" },
  { suffix: "icims.com", adapter: "icims" },
  { suffix: "workable.com", adapter: "workable" },
  { suffix: "smartrecruiters.com", adapter: "smartrecruiters" },
  { suffix: "linkedin.com", adapter: "linkedin" },
  { suffix: "indeed.com", adapter: "indeed" },
] as const;

type LookupCallback = (
  error: NodeJS.ErrnoException | null,
  address: string | LookupAddress[],
  family?: number,
) => void;

// Re-validate at connect time so a DNS answer that changes between the
// pre-flight check and the socket connect (DNS rebinding) cannot reach a
// private address.
function publicOnlyLookup(hostname: string, options: LookupOptions, callback: LookupCallback) {
  lookupCallback(hostname, { ...options, all: true, verbatim: true }, (error, addresses) => {
    if (error) return callback(error, []);
    if (!addresses.length || addresses.some(({ address }) => !isPublicIp(address))) {
      return callback(Object.assign(new Error("JOB_URL_UNSUPPORTED"), { code: "ENOTFOUND" }), []);
    }
    if (options.all) return callback(null, addresses);
    callback(null, addresses[0].address, addresses[0].family);
  });
}

const importDispatcher = new Agent({ connect: { lookup: publicOnlyLookup } });

export type JobPageImport = {
  sourceUrl: string;
  adapter: (typeof supportedHosts)[number]["adapter"];
  roleTitle: string;
  company: string;
  location: string;
  description: string;
  fetchedAt: string;
};

export function validateSupportedJobUrl(input: string) {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error("JOB_URL_UNSUPPORTED");
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443") ||
    isIP(url.hostname)
  ) {
    throw new Error("JOB_URL_UNSUPPORTED");
  }
  const hostname = url.hostname.toLocaleLowerCase().replace(/\.$/, "");
  const supported = supportedHosts.find(
    ({ suffix }) => hostname === suffix || hostname.endsWith("." + suffix),
  );
  if (!supported) throw new Error("JOB_URL_UNSUPPORTED");
  url.hash = "";
  return { url, adapter: supported.adapter };
}

export async function importJobUrl(input: string): Promise<JobPageImport> {
  let validated = validateSupportedJobUrl(input);
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    await assertPublicDns(validated.url.hostname);
    const response = (await undiciFetch(validated.url, {
      dispatcher: importDispatcher,
      redirect: "manual",
      referrerPolicy: "no-referrer",
      signal: AbortSignal.timeout(10_000),
      headers: {
        Accept: "text/html, text/plain;q=0.9",
        "User-Agent": "JobMaxxing job import/1.0",
      },
    }).catch(() => {
      throw new Error("JOB_IMPORT_UNAVAILABLE");
    })) as unknown as Response;

    if (response.status >= 300 && response.status < 400) {
      if (redirect === MAX_REDIRECTS) throw new Error("JOB_IMPORT_UNAVAILABLE");
      const location = response.headers.get("location");
      if (!location) throw new Error("JOB_IMPORT_UNAVAILABLE");
      validated = validateSupportedJobUrl(new URL(location, validated.url).toString());
      continue;
    }
    if (!response.ok) throw new Error("JOB_IMPORT_UNAVAILABLE");
    const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim();
    if (contentType !== "text/html" && contentType !== "text/plain") {
      throw new Error("JOB_IMPORT_UNSUPPORTED_CONTENT");
    }
    const declaredLength = Number(response.headers.get("content-length") ?? 0);
    if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
      throw new Error("JOB_IMPORT_TOO_LARGE");
    }
    const source = await readLimitedBody(response);
    const extracted = extractJobPage(source, contentType);
    return {
      sourceUrl: validated.url.toString(),
      adapter: validated.adapter,
      ...extracted,
      fetchedAt: new Date().toISOString(),
    };
  }
  throw new Error("JOB_IMPORT_UNAVAILABLE");
}

export function extractJobPage(source: string, contentType = "text/html") {
  if (contentType === "text/plain") {
    const description = source.trim().slice(0, MAX_DESCRIPTION_CHARS);
    if (description.length < 80) throw new Error("JOB_IMPORT_EMPTY");
    return { roleTitle: "", company: "", location: "", description };
  }

  const jobPosting = findJobPostingJsonLd(source);
  if (jobPosting) {
    const description = htmlToText(stringValue(jobPosting?.description) || source)
      .slice(0, MAX_DESCRIPTION_CHARS);
    if (description.length < 80) throw new Error("JOB_IMPORT_EMPTY");
    return {
      roleTitle: stringValue(jobPosting?.title),
      company: stringValue(objectValue(jobPosting?.hiringOrganization)?.name),
      location: extractLocation(jobPosting?.jobLocation),
      description,
    };
  }

  const nextJobPosting = findJobPostingFromNextData(source);
  if (nextJobPosting) {
    const description = htmlToText(nextJobPosting.description || source)
      .slice(0, MAX_DESCRIPTION_CHARS);
    if (description.length < 80) throw new Error("JOB_IMPORT_EMPTY");
    return {
      roleTitle: nextJobPosting.roleTitle,
      company: nextJobPosting.company,
      location: nextJobPosting.location,
      description,
    };
  }

  const description = htmlToText(source).slice(0, MAX_DESCRIPTION_CHARS);
  if (description.length < 80) throw new Error("JOB_IMPORT_EMPTY");
  return {
    roleTitle: "",
    company: "",
    location: "",
    description,
  };
}

async function assertPublicDns(hostname: string) {
  let addresses: Array<{ address: string; family: number }>;
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new Error("JOB_IMPORT_UNAVAILABLE");
  }
  if (!addresses.length || addresses.some(({ address }) => !isPublicIp(address))) {
    throw new Error("JOB_URL_UNSUPPORTED");
  }
}

export function isPublicIp(address: string) {
  const version = isIP(address);
  if (version === 4) {
    const parts = address.split(".").map(Number);
    const [a, b] = parts;
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 0 || b === 168)) ||
      (a === 192 && b === 88 && parts[2] === 99) ||
      (a === 198 && (b === 18 || b === 19 || b === 51)) ||
      (a === 203 && b === 0) ||
      a >= 224
    );
  }
  if (version === 6) {
    const x = ipv6Hextets(address);
    const embeddedIpv4 = () => [x[6] >> 8, x[6] & 255, x[7] >> 8, x[7] & 255].join(".");
    const zeros = (from: number, to: number) => x.slice(from, to).every((part) => part === 0);
    // IPv4-mapped (::ffff:a.b.c.d) and NAT64 well-known prefix (64:ff9b::/96)
    if (zeros(0, 5) && x[5] === 0xffff) return isPublicIp(embeddedIpv4());
    if (x[0] === 0x64 && x[1] === 0xff9b && zeros(2, 6)) return isPublicIp(embeddedIpv4());
    return !(
      zeros(0, 6) || // ::, ::1, and deprecated IPv4-compatible addresses
      (x[0] === 0x64 && x[1] === 0xff9b) || // NAT64 local-use
      (x[0] === 0x100 && zeros(1, 4)) || // discard-only
      (x[0] === 0x2001 && x[1] === 0) || // Teredo
      (x[0] === 0x2001 && x[1] === 0xdb8) || // documentation
      x[0] === 0x2002 || // 6to4
      (x[0] & 0xfe00) === 0xfc00 || // unique local
      (x[0] & 0xffc0) === 0xfe80 || // link-local
      (x[0] & 0xffc0) === 0xfec0 || // site-local
      (x[0] & 0xff00) === 0xff00 // multicast
    );
  }
  return false;
}

function ipv6Hextets(address: string) {
  let value = address.toLocaleLowerCase().split("%", 1)[0];
  const dotted = /(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(value);
  if (dotted) {
    const [, a, b, c, d] = dotted.map(Number);
    value = `${value.slice(0, dotted.index)}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  const [head, tail] = value.includes("::") ? value.split("::") : [value, undefined];
  const headParts = head ? head.split(":") : [];
  const tailParts = tail ? tail.split(":") : [];
  const fill = tail === undefined ? [] : Array(8 - headParts.length - tailParts.length).fill("0");
  return [...headParts, ...fill, ...tailParts].map((part) => Number.parseInt(part, 16));
}

async function readLimitedBody(response: Response) {
  if (!response.body) throw new Error("JOB_IMPORT_EMPTY");
  try {
    return new TextDecoder().decode(
      await readBoundedBytes(response.body, MAX_RESPONSE_BYTES),
    );
  } catch (error) {
    if (error instanceof ByteLimitExceededError) {
      throw new Error("JOB_IMPORT_TOO_LARGE");
    }
    throw error;
  }
}

function findJobPostingJsonLd(source: string): Record<string, unknown> | null {
  const scripts = source.matchAll(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const match of scripts) {
    try {
      const found = findJobPosting(JSON.parse(match[1].trim()));
      if (found) return found;
    } catch {
      continue;
    }
  }
  return null;
}

function findJobPosting(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findJobPosting(item);
      if (found) return found;
    }
    return null;
  }
  if (!value || typeof value !== "object") return null;
  const object = value as Record<string, unknown>;
  const types = Array.isArray(object["@type"]) ? object["@type"] : [object["@type"]];
  if (types.includes("JobPosting")) return object;
  return findJobPosting(object["@graph"]);
}

function findJobPostingFromNextData(source: string) {
  const match = source.match(
    /<script\b[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i,
  );
  if (!match) return null;
  try {
    const data = JSON.parse(match[1]);
    const jobData = data?.props?.pageProps?.jobData;
    if (!jobData) return null;
    const queries = (data?.props?.pageProps?.dehydratedState?.queries ?? []) as Array<{
      queryKey?: unknown[];
      state?: { data?: Record<string, unknown> };
    }>;
    const siteInfo = queries.find(
      (q) => Array.isArray(q?.queryKey) && q.queryKey[0] === "site-info",
    )?.state?.data;
    const locations = (
      (jobData.postingLocations ?? []) as Array<Record<string, string>>
    )
      .map(
        (loc) =>
          loc.formattedAddress ||
          [loc.cityName, loc.stateCode, loc.isoCountryCode]
            .filter(Boolean)
            .join(", "),
      )
      .filter(Boolean)
      .join("; ");
    const content = jobData.jobPostingContent;
    const desc =
      typeof content === "string"
        ? content
        : [
            content?.jobDescriptionHeader,
            content?.jobDescription,
            content?.jobDescriptionFooter,
          ]
            .filter(Boolean)
            .join("\n\n");
    return {
      roleTitle: stringValue(jobData.jobTitle),
      company: stringValue(siteInfo?.candidateCorrespondenceClientName),
      location: locations,
      description: desc,
    };
  } catch {
    return null;
  }
}

function htmlToText(value: string) {
  return decodeEntities(
    value
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<(?:br|\/p|\/div|\/li|\/h[1-6])\s*>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[\t\f\r ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodeEntities(value: string) {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const hex = entity[1]?.toLocaleLowerCase() === "x";
      const codePoint = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : match;
    }
    return named[entity.toLocaleLowerCase()] ?? match;
  });
}

function extractLocation(value: unknown) {
  const locations = Array.isArray(value) ? value : value ? [value] : [];
  return locations
    .map((item) => {
      const address = objectValue(objectValue(item)?.address);
      return [address?.addressLocality, address?.addressRegion, address?.addressCountry]
        .map(stringValue)
        .filter(Boolean)
        .join(", ");
    })
    .filter(Boolean)
    .join("; ");
}

function objectValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
