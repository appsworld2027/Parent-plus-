#!/usr/bin/env python3
"""Rebuilds testing/qa-scenarios.xlsx from testing/qa-scenarios.csv (all rows + one sheet per product area)."""
import csv, openpyxl, re
from openpyxl.styles import Font, PatternFill, Alignment
rows = list(csv.reader(open('testing/qa-scenarios.csv', encoding='utf-8')))
head, data = rows[0], rows[1:]
wb = openpyxl.Workbook(); colors = {'Pass': 'C6EFCE', 'Not run': 'D9D9D9', 'Fail': 'FFC7CE', 'Blocked': 'FFC7CE'}
def sheet(ws, items):
    ws.append(head)
    for c in ws[1]: c.font = Font(bold=True, color='FFFFFF'); c.fill = PatternFill('solid', fgColor='305496')
    for r in items:
        ws.append(r)
        fill = colors.get(r[9]); 
        if fill: ws.cell(ws.max_row, 10).fill = PatternFill('solid', fgColor=fill)
    for i, w in enumerate([9, 28, 14, 24, 22, 60, 50, 8, 11, 9, 40, 8, 30], 1): ws.column_dimensions[openpyxl.utils.get_column_letter(i)].width = w
    for row in ws.iter_rows(min_row=2):
        for c in row: c.alignment = Alignment(wrap_text=True, vertical='top')
    ws.freeze_panes = 'A2'; ws.auto_filter.ref = ws.dimensions
sheet(wb.active, data); wb.active.title = 'All scenarios'
areas = {}
for r in data: areas.setdefault(r[1], []).append(r)
for area, items in areas.items(): sheet(wb.create_sheet(re.sub(r'[\[\]:*?/\\]', '-', area)[:31]), items)
summ = wb.create_sheet('Summary', 0); summ.append(['Product area', 'Total', 'Pass', 'Not run', 'Fail']); 
for c in summ[1]: c.font = Font(bold=True)
for area, items in areas.items():
    res = [r[9] for r in items]; summ.append([area, len(items), res.count('Pass'), res.count('Not run'), res.count('Fail') + res.count('Blocked')])
summ.column_dimensions['A'].width = 42
wb.save('testing/qa-scenarios.xlsx'); print('saved', len(data), 'scenarios,', len(areas), 'areas')
