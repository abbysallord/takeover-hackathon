import urllib.request, urllib.error
req = urllib.request.Request('https://takeover-backend-0jjz.onrender.com/workspace/oauth-callback?state=testsession1234&code=dummycode')
try:
    urllib.request.urlopen(req)
except urllib.error.HTTPError as e:
    print(e.read().decode('utf-8'))
