import subprocess, json
result = subprocess.run(
    ['safety', 'check', '-r', 'C:/Users/Ankit Kumar/Desktop/req_vuln.txt', '--json'],
    capture_output=True, text=True, timeout=60
)
data = json.loads(result.stdout)
vulns = data.get('vulnerabilities', [])
print('Total vulns:', len(vulns))
if vulns:
    print('First vuln:', vulns[0].get('package_name'), vulns[0].get('CVE'))