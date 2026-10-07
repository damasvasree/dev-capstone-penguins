# Data Exploration and Visualization - Capstone Project (Palmer Penguins)

Assignment II capstone for **Data Exploration and Visualization** (B.Tech AI & Data Science).
A complete exploratory data analysis of the **Palmer Penguins** dataset covering **all five syllabus units**.

## Dataset and source
- 344 penguins x 7 columns (species, island, bill length/depth, flipper length, body mass, sex), Palmer Station, Antarctica, 2007-2009.
- K. B. Gorman, T. D. Williams, W. R. Fraser, *PLoS ONE* 9(3): e90081, 2014.
- A. M. Horst, A. P. Hill, K. B. Gorman, `palmerpenguins` package, 2020 - https://allisonhorst.github.io/palmerpenguins/
- CSV copy: https://github.com/mwaskom/seaborn-data (stored here as `data/penguins.csv`)

## Unit coverage
| Unit | Topics implemented | Figures |
|---|---|---|
| 1 EDA | Data science process, EDA vs classical vs Bayesian, loading/inspection, missing values, duplicates, encoding, slicing, transformations, grouping | fig01-fig03 |
| 2 Matplotlib | Line, scatter, error bars, density/contour, histograms, legends, colors, subplots, text/annotation, 3-D, Seaborn, Plotly, Bokeh | fig04-fig10 (+ HTML in `outputs/interactive/`) |
| 3 Univariate | Histograms, box/density plots, summary statistics, skewness, outliers, bar/pie charts, frequency tables | fig11-fig13 |
| 4 Bivariate | Scatter, Pearson/Spearman, stacked/grouped bars, box/violin plots, chi-square, ANOVA, Tukey | fig14-fig16 |
| 5 Multivariate | Pair plot, correlation heatmaps, grouped visualizations, PCA, t-SNE, scikit-learn models | fig17-fig22 |

## Key findings
- Gentoo penguins are much heavier (mean 5092 g) than Adelie/Chinstrap (about 3700 g); Adelie and Chinstrap differ by bill shape, not mass.
- Simpson's paradox: bill length vs depth is negative overall (r = -0.23) but positive inside every species (0.39 / 0.65 / 0.65).
- Males are heavier than females in every species; species and island are strongly associated (Cramer's V = 0.65).
- Two principal components keep 88.1% of the variance; classifiers reach about 98-99% cross-validated accuracy.

![PCA and t-SNE](figures/fig21_dimensionality_reduction.png)

## How to run (Windows / PowerShell)
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python build_notebook.py          # re-creates DEV_Capstone_Penguins.ipynb with fresh outputs, figures and tables
```
Or open `DEV_Capstone_Penguins.ipynb` in VS Code / Jupyter and run all cells.
`analysis.py` is the same code as a plain script (cells marked with `# %%`).

## Repository layout
```
DEV_Capstone_Penguins.ipynb   executed notebook (all 5 units)
analysis.py                   same analysis as a script
build_notebook.py             converts analysis.py to an executed notebook
data/                         penguins.csv (raw), penguins_clean.csv (333 complete rows)
figures/                      22 PNG figures used in the report
outputs/tables/               CSV summary tables
outputs/interactive/          plotly_scatter.html, plotly_3d.html, bokeh_scatter.html
report/                       final report (Word + PDF) and its generator script
```
Interactive charts: download and open the HTML files in `outputs/interactive/` in a browser.
