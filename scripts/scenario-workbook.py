#!/usr/bin/env python3
"""Builds testing/workbooks/<slug>.xlsx from docs/product/<slug>/SCENARIOS.csv using the testing/test-matrix.xlsx columns.
Usage: python3 scripts/scenario-workbook.py <slug> [<slug> ...]   (no slug = every feature with a SCENARIOS.csv)"""
import csv, glob, os, sys, collections
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.worksheet.datavalidation import DataValidation

TEMPLATE = 'testing/test-matrix.xlsx'
STATUSES = ['PASS', 'FAIL', 'BLOCKED', 'NOT RUN', 'NOT APPLICABLE']
COLORS = {'PASS': 'C6EFCE', 'FAIL': 'FFC7CE', 'BLOCKED': 'FFC7CE', 'NOT RUN': 'D9D9D9', 'NOT APPLICABLE': 'EDEDED'}

def build(slug):
    src = f'docs/product/{slug}/SCENARIOS.csv'
    rows = list(csv.DictReader(open(src, encoding='utf-8')))
    header = [c.value for c in openpyxl.load_workbook(TEMPLATE).active[1]]
    for r in rows:
        missing = [h for h in header if h not in r]
        if missing: sys.exit(f'{src}: missing columns {missing}')
        if r['status'] not in STATUSES: sys.exit(f"{src}: bad status {r['status']} for {r['test_id']}")
    wb = openpyxl.Workbook(); ws = wb.active; ws.title = 'Test Matrix'
    ws.append(header)
    for r in rows: ws.append([r[h] for h in header])
    head = PatternFill('solid', fgColor='1F3864')
    for c in ws[1]: c.font = Font(bold=True, color='FFFFFF'); c.fill = head; c.alignment = Alignment(wrap_text=True, vertical='center')
    widths = dict(zip(header, [12, 38, 18, 30, 44, 28, 40, 34, 36, 12, 10, 26, 12, 12]))
    for i, h in enumerate(header, 1): ws.column_dimensions[openpyxl.utils.get_column_letter(i)].width = widths.get(h, 16)
    status_col = header.index('status') + 1
    for row in ws.iter_rows(min_row=2):
        for c in row: c.alignment = Alignment(wrap_text=True, vertical='top')
        s = row[status_col - 1]; s.fill = PatternFill('solid', fgColor=COLORS[s.value]); s.font = Font(bold=True)
    ws.freeze_panes = 'A2'; ws.auto_filter.ref = ws.dimensions
    dv = DataValidation(type='list', formula1='"' + ','.join(STATUSES) + '"', allow_blank=False)
    ws.add_data_validation(dv); L = openpyxl.utils.get_column_letter(status_col); dv.add(f'{L}2:{L}{len(rows) + 200}')

    sm = wb.create_sheet('Summary')
    by_status = collections.Counter(r['status'] for r in rows); by_type = collections.defaultdict(collections.Counter)
    for r in rows: by_type[r['test_type']][r['status']] += 1
    sm.append([f'Feature: {slug}']); sm['A1'].font = Font(bold=True, size=14)
    sm.append(['Scenarios', len(rows)])
    sm.append(['Passed', by_status['PASS']]); sm.append(['Failed', by_status['FAIL']]); sm.append(['Blocked', by_status['BLOCKED']])
    sm.append(['Not run', by_status['NOT RUN']]); sm.append(['Not applicable', by_status['NOT APPLICABLE']])
    ran = by_status['PASS'] + by_status['FAIL']
    sm.append(['Pass rate of scenarios actually run', f"{by_status['PASS']}/{ran}" if ran else 'Unknown'])
    sm.append([]); sm.append(['Test type'] + STATUSES)
    for c in sm[sm.max_row]: c.font = Font(bold=True)
    for t, cnt in sorted(by_type.items()): sm.append([t] + [cnt[s] for s in STATUSES])
    sm.append([]); sm.append(['Rule: only executed scenarios with evidence are PASS. NOT RUN is never counted as a pass.'])
    sm.column_dimensions['A'].width = 40

    os.makedirs('testing/workbooks', exist_ok=True)
    out = f'testing/workbooks/{slug}.xlsx'; wb.save(out)
    print(out, dict(by_status))

slugs = sys.argv[1:] or [os.path.basename(os.path.dirname(p)) for p in glob.glob('docs/product/*/SCENARIOS.csv')]
for s in slugs: build(s)
