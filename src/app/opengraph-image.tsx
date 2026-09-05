import { ImageResponse } from "next/og";

export const alt = "JobMaxxing private job application tracker";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#f7f4ed",
          color: "#292824",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          padding: "72px",
          width: "100%",
        }}
      >
        <div
          style={{
            border: "2px solid #d7d0c4",
            borderRadius: "28px",
            display: "flex",
            flexDirection: "column",
            height: "100%",
            justifyContent: "space-between",
            padding: "64px",
            width: "100%",
          }}
        >
          <div style={{ color: "#315f52", display: "flex", fontSize: 38, fontWeight: 700 }}>
            JobMaxxing
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 68, fontWeight: 700, letterSpacing: "-3px", lineHeight: 1.05 }}>
              Your job search, organized.
            </div>
            <div style={{ color: "#6c6860", display: "flex", fontSize: 30, marginTop: 24 }}>
              Applications, deadlines, resumes, and cover letters in one private workspace.
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
