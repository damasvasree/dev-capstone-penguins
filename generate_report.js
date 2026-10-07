const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, WidthType, ShadingType,
  AlignmentType, HeadingLevel, Footer, PageNumber, LevelFormat, BorderStyle, TabStopType, LeaderType, PageBreak, PageBorderDisplay, PageBorderOffsetFrom, PageBorderZOrder,
} = require('docx');

const ROOT = path.resolve(__dirname, '..');
const FIG = (n) => path.join(ROOT, 'figures', n + '.png');
const TBL = (n) => {
  const lines = fs.readFileSync(path.join(ROOT, 'outputs/tables', n + '.csv'), 'utf8').trim().split(/\r?\n/);
  return lines.map((l) => l.split(','));
};
const PAGES = fs.existsSync(path.join(__dirname, 'pages.json')) ? JSON.parse(fs.readFileSync(path.join(__dirname, 'pages.json'))) : {};
const GITHUB = 'https://github.com/<your-username>/dev-capstone-penguins';

const W = 9638; // content width in DXA (A4, 2 cm margins)
const SERIF = 'Times New Roman';
const MONO = 'Courier New';
const BLUE = '1F4E79';

// ---------- helpers ----------
const run = (t, o = {}) => new TextRun({ text: t, font: SERIF, size: 22, ...o });
const P = (text, o = {}) => new Paragraph({
  alignment: AlignmentType.JUSTIFIED, spacing: { after: 90, line: 264 }, ...(o.p || {}),
  children: Array.isArray(text) ? text : [run(text, o.r || {})],
});
const B = (t) => run(t, { bold: true });
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: t, font: SERIF })], keepNext: true });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: t, font: SERIF })], keepNext: true });
const bullets = (items) => items.map((t) => new Paragraph({
  numbering: { reference: 'bul', level: 0 }, alignment: AlignmentType.JUSTIFIED, spacing: { after: 40, line: 259 },
  children: Array.isArray(t) ? t : [run(t)],
}));
const obs = (t) => new Paragraph({
  alignment: AlignmentType.JUSTIFIED, spacing: { before: 40, after: 100, line: 264 },
  border: { left: { style: BorderStyle.SINGLE, size: 18, color: '2E75B6', space: 6 } },
  shading: { type: ShadingType.CLEAR, fill: 'EEF4FB', color: 'auto' },
  children: [run('Observation: ', { bold: true, color: BLUE }), run(t)],
});

function pngSize(p) {
  const b = fs.readFileSync(p);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}
function fig(name, widthCm, caption) {
  const s = pngSize(FIG(name));
  const wpx = Math.round(widthCm * 37.795);
  const hpx = Math.round((wpx * s.h) / s.w);
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 60, after: 20 },
      children: [new ImageRun({ type: 'png', data: fs.readFileSync(FIG(name)), transformation: { width: wpx, height: hpx },
        altText: { title: name, description: caption, name } })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 100 },
      children: [run(caption, { italics: true, size: 19, color: '444444' })],
    }),
  ];
}
const border = { style: BorderStyle.SINGLE, size: 4, color: 'A6A6A6' };
const borders = { top: border, bottom: border, left: border, right: border };
function cell(text, w, o = {}) {
  return new TableCell({
    width: { size: w, type: WidthType.DXA }, borders,
    shading: o.fill ? { type: ShadingType.CLEAR, fill: o.fill, color: 'auto' } : undefined,
    margins: { top: 35, bottom: 35, left: 80, right: 80 },
    children: [new Paragraph({ alignment: o.align || AlignmentType.LEFT, spacing: { after: 0 },
      children: [new TextRun({ text: String(text), font: SERIF, size: o.size || 19, bold: !!o.bold })] })],
  });
}
function table(headers, rows, widths, o = {}) {
  const total = widths.reduce((a, b) => a + b, 0);
  const trs = [new TableRow({ tableHeader: true, children: headers.map((h, i) => cell(h, widths[i], { fill: 'D9E2F3', bold: true, align: AlignmentType.CENTER })) })];
  rows.forEach((r, ri) => trs.push(new TableRow({
    cantSplit: true,
    children: r.map((c, i) => cell(c, widths[i], { fill: ri % 2 ? 'F7F9FC' : undefined, align: i === 0 || o.leftAll ? AlignmentType.LEFT : AlignmentType.CENTER })),
  })));
  return [
    new Table({ width: { size: total, type: WidthType.DXA }, columnWidths: widths, rows: trs, alignment: AlignmentType.CENTER }),
    new Paragraph({ spacing: { after: 40 }, alignment: AlignmentType.CENTER,
      children: o.caption ? [run(o.caption, { italics: true, size: 19, color: '444444' })] : [] }),
  ];
}
function code(lines, label) {
  const ps = [];
  if (label) ps.push(new Paragraph({ spacing: { before: 40, after: 0 }, keepNext: true, children: [run(label, { bold: true, size: 18, color: BLUE })] }));
  const arr1 = lines.split('\n');
  arr1.forEach((l, i) => ps.push(new Paragraph({
    spacing: { after: 0, line: 220 }, keepLines: true, keepNext: i < arr1.length - 1,
    shading: { type: ShadingType.CLEAR, fill: 'F3F3F3', color: 'auto' },
    border: { left: { style: BorderStyle.SINGLE, size: 12, color: '7F7F7F', space: 4 } },
    children: [new TextRun({ text: l === '' ? ' ' : l, font: MONO, size: 16 })],
  })));
  ps.push(new Paragraph({ spacing: { after: 70 }, children: [] }));
  return ps;
}
const out = (lines, label = 'Output') => {
  const ps = [new Paragraph({ spacing: { before: 0, after: 0 }, keepNext: true, children: [run(label, { bold: true, size: 18, color: '7F6000' })] })];
  const arr2 = lines.split('\n');
  arr2.forEach((l, i) => ps.push(new Paragraph({
    spacing: { after: 0, line: 215 }, keepLines: true, keepNext: i < arr2.length - 1,
    shading: { type: ShadingType.CLEAR, fill: 'FFF8E5', color: 'auto' },
    border: { left: { style: BorderStyle.SINGLE, size: 12, color: 'BF9000', space: 4 } },
    children: [new TextRun({ text: l === '' ? ' ' : l, font: MONO, size: 15 })],
  })));
  ps.push(new Paragraph({ spacing: { after: 70 }, children: [] }));
  return ps;
};
const centered = (t, o = {}) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: o.before || 0, after: o.after ?? 120 },
  children: [new TextRun({ text: t, font: SERIF, size: o.size || 24, bold: o.bold, italics: o.italics, color: o.color })] });

// ---------- data for tables ----------
const miss = TBL('missing_values').slice(1);
const g1 = TBL('groupby_species_mean');
const summ = TBL('univariate_summary');
const outl = TBL('outlier_detection');
const corr = TBL('correlation_pearson_spearman');
const anova = TBL('anova_species');
const models = TBL('model_comparison');
const cmat = TBL('correlation_matrix');
const pcal = TBL('pca_loadings');
const nice = (v) => v.replace(/_mm|_g/g, '').replace(/_/g, ' ');
const pg = (k) => (PAGES[k] !== undefined ? String(PAGES[k]) : '0');

// ---------- cover ----------
const cover = [
  centered('Exploratory Data Analysis and Visualization of the Palmer Penguins Dataset', { size: 32, bold: true, before: 900, after: 300 }),
  centered('A CAPSTONE PROJECT REPORT – ASSIGNMENT II', { size: 24, bold: true, after: 60 }),
  centered('Course: Data Exploration and Visualization', { size: 24, italics: true, after: 420 }),
  centered('Submitted by', { size: 24, italics: true, after: 100 }),
  centered('[REGISTER NUMBER] – DAMASVA', { size: 24, bold: true, after: 420 }),
  centered('in partial fulfillment for the award of the degree', { size: 22, italics: true, bold: true, after: 100 }),
  centered('of', { size: 24, after: 100 }),
  centered('BACHELOR OF TECHNOLOGY', { size: 28, bold: true, after: 60 }),
  centered('in', { size: 24, after: 60 }),
  centered('ARTIFICIAL INTELLIGENCE AND DATA SCIENCE', { size: 26, bold: true, after: 420 }),
  centered('KGiSL INSTITUTE OF TECHNOLOGY', { size: 28, bold: true, after: 280 }),
  centered('ANNA UNIVERSITY: CHENNAI 600 025', { size: 26, bold: true, after: 240 }),
  centered('Submission date: 09.10.2026', { size: 22, after: 60 }),
  centered('GitHub repository: ' + GITHUB, { size: 20, after: 420, color: '1F4E79' }),
  centered('Evaluation Rubrics', { size: 24, bold: true, after: 80 }),
  ...table(['S.No', 'Criteria', 'Total marks', 'Marks Awarded'], [
    ['1', 'Content & Technical Depth', '10', ''], ['2', 'Methodology & Implementation', '10', ''],
    ['3', 'Analysis, Results, & Discussion', '5', ''], ['4', 'Innovation & Creativity', '5', ''],
    ['5', 'Ethical & Societal Impact', '5', ''], ['6', 'Documentation & Presentation', '5', ''], ['', 'Total', '40', ''],
  ], [800, 4400, 1700, 2000]),
  new Paragraph({ children: [new PageBreak()] }),
];

// ---------- TOC ----------
const tocItems = [
  ['Abstract', 0, 'abstract'], ['1  Introduction', 0, 'c1'], ['1.1  Background and Motivation', 1, 's11'], ['1.2  Problem Statement', 1, 's12'],
  ['1.3  Objectives', 1, 's13'], ['1.4  Scope of the Project', 1, 's14'], ['1.5  Dataset Description and Source', 1, 's15'], ['1.6  Literature Survey / Related Work', 1, 's16'],
  ['2  Tools and Techniques', 0, 'c2'], ['2.1  Hardware and Software Requirements', 1, 's21'], ['2.2  Programming Language and Libraries', 1, 's22'], ['2.3  Syllabus Coverage Map', 1, 's23'],
  ['3  Unit 1 – Exploratory Data Analysis', 0, 'c3'], ['3.1  Data Science Process and EDA Approaches', 1, 's31'], ['3.2  Data Loading and Initial Inspection', 1, 's32'],
  ['3.3  Missing Values and Duplicates', 1, 's33'], ['3.4  Encoding and Data Set Slicing', 1, 's34'], ['3.5  Transformation Techniques', 1, 's35'], ['3.6  Grouping Datasets', 1, 's36'],
  ['4  Unit 2 – Visualizing using Matplotlib', 0, 'c4'], ['4.1  Line, Scatter and Error Plots', 1, 's41'], ['4.2  Density, Contour Plots and Histograms', 1, 's42'],
  ['4.3  Legends, Colors, Text and Annotation', 1, 's43'], ['4.4  Subplots', 1, 's44'], ['4.5  Three-Dimensional Plotting', 1, 's45'], ['4.6  Visualization with Seaborn, Plotly and Bokeh', 1, 's46'],
  ['5  Unit 3 – Univariate Analysis', 0, 'c5'], ['5.1  Numerical Variables', 1, 's51'], ['5.2  Skewness and Outliers', 1, 's52'], ['5.3  Categorical Variables', 1, 's53'],
  ['6  Unit 4 – Bivariate Analysis', 0, 'c6'], ['6.1  Numerical vs Numerical', 1, 's61'], ['6.2  Categorical vs Categorical', 1, 's62'], ['6.3  Numerical vs Categorical', 1, 's63'],
  ['7  Unit 5 – Multivariate Analysis and Insights', 0, 'c7'], ['7.1  Pair Plots and Correlation Heatmaps', 1, 's71'], ['7.2  Grouped Visualizations', 1, 's72'],
  ['7.3  Dimensionality Reduction for Visualization', 1, 's73'], ['7.4  Scikit-learn Model Development', 1, 's74'],
  ['8  Results, Key Insights and Discussion', 0, 'c8'], ['9  Ethical and Societal Impact', 0, 'c9'], ['10  Conclusion', 0, 'c10'], ['11  Future Scope', 0, 'c11'],
  ['12  Repository Structure and Reproducibility', 0, 'c12'], ['References', 0, 'refs'],
];
fs.writeFileSync(path.join(__dirname, 'toc_items.json'), JSON.stringify(tocItems));
const toc = [
  centered('TABLE OF CONTENTS', { size: 28, bold: true, after: 160, color: BLUE }),
  ...tocItems.map(([t, lvl, key]) => new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: W, leader: LeaderType.DOT }],
    spacing: { after: lvl ? 50 : 70, before: lvl ? 0 : 50 }, indent: { left: lvl ? 500 : 0 },
    children: [new TextRun({ text: t + '\t' + pg(key), font: SERIF, size: lvl ? 21 : 23, bold: !lvl })],
  })),
  new Paragraph({ children: [new PageBreak()] }),
];

// ---------- body ----------
const body = [];
const add = (...x) => x.flat().forEach((e) => body.push(e));
const marker = (k) => new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: '', size: 2 })], bookmark: undefined });

// Abstract
add(H1('Abstract'));
add(P('Exploratory Data Analysis (EDA) is the process of examining a dataset with summary statistics and visualizations in order to understand its structure, quality and hidden relationships before any formal modelling is attempted. This capstone project applies the complete Data Exploration and Visualization syllabus to the Palmer Penguins dataset, which records bill length, bill depth, flipper length, body mass, sex, island and species for 344 penguins observed at Palmer Station, Antarctica.'));
add(P('The work is organised into the five units of the course. Unit 1 covers the data science process, data loading, inspection, missing values, encoding, slicing, transformation and grouping. Unit 2 demonstrates Matplotlib (line, scatter, error, density, contour, histogram, legend, colour, subplot, annotation and 3-D plots) together with Seaborn, Plotly and Bokeh. Unit 3 performs univariate analysis of numerical and categorical variables. Unit 4 studies bivariate relationships using correlation, cross-tabulation, box and violin plots with statistical tests. Unit 5 explores multivariate structure using pair plots, heatmaps, PCA, t-SNE and scikit-learn classifiers. The analysis shows that body size separates Gentoo from the other species, that bill shape separates Adelie from Chinstrap, and that a simple model classifies species with about 98–99% cross-validated accuracy. All code is provided as a reproducible notebook and published on GitHub.'));

// 1 Introduction
add(H1('1. Introduction'));
add(H2('1.1 Background and Motivation'));
add(P('Raw data rarely arrives in a form that is ready for modelling. It contains missing entries, inconsistent labels, skewed distributions and variables that interact in unexpected ways. John Tukey introduced EDA in 1977 as a philosophy that analysts should look at the data first, using graphics and simple summaries, and let the data suggest which questions and models are worth pursuing. Today EDA is the first and most important stage of every data science workflow, because decisions taken at this stage (how to treat missing values, whether to transform a variable, which features to keep) determine the quality of everything that follows.'));
add(P('Visualization is the main tool of EDA. A well-chosen chart can reveal clusters, trends, outliers and paradoxes that a table of averages would hide. Python provides a rich visualization ecosystem: Matplotlib as the foundational plotting library, Seaborn for statistical graphics, and Plotly and Bokeh for interactive web-based charts. This project uses all of them on a single, well-documented real-world dataset so that every technique in the syllabus can be demonstrated and compared on the same data.'));
add(H2('1.2 Problem Statement'));
add(P('Given a real-world dataset of penguin measurements, the goal is to perform a complete, end-to-end exploratory analysis: assess data quality, clean and transform the data, visualize single variables, pairs of variables and many variables together, extract statistically supported insights, and finally verify those insights by building a simple machine-learning model. The challenge is to show not only how each technique is applied, but also what each technique reveals about the data. For example, the overall relationship between bill length and bill depth is negative, yet it becomes positive inside every individual species (Simpson’s paradox), a conclusion that can only be reached by combining several of the techniques studied in the course.'));
add(H2('1.3 Objectives'));
add(bullets([
  'To select a real dataset, document its source, and inspect its structure, data types and quality (Unit 1).',
  'To clean the data (missing values, duplicates), encode categorical variables, slice, transform and group the data (Unit 1).',
  'To implement the full range of Matplotlib plots and compare them with Seaborn, Plotly and Bokeh (Unit 2).',
  'To analyse single variables (Unit 3), pairs of variables (Unit 4) and many variables at once (Unit 5) using suitable plots and statistics.',
  'To reduce dimensionality for visualization (PCA, t-SNE) and validate the findings with scikit-learn models.',
  'To publish reproducible code on GitHub and document all observations in this report.',
]));
add(H2('1.4 Scope of the Project'));
add(P('The project covers every topic listed in the five units of the Data Exploration and Visualization syllabus. The analysis is restricted to one tabular dataset of 344 observations. Classification is used only as a verification step for the exploratory findings; the project does not aim to build a production model. Interactive Plotly and Bokeh outputs are delivered as HTML files in the repository, while static images of them are embedded in this report where the tool allows.'));
add(H2('1.5 Dataset Description and Source'));
add(P([run('The dataset used is '), B('Palmer Penguins'), run(' (344 rows × 7 columns). It contains body measurements of Adélie, Chinstrap and Gentoo penguins collected between 2007 and 2009 by Dr. Kristen Gorman at Palmer Station, part of the Long Term Ecological Research (LTER) Network. '), B('Source documents: '), run('(i) K. B. Gorman, T. D. Williams and W. R. Fraser, “Ecological sexual dimorphism and environmental variability within a community of Antarctic penguins (genus Pygoscelis),” PLoS ONE 9(3): e90081, 2014; (ii) A. M. Horst, A. P. Hill and K. B. Gorman, palmerpenguins R package, 2020 (allisonhorst.github.io/palmerpenguins); (iii) CSV copy from the seaborn-data repository (github.com/mwaskom/seaborn-data). The file is stored in the repository as data/penguins.csv.')]));
add(...table(['Variable', 'Type', 'Description', 'Values / Range'], [
  ['species', 'Categorical (nominal)', 'Penguin species (target for classification)', 'Adelie, Chinstrap, Gentoo'],
  ['island', 'Categorical (nominal)', 'Island in the Palmer Archipelago', 'Biscoe, Dream, Torgersen'],
  ['bill_length_mm', 'Numerical (continuous)', 'Length of the bill (culmen)', '32.1 – 59.6 mm'],
  ['bill_depth_mm', 'Numerical (continuous)', 'Depth of the bill', '13.1 – 21.5 mm'],
  ['flipper_length_mm', 'Numerical (continuous)', 'Length of the flipper', '172 – 231 mm'],
  ['body_mass_g', 'Numerical (continuous)', 'Body mass', '2700 – 6300 g'],
  ['sex', 'Categorical (binary)', 'Sex of the penguin', 'Female, Male'],
], [1900, 2100, 3338, 2300], { caption: 'Table 1.1 – Data dictionary of the Palmer Penguins dataset', leftAll: true }));
add(H2('1.6 Literature Survey / Related Work'));
add(P('Tukey (1977) established EDA as a distinct discipline from confirmatory (classical) statistics. Anscombe (1973) showed with four artificial datasets that identical summary statistics can hide completely different patterns, which is the motivation for always plotting data. The penguins dataset itself was introduced by Gorman et al. (2014) to study sexual dimorphism, and was proposed by Horst et al. (2020) as a modern, ethically unproblematic alternative to the classic Iris dataset for teaching data exploration. Hunter (2007) created Matplotlib, Waskom (2021) built Seaborn on top of it for statistical graphics, and Plotly and Bokeh extended Python visualization to interactive browser-based charts. This project combines these ideas in one reproducible workflow.'));

// 2 Tools
add(H1('2. Tools and Techniques'));
add(H2('2.1 Hardware and Software Requirements'));
add(...table(['Component', 'Requirement used'], [
  ['Processor / RAM', 'Any modern laptop (Intel Core i5 / AMD Ryzen 5 or better), 8 GB RAM; no GPU required'],
  ['Operating system', 'Windows 10/11 (also runs on Linux and macOS)'],
  ['Python / editor', 'Python 3.9 or later; Visual Studio Code with the Jupyter extension, PowerShell terminal'],
  ['Environment', 'pip virtual environment; dependencies listed in requirements.txt'],
  ['Version control', 'Git and GitHub (repository link on the cover page)'],
], [2400, 7238], { leftAll: true, caption: 'Table 2.1 – Hardware and software' }));
add(H2('2.2 Programming Language and Libraries'));
add(...table(['Category', 'Library', 'Used for'], [
  ['Data handling', 'pandas, NumPy', 'Loading, cleaning, slicing, grouping, pivot tables, transformations'],
  ['Core plotting', 'Matplotlib', 'Line, scatter, error, hexbin, contour, histogram, subplots, 3-D'],
  ['Statistical plots', 'Seaborn', 'KDE, regplot, box, violin, pair plot, heatmap, FacetGrid'],
  ['Interactive plots', 'Plotly, Bokeh', 'Hover, zoom, marginal plots, 3-D interactive scatter (HTML output)'],
  ['Statistics', 'SciPy', 'Pearson/Spearman, chi-square, ANOVA, Tukey HSD, Shapiro-Wilk, t-test'],
  ['Machine learning', 'scikit-learn', 'Encoding, scaling, PCA, t-SNE, classification, cross-validation'],
  ['Notebook', 'Jupyter / nbformat', 'Executable, reproducible analysis notebook'],
], [2000, 2300, 5338], { leftAll: true, caption: 'Table 2.2 – Libraries used in the project' }));
add(H2('2.3 Syllabus Coverage Map'));
add(P('The table below maps every syllabus topic to the section and figure of this report in which it is demonstrated, so that no topic is missing.'));
add(...table(['Unit', 'Syllabus topics', 'Covered in'], [
  ['1 EDA', 'Data science process; EDA vs classical vs Bayesian; goals, process, data types, Python libraries; loading and inspection; missing values; duplicates; encoding; slicing; transformation; grouping', 'Section 3, Figs 3.1–3.3, Tables 3.1–3.2'],
  ['2 Matplotlib', 'Line, scatter, errors, density and contour, histograms, legends, colors, subplots, text and annotation, 3-D plotting, Seaborn, Plotly, Bokeh', 'Section 4, Figs 4.1–4.7'],
  ['3 Univariate', 'Histograms, box plots, density plots, mean/median/SD/quartiles, skewness and outliers; bar charts, pie charts, frequency tables', 'Section 5, Figs 5.1–5.3, Tables 5.1–5.3'],
  ['4 Bivariate', 'Scatter plots, Pearson and Spearman; stacked and grouped bars; box and violin plots across categories', 'Section 6, Figs 6.1–6.3, Tables 6.1–6.2'],
  ['5 Multivariate', 'Pair plots, correlation heatmaps, grouped visualizations, dimensionality reduction, scikit-learn model development', 'Section 7, Figs 7.1–7.6, Tables 7.1–7.3'],
], [1400, 5638, 2600], { leftAll: true, caption: 'Table 2.3 – Mapping of syllabus units to report sections' }));

// 3 Unit 1
add(H1('3. Unit 1 – Exploratory Data Analysis'));
add(H2('3.1 Data Science Process and EDA Approaches'));
add(P('The data science process is iterative: a problem is defined, data is collected and cleaned, EDA is carried out, models are built, and insights are communicated. Findings at the EDA stage often send the analyst back to cleaning, which is why the process is drawn as a loop (Figure 3.1). The goals of EDA are to maximise insight into the dataset, uncover its underlying structure, extract important variables, detect outliers and anomalies, and test underlying assumptions.'));
add(...fig('fig01_data_science_process', 16.5, 'Figure 3.1 – The data science process (iterative)'));
add(...table(['Aspect', 'Classical analysis', 'Bayesian analysis', 'Exploratory data analysis'], [
  ['Sequence', 'Problem → Data → Model → Analysis → Conclusions', 'Problem → Data → Model → Prior → Analysis → Conclusions', 'Problem → Data → Analysis → Model → Conclusions'],
  ['Role of model', 'Imposed before looking at the data', 'Imposed, combined with prior belief', 'Suggested by the data itself'],
  ['Main focus', 'Parameters and hypothesis tests', 'Posterior distributions', 'Patterns, structure, outliers'],
], [1500, 2750, 2750, 2638], { leftAll: true, caption: 'Table 3.1 – EDA compared with classical and Bayesian analysis' }));
add(H2('3.2 Data Loading and Initial Inspection'));
add(P('The CSV file is loaded with pandas and inspected using head(), info() and describe(). The dataset has 344 rows and 7 columns: three categorical features (species, island, sex) and four continuous measurements.'));
add(...code(`df = pd.read_csv('data/penguins.csv')
print(df.shape)            # (344, 7)
df.info(); df.describe()
num_cols = ['bill_length_mm', 'bill_depth_mm', 'flipper_length_mm', 'body_mass_g']`, 'Code – loading and inspection'));
add(...out(`  species     island  bill_length_mm  bill_depth_mm  flipper_length_mm  body_mass_g     sex
0  Adelie  Torgersen            39.1           18.7              181.0       3750.0    Male
1  Adelie  Torgersen            39.5           17.4              186.0       3800.0  Female
2  Adelie  Torgersen            40.3           18.0              195.0       3250.0  Female
3  Adelie  Torgersen             NaN            NaN                NaN          NaN     NaN
4  Adelie  Torgersen            36.7           19.3              193.0       3450.0  Female`, 'Output – df.head()'));
add(H2('3.3 Missing Values and Duplicates'));
add(P('Missing values are quantified per column and visualised with a bar chart and a missing-value map (Figure 3.2). Eleven rows (3.2%) contain at least one missing value; two of them have all four measurements missing, and nine miss only the sex. No duplicate rows were found, and the categorical labels are consistent (no spelling variants).'));
add(...fig('fig02_missing_values', 14.5, 'Figure 3.2 – Missing values per column and missing-value map'));
add(P('Two strategies were compared. Group-wise imputation (median per species for numeric columns, mode per species for sex) changed the column means by less than 0.1% (body mass 4201.75 g → 4202.62 g). Because the number of affected rows is small and imputed values are artificial, the final analysis uses the 333 complete rows, which avoids introducing invented data.'));
add(obs('Missing values are rare (11 rows) and are not concentrated in one variable group, so dropping them is safe. The final clean dataset has 333 rows and 0 missing values.'));
add(H2('3.4 Encoding and Data Set Slicing'));
add(P('Machine-learning algorithms need numbers, so categorical variables were encoded: species by label encoding (Adelie = 0, Chinstrap = 1, Gentoo = 2), sex by binary mapping (Female = 0, Male = 1) and island by one-hot encoding. Slicing was demonstrated with loc, iloc, boolean masks, query() and sample().'));
add(...code(`enc['species_code'] = LabelEncoder().fit_transform(enc['species'])
enc['sex_code'] = enc['sex'].map({'Female': 0, 'Male': 1})
enc = pd.concat([enc, pd.get_dummies(enc['island'], prefix='island', dtype=int)], axis=1)
df_clean.loc[0:4, ['species', 'island', 'body_mass_g']]        # label-based
df_clean.iloc[10:15, 2:5]                                       # position-based
df_clean[(df_clean.species == 'Gentoo') & (df_clean.body_mass_g > 5500)]   # boolean mask`, 'Code – encoding and slicing'));
add(obs('The boolean filter returned the very heavy Gentoo penguins (body mass above 5500 g), and query() showed 61 female Dream-island penguins in the data. The lookup of subsets with loc/iloc/query is the basis of all grouped plots later in the report.'.replace('showed 61 female Dream-island penguins in the data', 'selected the female penguins living on Dream island')));
add(H2('3.5 Transformation Techniques'));
add(P('Four transformations of body mass were compared (Figure 3.3): the original values, a log transform (reduces right skew), z-score standardisation (mean 0, SD 1) and min-max scaling to [0, 1]. Binning with pd.qcut created three balanced classes (Light 113, Medium 110, Heavy 110), and a derived feature, the bill ratio (length ÷ depth), was added.'));
add(...fig('fig03_transformations', 16.5, 'Figure 3.3 – Effect of log, z-score and min-max transformations on body mass'));
add(obs('Scaling transformations change only the units, not the shape of the distribution, while the log transform pulls in the right tail slightly. All four versions remain two-humped because the data mixes small (Adelie, Chinstrap) and large (Gentoo) penguins.'));
add(H2('3.6 Grouping Datasets'));
add(P('groupby(), pivot_table() and crosstab() summarise the data per group (Table 3.2). Gentoo penguins are by far the largest (5092 g, flippers 217 mm) and have the shallowest bills, Chinstrap penguins have the longest bills, and Adelie penguins are the smallest.'));
add(...table(['Species', 'Bill length (mm)', 'Bill depth (mm)', 'Flipper length (mm)', 'Body mass (g)'], g1.slice(1).map((r) => r), [1800, 1950, 1950, 2000, 1938],
  { caption: 'Table 3.2 – Mean measurements per species (groupby)' }));
add(...code(`df_clean.groupby('species')[num_cols].mean().round(2)
df_clean.pivot_table(values='body_mass_g', index='species', columns='island', aggfunc='mean')
pd.crosstab(df_clean.species, df_clean.island, margins=True)`, 'Code – grouping'));
add(...out(`island     Biscoe  Dream  Torgersen  All
Adelie         44     55         47  146
Chinstrap       0     68          0   68
Gentoo        119      0          0  119
All           163    123         47  333`, 'Output – cross-tabulation species × island'));
add(obs('Island and species are strongly linked: Gentoo live only on Biscoe, Chinstrap only on Dream, and Torgersen holds Adelie penguins only. Adelie is the only species present on all three islands, and its mean mass is almost identical on each (about 3700 g).'));

// 4 Unit 2
add(H1('4. Unit 2 – Visualizing using Matplotlib'));
add(H2('4.1 Line, Scatter and Error Plots'));
add(P('Figure 4.1(a) is a simple line plot of mean body mass against flipper length with a 5-point rolling mean (dashed) that smooths the noise. Figure 4.1(b) is a scatter plot where marker colour encodes the species and marker size encodes bill depth. Figure 4.1(c) visualises errors: the thick bars show mean ± 1 standard deviation (spread of the individuals) and the thin bars show the 95% confidence interval of the mean (uncertainty of the estimate).'));
add(...fig('fig04_line_scatter_errorbars', 16.8, 'Figure 4.1 – (a) line plot, (b) scatter plot, (c) error bars'));
add(...code(`ax.plot(s.index, s.values, marker='o', ls='-', label='Mean body mass')
ax.scatter(g.flipper_length_mm, g.body_mass_g, c=PAL[sp], s=g.bill_depth_mm*3, alpha=0.7)
ax.errorbar(xpos, st['mean'], yerr=st['std'], fmt='o', capsize=7)   # ± 1 SD`, 'Code – Matplotlib basics'));
add(obs('Body mass rises almost linearly with flipper length. The standard deviations are 459 g (Adelie), 384 g (Chinstrap) and 501 g (Gentoo), whereas the 95% confidence intervals are only about ±74–91 g. The intervals of Adelie and Chinstrap overlap completely, while Gentoo is clearly separated.'));
add(H2('4.2 Density, Contour Plots and Histograms'));
add(P('A hexbin plot (a) counts observations in hexagonal cells and shows two dense regions. A two-dimensional kernel density estimate (b) is drawn as filled contours: the peaks correspond to the Adelie/Chinstrap group and to Gentoo. Plot (c) overlays histograms with 8, 20 and 40 bins to show how the bin count changes the picture: too few bins hide the two-humped shape and too many produce noise.'));
add(...fig('fig05_density_contour_histogram', 16.8, 'Figure 4.2 – (a) hexbin density, (b) contour plot of a 2-D KDE, (c) effect of bin count on a histogram'));
add(H2('4.3 Legends, Colors, Text and Annotation'));
add(P('Figure 4.3 shows (a) a legend with title, location and shadow, (b) a continuous colour map (plasma) with a colour bar encoding body mass, (c) a stacked histogram with custom colours and (d) text, an arrow annotation pointing to the heaviest penguin (6300 g, Gentoo), a reference line at the mean and a shaded region.'));
add(...fig('fig06_legends_colors_annotation', 12.6, 'Figure 4.3 – Legends, colour mapping, stacked histogram, text and annotation'));
add(...code(`ax.legend(title='Species', loc='upper right', frameon=True, shadow=True)
sc = ax.scatter(x, y, c=df.body_mass_g, cmap='plasma'); fig.colorbar(sc, label='Body mass (g)')
ax.annotate('Heaviest: 6300 g', xy=(221, 6300), xytext=(193, 6150), arrowprops=dict(arrowstyle='->'))
ax.axhline(mean_mass, ls='--'); ax.axvspan(210, 232, alpha=0.1)`, 'Code – legends, colour maps, annotations'));
add(H2('4.4 Subplots'));
add(P('Subplots arrange several axes in one figure. Figure 4.4 uses GridSpec to build a scatter plot with marginal histograms on the top and right; the shared axes (sharex, sharey) keep the histograms aligned with the scatter plot. The marginal histograms make the three groups visible in each single variable.'));
add(...fig('fig07_subplots_gridspec', 11.2, 'Figure 4.4 – GridSpec subplots: scatter plot with marginal histograms'));
add(H2('4.5 Three-Dimensional Plotting'));
add(P('Matplotlib’s mplot3d toolkit draws 3-D scatter plots (Figure 4.5a) and surfaces (4.5b). In 3-D the three species form separate clouds in flipper length, bill length and body mass, and the density surface shows two peaks.'));
add(...fig('fig08_three_dimensional', 16.3, 'Figure 4.5 – (a) 3-D scatter plot of three measurements, (b) 3-D surface of the 2-D density'));
add(H2('4.6 Visualization with Seaborn, Plotly and Bokeh'));
add(P('Seaborn (Figure 4.6) produces statistically informed plots in a single line: scatterplot with hue and style, kdeplot, regplot with confidence band and stacked histplot. Plotly (Figure 4.7) adds hover tooltips, zoom and marginal box/violin plots; the interactive version is stored in outputs/interactive/plotly_scatter.html together with an interactive 3-D scatter. Bokeh was used to build an interactive scatter plot with a HoverTool, saved as outputs/interactive/bokeh_scatter.html (open in any browser).'));
add(...fig('fig09_seaborn', 12.6, 'Figure 4.6 – Seaborn: scatterplot, kdeplot, regplot and stacked histplot'));
add(...fig('fig10_plotly_scatter', 14.2, 'Figure 4.7 – Plotly scatter plot with marginal box and violin plots'));
add(...code(`fig = px.scatter(df_clean, x='flipper_length_mm', y='body_mass_g', color='species', symbol='sex',
                 size='bill_depth_mm', marginal_x='box', marginal_y='violin'); fig.write_html('plotly_scatter.html')
p = figure(width=760, height=480, tools='pan,wheel_zoom,box_zoom,reset,save')
p.scatter('flipper_length_mm', 'body_mass_g', source=src, legend_field='species',
          fill_color=factor_cmap('species', palette, factors))
p.add_tools(HoverTool(tooltips=[('Species', '@species'), ('Mass (g)', '@body_mass_g')]))`, 'Code – Plotly and Bokeh'));
add(obs('Seaborn and Plotly reach the same conclusions as Matplotlib with far less code, and the interactive tools allow a reader to inspect individual penguins by hovering. The marginal box plots in Figure 4.7 confirm that Gentoo flippers are longer than those of the other two species by roughly 20–27 mm on average.'));

// 5 Unit 3
add(H1('5. Unit 3 – Univariate Analysis'));
add(H2('5.1 Numerical Variables'));
add(P('Each numerical variable is analysed alone using histograms with a kernel density estimate, box plots and summary statistics (mean, median, standard deviation, quartiles, IQR). Figure 5.1 marks the mean (dashed red) and median (dotted black) on each histogram.'));
const sr = (name) => summ.find((r) => r[0] === name);
add(...table(['Variable', 'Mean', 'Median', 'Std', 'Q1', 'Q3', 'IQR', 'Skewness', 'Kurtosis'],
  ['bill_length_mm', 'bill_depth_mm', 'flipper_length_mm', 'body_mass_g'].map((n) => {
    const r = sr(n); // header: ,count,mean,median,std,var,min,max,Q1,Q3,IQR,range,skewness,kurtosis
    return [nice(n), r[2], r[3], r[4], r[8], r[9], r[10], r[12], r[13]];
  }), [2200, 880, 880, 880, 880, 880, 880, 1080, 1078], { caption: 'Table 5.1 – Summary statistics of the numerical variables (n = 333)' }));
add(...fig('fig11_univariate_histograms', 13.3, 'Figure 5.1 – Histograms with density curves, mean and median of each measurement'));
add(obs('Mean and median are close for all variables (e.g. 43.99 vs 44.50 for bill length), which indicates near-symmetric distributions. Body mass has the largest spread (SD 805 g, range 2700–6300 g). Every variable has a negative kurtosis (−0.73 to −0.96), meaning the distributions are flatter than normal – a first hint that each variable is a mixture of several groups.'));
add(H2('5.2 Skewness and Outliers'));
add(P('Skewness measures asymmetry. Body mass (0.47) and flipper length (0.36) are slightly right-skewed, bill length (0.05) and bill depth (−0.15) are almost symmetric. Outliers were searched with the 1.5 × IQR rule and with |z| > 3 (Table 5.2). The box plots and Q-Q plots in Figure 5.2 show no points outside the whiskers; the Q-Q plots bend away from the diagonal in the middle, and the Shapiro–Wilk test rejects normality for all variables (p < 0.001).'));
add(...table(['Variable', 'Lower fence', 'Upper fence', 'Outliers (IQR)', 'Outliers (|z|>3)', 'Shapiro p'],
  outl.slice(1).map((r) => [nice(r[0]), r[1], r[2], r[3], r[4], parseFloat(r[5]) < 0.001 ? '< 0.001' : r[5]]),
  [2400, 1400, 1400, 1500, 1638, 1300], { caption: 'Table 5.2 – Outlier detection and normality test' }));
add(...fig('fig12_boxplots_qq', 15.6, 'Figure 5.2 – Box plots (top) and Q-Q plots against the normal distribution (bottom)'));
add(obs('There are no statistical outliers in the dataset, so no rows needed removal. The deviation from normality is not caused by extreme values but by pooling three species with different average sizes.'));
add(H2('5.3 Categorical Variables'));
add(P('Single categorical variables are summarised with frequency tables, bar charts and pie charts (Figure 5.3, Table 5.3). Adelie is the most frequent species (43.8%), Biscoe the most common island (48.9%), and the sexes are almost perfectly balanced (168 male, 165 female).'));
add(...table(['Variable', 'Category', 'Count', 'Percent'], [
  ['species', 'Adelie', '146', '43.8%'], ['', 'Gentoo', '119', '35.7%'], ['', 'Chinstrap', '68', '20.4%'],
  ['island', 'Biscoe', '163', '48.9%'], ['', 'Dream', '123', '36.9%'], ['', 'Torgersen', '47', '14.1%'],
  ['sex', 'Male', '168', '50.5%'], ['', 'Female', '165', '49.5%'],
], [2200, 2800, 2200, 2438], { caption: 'Table 5.3 – Frequency table of the categorical variables' }));
add(...fig('fig13_categorical_bar_pie', 14.2, 'Figure 5.3 – Bar charts and pie charts of species, island and sex'));
add(obs('The class imbalance is moderate (Chinstrap has about half as many penguins as Adelie), which should be remembered when evaluating classifiers. The balanced sex ratio means sex comparisons are not biased by group size.'));

// 6 Unit 4
add(H1('6. Unit 4 – Bivariate Analysis'));
add(H2('6.1 Numerical vs Numerical'));
add(P('Relationships between pairs of numerical variables are explored with scatter plots (Figure 6.1) and with Pearson (linear) and Spearman (rank-based) correlation coefficients (Table 6.1).'));
add(...table(['Variable 1', 'Variable 2', 'Pearson r', 'Spearman ρ', 'p-value (Pearson)'],
  corr.slice(1).map((r) => [nice(r[0]), nice(r[1]), r[2], r[4], r[3]]), [2300, 2300, 1500, 1600, 1938],
  { caption: 'Table 6.1 – Pearson and Spearman correlations between the numerical variables' }));
add(...fig('fig14_scatter_correlation', 16.8, 'Figure 6.1 – Scatter plots with regression lines; (c) shows Simpson’s paradox'));
add(obs('Flipper length and body mass have a strong positive correlation (r = 0.87; ρ = 0.84). Bill depth is negatively correlated with flipper length (−0.58) and mass (−0.47). Most striking is Simpson’s paradox: bill length and depth are negatively correlated overall (r = −0.23), yet positively correlated inside every species (Adelie 0.39, Chinstrap 0.65, Gentoo 0.65). The overall trend is produced by the differences between species, not by the relationship inside a species.'));
add(H2('6.2 Categorical vs Categorical'));
add(P('Two categorical variables are compared with stacked and grouped bar charts (Figure 6.2). A chi-square test of independence between species and island gave χ² = 284.6 (df = 4, p < 10⁻⁵⁰) with Cramér’s V = 0.65, a strong association. Species and sex are independent (χ² = 0.05, p = 0.976).'));
add(...fig('fig15_categorical_bivariate', 16.8, 'Figure 6.2 – (a) stacked bar, (b) grouped bar: species by island; (c) grouped bar: species by sex'));
add(H2('6.3 Numerical vs Categorical'));
add(P('Box plots and violin plots compare the distribution of a numerical variable across categories (Figure 6.3). The violin plots are split by sex so that two categorical variables can be compared at once. A one-way ANOVA tests whether the species means differ (Table 6.2).'));
add(...fig('fig16_box_violin', 16.8, 'Figure 6.3 – Box plots (top) and violin plots split by sex (bottom) across species'));
add(...table(['Variable', 'F statistic', 'p-value', 'η² (effect size)'],
  anova.slice(1).map((r) => [nice(r[0]), r[1], r[2], r[3]]), [3000, 2200, 2200, 2238],
  { caption: 'Table 6.2 – One-way ANOVA of each measurement across species' }));
add(obs('All four measurements differ significantly between species (η² between 0.67 and 0.78); flipper length is the most discriminating (F = 567). Tukey’s HSD test shows that Adelie and Chinstrap do not differ in body mass (p = 0.92), while Gentoo is about 1360–1390 g heavier than both (p < 0.001). Males are heavier than females in every species (overall mean 4546 g vs 3862 g, Welch t = 8.55, p < 10⁻¹⁵), and the violins show that Gentoo males have the widest spread.'));

// 7 Unit 5
add(H1('7. Unit 5 – Multivariate Analysis and Insights'));
add(H2('7.1 Pair Plots and Correlation Heatmaps'));
add(P('A pair plot (scatter matrix, Figure 7.1) shows all pairwise scatter plots and the density of each variable in a single view, coloured by species. Heatmaps of the correlation matrix (Figure 7.2) summarise the strength of all linear relationships at once, overall and within each species.'));
add(...code(`sns.pairplot(df_clean, vars=num_cols, hue='species', palette=PAL, diag_kind='kde')
sns.heatmap(df_clean[num_cols].corr(), annot=True, fmt='.2f', cmap='coolwarm', vmin=-1, vmax=1)
for sp in PAL:                       # one heatmap per species
    sns.heatmap(df_clean[df_clean.species == sp][num_cols].corr(), annot=True, cmap='coolwarm')`, 'Code – pair plot and correlation heatmaps'));
add(...table(['', 'bill length', 'bill depth', 'flipper length', 'body mass'],
  cmat.slice(1).map((r) => [nice(r[0]), r[1], r[2], r[3], r[4]]), [2400, 1800, 1800, 1838, 1800],
  { caption: 'Table 7.1 – Pearson correlation matrix of the four measurements (all penguins)' }));
add(...fig('fig17_pairplot', 12.0, 'Figure 7.1 – Pair plot (scatter matrix) of the four measurements coloured by species'));
add(...fig('fig18_correlation_heatmaps', 12.0, 'Figure 7.2 – Correlation heatmaps: all penguins and each species'));
add(obs('The pair plot shows that Gentoo separates from the rest in almost every panel, while Adelie and Chinstrap separate mainly in bill length. The heatmaps confirm Simpson’s paradox: the bill length–depth cell is negative overall but positive in each species. Within species the flipper–mass correlation is lower (Adelie 0.46, Chinstrap 0.64, Gentoo 0.71) than the overall value of 0.87, because part of the overall correlation comes from the species difference.'));
add(H2('7.2 Grouped Visualizations'));
add(P('Grouped visualizations split a plot by one or more categorical variables. Figure 7.3 shows a grouped box plot (species and sex), a bar plot of mean body mass by island and species with ±SD, and a heatmap of a pivot table. Figure 7.4 uses a Seaborn FacetGrid to draw flipper length against body mass separately for each island (columns) and sex (rows).'));
add(...fig('fig19_grouped_visualizations', 16.8, 'Figure 7.3 – Grouped box plot, grouped bar plot and pivot-table heatmap'));
add(...fig('fig20_facetgrid', 13.0, 'Figure 7.4 – FacetGrid of flipper length vs body mass by island and sex'));
add(obs('In every island/sex panel the same positive trend appears, and males sit higher than females. The FacetGrid also exposes the sampling design: Torgersen contains only Adelie, Biscoe contains Adelie and Gentoo, and Dream contains Adelie and Chinstrap, so island effects cannot be separated from species effects.'));
add(H2('7.3 Dimensionality Reduction for Visualization'));
add(P('Principal Component Analysis (PCA) on the standardised measurements shows that the first component explains 68.6% and the second 19.5% of the variance (88.1% together, 97.3% with three components). PC1 has similar positive loadings on flipper length (0.58), body mass (0.55) and bill length (0.45) and can be read as an overall size axis; PC2 is dominated by bill depth (0.80) and bill length (0.60) and describes bill shape. t-SNE, a non-linear method, was used as a comparison (Figure 7.5).'));
add(...code(`Xs = StandardScaler().fit_transform(df_clean[num_cols])
pca = PCA(n_components=4).fit(Xs); Z = pca.transform(Xs)         # explained_variance_ratio_, components_
tsne = TSNE(n_components=2, perplexity=30, init='pca', random_state=42).fit_transform(Xs)`, 'Code – PCA and t-SNE'));
add(...table(['Component', 'Variance %', 'Cumulative %', 'bill length', 'bill depth', 'flipper length', 'body mass'],
  [0, 1, 2, 3].map((k) => ['PC' + (k + 1), ['68.63', '19.45', '9.22', '2.70'][k], ['68.63', '88.09', '97.30', '100.00'][k],
    pcal[1][k + 1], pcal[2][k + 1], pcal[3][k + 1], pcal[4][k + 1]]),
  [1300, 1300, 1500, 1300, 1300, 1538, 1400], { caption: 'Table 7.2 – PCA explained variance and loadings of each component' }));
add(...fig('fig21_dimensionality_reduction', 13.2, 'Figure 7.5 – Scree plot, PCA loadings, PCA projection and t-SNE projection'));
add(obs('Four dimensions are compressed into two with little loss, and the three species form clearly visible groups: Gentoo separates along PC1 (size), while Adelie and Chinstrap are separated along PC2 (bill shape). The t-SNE map shows the same three clusters, confirming that the structure is real and not an artefact of PCA.'));
add(H2('7.4 Scikit-learn Model Development'));
add(P('To verify that the exploratory findings carry enough information to predict the species, four classifiers were trained on the four measurements plus sex: logistic regression, k-nearest neighbours, SVM (RBF kernel) and random forest. The data were split 75/25 with stratification (249 training, 84 test rows) and compared with 5-fold stratified cross-validation (Table 7.3, Figure 7.6).'));
add(...code(`X = df_clean[num_cols + ['sex']]; X['sex'] = X['sex'].map({'Female': 0, 'Male': 1}); y = df_clean['species']
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.25, stratify=y, random_state=42)
model = make_pipeline(StandardScaler(), LogisticRegression(max_iter=1000))
cross_val_score(model, Xtr, ytr, cv=StratifiedKFold(5, shuffle=True, random_state=42))`, 'Code – scikit-learn pipeline'));
add(...table(['Model', 'CV accuracy (mean)', 'CV std', 'Test accuracy'],
  models.slice(1).map((r) => [r[0], (parseFloat(r[1]) * 100).toFixed(2) + '%', (parseFloat(r[2]) * 100).toFixed(2) + '%', (parseFloat(r[3]) * 100).toFixed(2) + '%']),
  [3600, 2300, 1700, 2038], { caption: 'Table 7.3 – Classification results' }));
add(...fig('fig22_ml_results', 15.2, 'Figure 7.6 – Confusion matrix, random forest feature importance and model comparison'));
add(obs('All models reach about 98–99% cross-validated accuracy; logistic regression and SVM are best (98.79%) and achieve 100% on the 84 test rows. Because the test set is small, the cross-validated figure is the more reliable estimate. Random forest feature importance ranks bill length (0.40) and flipper length (0.29) highest and sex lowest (0.01), which agrees with the ANOVA and PCA findings.'));

// 8 Results
add(H1('8. Results, Key Insights and Discussion'));
add(...table(['#', 'Insight', 'Evidence'], [
  ['1', 'Gentoo penguins are much larger than the other two species.', 'Mean mass 5092 g vs ≈3700 g; ANOVA η² = 0.67; Tukey p < 0.001; PC1 separation'],
  ['2', 'Adelie and Chinstrap are separated by bill shape, not by size.', 'Body-mass difference not significant (p = 0.92); bill length 38.8 vs 48.8 mm; PC2'],
  ['3', 'Bill length vs depth shows Simpson’s paradox.', 'Overall r = −0.23; within species r = +0.39, +0.65, +0.65'],
  ['4', 'Males are heavier than females in every species.', 'Overall 4546 g vs 3862 g (Welch p < 10⁻¹⁵); about 20% for Adelie'],
  ['5', 'Species and island are strongly associated.', 'χ² = 284.6, Cramér’s V = 0.65; Gentoo only on Biscoe, Chinstrap only on Dream'],
  ['6', 'No outliers, but distributions are not normal.', 'IQR and z-score rules find none; kurtosis −0.73 to −0.96; Shapiro p < 0.001'],
  ['7', 'The data are almost linearly separable in four dimensions.', 'Two PCs retain 88.1% variance; classifiers reach 98–99% CV accuracy'],
], [500, 4300, 4838], { leftAll: true, caption: 'Table 8.1 – Summary of the key insights' }));
add(P('The analysis shows how the different techniques complement each other. Univariate plots showed flat, non-normal distributions; bivariate analysis explained this by the presence of subgroups; multivariate analysis and dimensionality reduction then showed those subgroups directly, and the classifiers confirmed that the structure is strong enough for prediction. The project also shows the risk of looking only at overall statistics: the pooled bill length–depth correlation points in the opposite direction from the true within-species relationship.'));

// 9 Ethics
add(H1('9. Ethical and Societal Impact'));
add(P('The dataset contains measurements of wild animals and no personal information, so there are no privacy concerns. The data were collected under the LTER programme and released under a CC0 licence for open use, and the source is cited in this report. Penguin populations are indicators of the health of Antarctic ecosystems; analyses like this one can support monitoring of climate-driven changes in body size and distribution, and sexual-dimorphism studies help conservationists estimate population structure from simple measurements.'));
add(P('The main limitations are: the data cover only three years and one archipelago, so conclusions may not generalise to other colonies or periods; island and species are confounded in the sampling design; 11 rows were removed because of missing values; classes are moderately imbalanced; and the classifier test set is small (84 rows). Conclusions are therefore descriptive and should not be used as the sole basis for conservation decisions. The same exploratory workflow can be reused responsibly on sensitive data only after anonymisation and a check for biased group representation.'));

// 10 Conclusion
add(H1('10. Conclusion'));
add(P('This capstone project applied every topic of the Data Exploration and Visualization syllabus to the Palmer Penguins dataset. Data quality was assessed and repaired (Unit 1), the full Matplotlib toolkit and three further libraries were demonstrated (Unit 2), and single variables (Unit 3), pairs of variables (Unit 4) and the multivariate structure (Unit 5) were analysed with plots and statistical tests. The main findings are that body size distinguishes Gentoo, bill shape distinguishes Adelie from Chinstrap, males are consistently heavier, and the pooled correlations can be misleading (Simpson’s paradox). A simple classifier confirmed the findings with about 98–99% cross-validated accuracy. All code, figures, tables and interactive outputs are available in the GitHub repository.'));

// 11 Future
add(H1('11. Future Scope'));
add(bullets([
  'Extend the analysis to the larger palmerpenguins release (additional years, isotope columns) and test whether the findings are stable.',
  'Build an interactive dashboard (Streamlit or Plotly Dash) so that users can filter by species, island and sex.',
  'Fit multivariate statistical models (MANOVA, linear mixed models) to separate the island effect from the species effect.',
  'Use hyper-parameter tuning, SHAP explanations and probability calibration for the classifier.',
  'Apply the same exploration pipeline to other domains such as healthcare or finance datasets.',
]));

// 12 Repo
add(H1('12. Repository Structure and Reproducibility'));
add(P('The GitHub repository is organised as follows. To reproduce all results, create a virtual environment, install requirements.txt and run the notebook from the project root (python build_notebook.py regenerates the executed notebook; random seeds are fixed).'));
add(...code(`dev-capstone-penguins/
|-- DEV_Capstone_Penguins.ipynb   # executed notebook (all 5 units)
|-- analysis.py                   # same code as a script with cell markers
|-- build_notebook.py             # converts analysis.py -> executed notebook
|-- data/penguins.csv, penguins_clean.csv
|-- figures/                      # 22 PNG figures used in this report
|-- outputs/tables/               # CSV summary tables
|-- outputs/interactive/          # plotly_scatter.html, plotly_3d.html, bokeh_scatter.html
|-- report/                       # report source and the final Word report
|-- requirements.txt, README.md, .gitignore, LICENSE`, 'Repository layout'));
add(P([B('GitHub link: '), run(GITHUB + ' '), run('(replace with your own repository URL after pushing).', { italics: true })]));

// References
add(H1('References'));
add(...[
  '[1] K. B. Gorman, T. D. Williams and W. R. Fraser, “Ecological sexual dimorphism and environmental variability within a community of Antarctic penguins (genus Pygoscelis),” PLoS ONE, vol. 9, no. 3, e90081, 2014.',
  '[2] A. M. Horst, A. P. Hill and K. B. Gorman, “palmerpenguins: Palmer Archipelago (Antarctica) penguin data,” R package, 2020. https://allisonhorst.github.io/palmerpenguins/',
  '[3] M. Waskom, “seaborn-data: data repository for seaborn examples.” https://github.com/mwaskom/seaborn-data',
  '[4] J. W. Tukey, Exploratory Data Analysis. Addison-Wesley, 1977.',
  '[5] F. J. Anscombe, “Graphs in statistical analysis,” The American Statistician, vol. 27, no. 1, pp. 17–21, 1973.',
  '[6] J. D. Hunter, “Matplotlib: A 2D graphics environment,” Computing in Science & Engineering, vol. 9, no. 3, pp. 90–95, 2007.',
  '[7] M. Waskom, “seaborn: statistical data visualization,” Journal of Open Source Software, vol. 6, no. 60, 3021, 2021.',
  '[8] F. Pedregosa et al., “Scikit-learn: Machine learning in Python,” JMLR, vol. 12, pp. 2825–2830, 2011.',
  '[9] Plotly Technologies Inc., Plotly Python documentation, https://plotly.com/python/ ; Bokeh Development Team, Bokeh documentation, https://docs.bokeh.org/',
].map((t) => new Paragraph({ spacing: { after: 50, line: 252 }, indent: { left: 360, hanging: 360 }, alignment: AlignmentType.LEFT, children: [run(t, { size: 20 })] })));

// ---------- document ----------
const doc = new Document({
  creator: 'Damasva', title: 'DEV Capstone Project Report – Palmer Penguins',
  styles: {
    default: { document: { run: { font: SERIF, size: 22 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 29, bold: true, font: SERIF, color: BLUE }, paragraph: { spacing: { before: 200, after: 90 }, outlineLevel: 0,
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '2E75B6', space: 1 } } } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, font: SERIF, color: '2E75B6' }, paragraph: { spacing: { before: 130, after: 60 }, outlineLevel: 1 } },
    ],
  },
  numbering: { config: [{ reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
    style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] }] },
  sections: [{
    properties: { titlePage: true, page: { size: { width: 11906, height: 16838 }, margin: { top: 1000, bottom: 1000, left: 1134, right: 1134, footer: 620 },
      borders: { pageBorders: { display: PageBorderDisplay.ALL_PAGES, offsetFrom: PageBorderOffsetFrom.PAGE, zOrder: PageBorderZOrder.FRONT },
        pageBorderTop: { style: BorderStyle.SINGLE, size: 12, color: '1F4E79', space: 18 }, pageBorderBottom: { style: BorderStyle.SINGLE, size: 12, color: '1F4E79', space: 18 },
        pageBorderLeft: { style: BorderStyle.SINGLE, size: 12, color: '1F4E79', space: 18 }, pageBorderRight: { style: BorderStyle.SINGLE, size: 12, color: '1F4E79', space: 18 } } } },
    footers: {
      first: new Footer({ children: [new Paragraph({ children: [] })] }),
      default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'Page ', font: SERIF, size: 18, color: '666666' }), new TextRun({ children: [PageNumber.CURRENT], font: SERIF, size: 18, color: '666666' })] })] }),
    },
    children: [...cover, ...toc, ...body],
  }],
});
Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(path.join(__dirname, 'DEV_Capstone_Report.docx'), buf); console.log('docx written'); });
