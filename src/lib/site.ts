export const SITE_NAME = "JobMaxxing";
export const SITE_DESCRIPTION =
  "Track job applications, deadlines, job descriptions, tailored resumes, and cover letters in one private workspace.";

const DEFAULT_SITE_URL = "https://jobmaxxing.app";

export function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim() || DEFAULT_SITE_URL;

  try {
    const url = new URL(configured);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error("unsupported protocol");
    }
    url.pathname = "/";
    url.search = "";
    url.hash = "";
    return url;
  } catch {
    throw new Error(
      "NEXT_PUBLIC_APP_URL must be an absolute HTTP or HTTPS origin, such as https://app.example.com.",
    );
  }
}
