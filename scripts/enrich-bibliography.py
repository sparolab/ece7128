"""Enrich exact-title matches only; retain per-paper metadata provenance.
Run manually from repository root. Public bibliographic API reads, no credentials.
"""
import concurrent.futures, html, json, re, subprocess, unicodedata, urllib.parse
from pathlib import Path
from datetime import date

def norm(s):
    return re.sub(r'[^a-z0-9]', '', unicodedata.normalize('NFKD', s).encode('ascii','ignore').decode().lower())

def get(url):
    r=subprocess.run(['curl','-fsS','--retry','1','--max-time','25',url],capture_output=True,text=True)
    if r.returncode: return {}
    try: return json.loads(r.stdout)
    except ValueError: return {}

def unique(xs): return list(dict.fromkeys(html.unescape(x.strip()) for x in xs if x and x.strip()))
catalog=json.loads(Path('site/catalog.json').read_text())
submitted=json.loads(Path('data/submissions.json').read_text())
out=Path('site/bibliography.json')
existing=json.loads(out.read_text()) if out.exists() else {}

def enrich(p):
    if p['id'] in existing: return p['id'],existing[p['id']]
    title=p['title']; year=p['year']; sources=[]
    cr=get('https://api.crossref.org/works?'+urllib.parse.urlencode({'query.title':title,'rows':5,'filter':f'from-pub-date:{year-1},until-pub-date:{year+1}'}))
    matches=[w for w in cr.get('message',{}).get('items',[]) if any(norm(t)==norm(title) for t in w.get('title',[]))]
    w=matches[0] if matches else {}
    doi=w.get('DOI')
    if doi:
        sources.append('https://api.crossref.org/works/'+urllib.parse.quote(doi,safe='/'))
        oa=get('https://api.openalex.org/works/https://doi.org/'+urllib.parse.quote(doi,safe='/'))
    else:
        result=get('https://api.openalex.org/works?'+urllib.parse.urlencode({'filter':'title.search:'+title,'per-page':5}))
        oa=next((a for a in result.get('results',[]) if norm(a.get('display_name',''))==norm(title) and abs(a.get('publication_year',0)-year)<=1),{})
    if norm(oa.get('display_name',''))!=norm(title): oa={}
    if oa.get('id'): sources.append(oa['id'])
    authors=unique([' '.join(filter(None,[a.get('given'),a.get('family')])) or a.get('name','') for a in w.get('author',[])])
    if not authors: authors=unique([a.get('author',{}).get('display_name','') for a in oa.get('authorships',[])])
    affiliations=unique([i.get('display_name','') for a in oa.get('authorships',[]) for i in a.get('institutions',[])]+[i.get('name','') for a in w.get('author',[]) for i in a.get('affiliation',[])])
    aliases=unique([a.get('author',{}).get('display_name','') for a in oa.get('authorships',[])]+[s for a in oa.get('authorships',[]) for s in a.get('raw_affiliation_strings',[])])
    if not authors and not affiliations: return p['id'],None
    return p['id'],{'authors':authors,'affiliations':affiliations,'metadataAliases':aliases,'metadataSources':sources,'doi':doi or oa.get('doi',''),'metadataRetrieved':date.today().isoformat()}

allpapers=catalog['papers']+submitted['papers']
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    for i,(pid,record) in enumerate(pool.map(enrich,allpapers),1):
        if record: existing[pid]=record
        if i%20==0:
            out.write_text(json.dumps(existing,ensure_ascii=False,indent=2)+'\n')
            print(f'{i}/{len(allpapers)} checked; {len(existing)} matched',flush=True)
out.write_text(json.dumps(existing,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'papers':len(allpapers),'authors':sum(bool(x['authors']) for x in existing.values()),'affiliations':sum(bool(x['affiliations']) for x in existing.values())}),flush=True)
