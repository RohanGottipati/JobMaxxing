import {
  Document,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";

import type { ResumeRenderEntry, ResumeRenderModel, ResumeRenderSection } from "@/lib/resumes/render-model";

export async function generateResumePdf(model: ResumeRenderModel): Promise<Buffer> {
  return renderToBuffer(<ResumePdfDocument model={model} />);
}

function ResumePdfDocument({ model }: { model: ResumeRenderModel }) {
  const p = model.presentation;
  const serif = model.template.fontFamily === "serif";
  const fontSize = 10 * p.fontScale;
  const styles = StyleSheet.create({
    page: {
      paddingTop: p.marginsPt.top,
      paddingRight: p.marginsPt.right,
      paddingBottom: p.marginsPt.bottom,
      paddingLeft: p.marginsPt.left,
      fontFamily: serif ? "Times-Roman" : "Helvetica",
      fontSize,
      lineHeight: p.lineHeight,
      color: "#171717",
    },
    name: { fontSize: fontSize * 2, fontFamily: serif ? "Times-Bold" : "Helvetica-Bold", textAlign: "center" },
    headline: { marginTop: 2, fontSize: fontSize * 1.05, textAlign: "center" },
    contact: { marginTop: 3, flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 4, fontSize: fontSize * 0.88 },
    columns: { flexDirection: "row", gap: 14 },
    sidebar: { width: "31%" },
    main: { width: "69%" },
    section: { marginTop: p.sectionGapPt },
    sectionTitle: {
      borderBottomWidth: model.template.accent === "none" ? 0 : 0.7,
      borderBottomColor: "#404040",
      paddingBottom: 1,
      marginBottom: 3,
      fontSize: fontSize * 1.08,
      fontFamily: serif ? "Times-Bold" : "Helvetica-Bold",
      textTransform: "uppercase",
      letterSpacing: 0.55,
    },
    entry: { marginBottom: 5 },
    row: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
    primary: { flexGrow: 1, flexShrink: 1, fontFamily: serif ? "Times-Bold" : "Helvetica-Bold" },
    date: { flexShrink: 0, textAlign: "right" },
    secondary: { flexGrow: 1, flexShrink: 1, fontFamily: serif ? "Times-Italic" : "Helvetica-Oblique" },
    location: { flexShrink: 0, textAlign: "right" },
    body: { marginTop: 1 },
    bulletRow: { flexDirection: "row", marginTop: p.bulletGapPt, paddingLeft: 8 },
    bullet: { width: 9 },
    bulletText: { flexGrow: 1, flexShrink: 1 },
    link: { color: "#171717", textDecoration: "none" },
  });

  const sidebarTypes = new Set(["skills", "certifications", "languages"]);
  const sidebar = model.sections.filter((section) => sidebarTypes.has(section.type));
  const main = model.sections.filter((section) => !sidebarTypes.has(section.type));

  return (
    <Document title={`${model.name} Resume`} author={model.name} creator="JobMaxxing">
      <Page size={p.paperSize === "a4" ? "A4" : "LETTER"} style={styles.page} wrap>
        <Text style={styles.name}>{model.name}</Text>
        {model.headline ? <Text style={styles.headline}>{model.headline}</Text> : null}
        <View style={styles.contact}>
          {model.contactText.map((value, index) => <Text key={`${value}-${index}`}>{index ? ` · ${value}` : value}</Text>)}
          {model.links.map((link) => <Link key={link.url} src={link.url} style={styles.link}> · {link.label}</Link>)}
        </View>
        {model.template.columns === 2 ? (
          <View style={styles.columns}>
            <View style={styles.sidebar}>{sidebar.map((section) => <PdfSection key={section.id} section={section} styles={styles} />)}</View>
            <View style={styles.main}>{main.map((section) => <PdfSection key={section.id} section={section} styles={styles} />)}</View>
          </View>
        ) : model.sections.map((section) => <PdfSection key={section.id} section={section} styles={styles} />)}
      </Page>
    </Document>
  );
}

type PdfStyles = ReturnType<typeof StyleSheet.create>;

function PdfSection({ section, styles }: { section: ResumeRenderSection; styles: PdfStyles }) {
  return (
    <View style={styles.section} break={section.pageBreakBefore}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      {section.inlineText ? <Text>{section.inlineText}</Text> : null}
      {section.entries.map((entry) => <PdfEntry key={entry.id} entry={entry} styles={styles} />)}
    </View>
  );
}

function PdfEntry({ entry, styles }: { entry: ResumeRenderEntry; styles: PdfStyles }) {
  return (
    <View style={styles.entry} wrap={false}>
      <View style={styles.row}><Text style={styles.primary}>{entry.primary}</Text>{entry.date ? <Text style={styles.date}>{entry.date}</Text> : null}</View>
      {entry.secondary || entry.location ? <View style={styles.row}><Text style={styles.secondary}>{entry.secondary}</Text><Text style={styles.location}>{entry.location}</Text></View> : null}
      {entry.body ? <Text style={styles.body}>{entry.body}</Text> : null}
      {entry.bullets.map((bullet, index) => <View key={`${entry.id}-bullet-${index}`} style={styles.bulletRow}><Text style={styles.bullet}>•</Text><Text style={styles.bulletText}>{bullet}</Text></View>)}
    </View>
  );
}
