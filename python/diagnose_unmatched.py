import csv
from collections import Counter
import os

BASE_DIR = r'd:\DESENVOLVIMENTO\revalya-oficial\python'
PATH = os.path.join(BASE_DIR, 'contratos_unmatched_final.csv')

def main():
    counts = Counter()
    reasons = Counter()
    rows = 0
    examples = []
    with open(PATH, newline='', encoding='utf-8') as f:
        r = csv.DictReader(f)
        for row in r:
            rows += 1
            reasons[row['reason']] += 1
            digits = row['cnpj_digits'] or ''
            counts[len(digits)] += 1
            if len(examples) < 10:
                examples.append((row['row'], row['cnpj_raw'], row['cnpj_digits'], row['reason']))
    print('Total unmatched:', rows)
    print('Reasons:', dict(reasons))
    print('Length distribution:', dict(counts))
    print('Examples:', examples)

if __name__ == '__main__':
    main()