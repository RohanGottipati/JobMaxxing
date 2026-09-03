import type { LatexDocumentKind } from "@/lib/latex/constants";
import type { LatexEngine } from "@/types/database";

export const LATEX_TEMPLATE_IDS = ["ats-resume", "cover-letter", "blank"] as const;

export type LatexTemplateId = (typeof LATEX_TEMPLATE_IDS)[number];

export type LatexTemplate = {
  id: LatexTemplateId;
  name: string;
  description: string;
  engine: LatexEngine;
  kinds: readonly LatexDocumentKind[];
  source: string;
};

export function isLatexTemplateId(value: string): value is LatexTemplateId {
  return LATEX_TEMPLATE_IDS.some((id) => id === value);
}

const ATS_RESUME = String.raw`\documentclass[11pt,letterpaper]{article}

% ATS-friendly resume: single column, no tables, selectable text,
% standard fonts, and section headings that parsers recognise.
\usepackage[T1]{fontenc}
\usepackage[utf8]{inputenc}
\usepackage[margin=0.75in]{geometry}
\usepackage{enumitem}
\usepackage[hidelinks]{hyperref}
\usepackage{titlesec}

\pagestyle{empty}
\setlist[itemize]{leftmargin=1.5em, itemsep=1pt, topsep=2pt, parsep=0pt}
\titleformat{\section}{\normalfont\large\bfseries\uppercase}{}{0em}{}[\titlerule]
\titlespacing{\section}{0pt}{10pt}{6pt}

\newcommand{\role}[4]{%
  \textbf{#1} \hfill \textbf{#2}\\
  \textit{#3} \hfill \textit{#4}\\
}

\begin{document}

\begin{center}
  {\LARGE \textbf{Your Name}}\\[3pt]
  Toronto, ON \textperiodcentered\ you@example.com \textperiodcentered\ (555) 555-5555\\
  \href{https://linkedin.com/in/you}{linkedin.com/in/you} \textperiodcentered\ \href{https://github.com/you}{github.com/you}
\end{center}

\section{Summary}
Software engineer with experience building reliable web services. Replace this
with two lines describing the scope you own and the outcomes you deliver.

\section{Experience}

\role{Company Name}{Toronto, ON}{Software Engineer}{Jan 2024 -- Present}
\begin{itemize}
  \item Shipped a feature that moved a named metric from X to Y.
  \item Reduced a concrete cost or latency number by a measured amount.
  \item Led a project end to end, naming the technologies you chose and why.
\end{itemize}

\role{Earlier Company}{Remote}{Software Engineering Intern}{May 2023 -- Aug 2023}
\begin{itemize}
  \item Built something specific and state the measurable result.
  \item Automated a manual process and quantify the time saved.
\end{itemize}

\section{Projects}

\role{Project Name}{}{TypeScript, Postgres}{2024}
\begin{itemize}
  \item One line on what it does and one line on the hardest part you solved.
\end{itemize}

\section{Education}

\role{University Name}{Toronto, ON}{BSc Computer Science}{2021 -- 2025}

\section{Skills}
\textbf{Languages:} TypeScript, Python, SQL, Go\\
\textbf{Tools:} React, Next.js, Postgres, Docker, AWS

\end{document}
`;

const COVER_LETTER = String.raw`\documentclass[11pt,letterpaper]{article}

\usepackage[T1]{fontenc}
\usepackage[utf8]{inputenc}
\usepackage[margin=1in]{geometry}
\usepackage[hidelinks]{hyperref}
\usepackage{parskip}

\pagestyle{empty}

\begin{document}

\begin{flushleft}
  Your Name\\
  Toronto, ON\\
  you@example.com \textperiodcentered\ (555) 555-5555
\end{flushleft}

\vspace{1em}

\today

\vspace{1em}

\begin{flushleft}
  Hiring Team\\
  Company Name
\end{flushleft}

\vspace{1em}

Dear Hiring Team,

I am applying for the \textbf{Role Title} position at \textbf{Company Name}.
Open with the one sentence that explains why you are a credible candidate for
this specific team, not a generic statement about your enthusiasm.

In my current role at Company, I owned a concrete area of the product. Name the
result you are proudest of and attach a number to it. Then connect that result
to something the job description actually asks for, so the reader does not have
to make the leap themselves.

I am drawn to Company Name because of a specific, verifiable reason: a product
decision, an engineering post, or the problem domain. Close by naming what you
would want to work on first.

Thank you for your time and consideration.

\vspace{1em}

\begin{flushleft}
  Sincerely,\\[1.5em]
  Your Name
\end{flushleft}

\end{document}
`;

const BLANK = String.raw`\documentclass[11pt]{article}

\usepackage[T1]{fontenc}
\usepackage[utf8]{inputenc}
\usepackage[margin=1in]{geometry}

\begin{document}

Start writing here.

\end{document}
`;

export const LATEX_TEMPLATES: readonly LatexTemplate[] = [
  {
    id: "ats-resume",
    name: "ATS-friendly resume",
    description:
      "Single column, standard fonts, and parser-friendly headings. Safest choice for applicant tracking systems.",
    engine: "pdflatex",
    kinds: ["master_resume", "resume_version"],
    source: ATS_RESUME,
  },
  {
    id: "cover-letter",
    name: "Professional cover letter",
    description:
      "Letterhead, dated salutation, and three-paragraph body sized for one page.",
    engine: "pdflatex",
    kinds: ["cover_letter"],
    source: COVER_LETTER,
  },
  {
    id: "blank",
    name: "Blank document",
    description: "A minimal article class preamble and nothing else.",
    engine: "pdflatex",
    kinds: ["master_resume", "resume_version", "cover_letter"],
    source: BLANK,
  },
];

export function getLatexTemplate(id: LatexTemplateId) {
  const template = LATEX_TEMPLATES.find((candidate) => candidate.id === id);
  if (!template) throw new Error(`Unknown LaTeX template: ${id}`);
  return template;
}

export function latexTemplatesForKind(kind: LatexDocumentKind) {
  return LATEX_TEMPLATES.filter((template) => template.kinds.includes(kind));
}

export function defaultLatexTemplateId(kind: LatexDocumentKind): LatexTemplateId {
  return kind === "cover_letter" ? "cover-letter" : "ats-resume";
}
