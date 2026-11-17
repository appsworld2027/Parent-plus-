"""Check PR evidence and GitHub reviews. Does not attest that skills were followed."""
import json
import os
import re
import sys
from urllib.request import Request, urlopen


def validate(pr, reviews):
    body = pr.get('body') or ''
    match = re.search(r'^## Skill and review evidence\s*$(.*?)(?=^## |\Z)', body, re.M | re.S | re.I)
    if not match:
        raise ValueError('Missing Skill and review evidence section')
    section = re.sub(r'<!--.*?-->', '', match.group(1), flags=re.S)
    for field in ('Skills', 'Evidence', 'Exceptions'):
        item = re.search(r'^[ \t]*-?[ \t]*' + field + r'[ \t]*:[ \t]*(\S[^\n]*)$', section, re.M | re.I)
        if not item or item.group(1).strip().lower() in ('todo', 'tbd', 'n/a', '...', 'placeholder'):
            raise ValueError(f'Missing or placeholder {field} entry')
    author = pr['user']['login'].lower()
    head = pr['head']['sha']
    latest = {}
    for review in reviews:
        user = (review.get('user') or {}).get('login', '').lower()
        state = review.get('state', '').upper()
        if user and user != author and state in ('APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'):
            latest[user] = review
    if any(r['state'].upper() == 'CHANGES_REQUESTED' for r in latest.values()):
        raise ValueError('An independent reviewer has requested changes')
    if not any(r['state'].upper() == 'APPROVED' and r.get('commit_id') == head for r in latest.values()):
        raise ValueError('An independent approval of the current PR head is required')


def fetch(url, token):
    req = Request(url, headers={'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'parentplus-engineering-gate'})
    with urlopen(req, timeout=30) as response:
        return json.load(response)


def main():
    repo = os.environ['GITHUB_REPOSITORY']
    number = int(os.environ['PR_NUMBER'])
    token = os.environ['GITHUB_TOKEN']
    api = os.environ.get('GITHUB_API_URL', 'https://api.github.com').rstrip('/')
    url = f'{api}/repos/{repo}/pulls/{number}'
    pr = fetch(url, token)
    if pr['head']['sha'] != os.environ['EXPECTED_HEAD_SHA']:
        raise ValueError('PR head does not match the triggering event')
    reviews = []
    for page in range(1, 101):
        batch = fetch(f'{url}/reviews?per_page=100&page={page}', token)
        reviews.extend(batch)
        if len(batch) < 100:
            break
    else:
        raise ValueError('Review pagination limit exceeded')
    validate(pr, reviews)
    if fetch(url, token)['head']['sha'] != pr['head']['sha']:
        raise ValueError('PR head changed during review check')
    print('PASS: task evidence is present and a non-author approved the current PR head; review content still requires human assessment')


if __name__ == '__main__':
    try:
        main()
    except (KeyError, ValueError, OSError) as error:
        print(f'FAIL engineering review gate: {error}', file=sys.stderr)
        sys.exit(1)
