export function parseIfMatch(request: Request) {
  const header = request.headers.get("if-match")?.replace(/^W\//, "").replace(/"/g, "");
  return header && /^\d+$/.test(header) ? Number(header) : null;
}
