import requests

url = "http://localhost:8000/settings/api-keys/test"
headers = {
    "Authorization": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwidWlkIjoiYjA2ZjQ1MjgtODU4My00NmNkLTgxZjItNDJmOTg3YmY0MGNjIiwiZW1haWwiOiJwcmFkaGFuYXNod2FyeWEwODExQGdtYWlsLmNvbSIsImlhdCI6MTc4MTgyNDA2OSwiZXhwIjoxNzgxODI0OTY5LCJ0eXBlIjoiYWNjZXNzIiwianRpIjoiMzg4OWE4OWMtOWMyOS00NzRkLTg4MjItNmRhMjczZGEyYmZiIn0.DD3cw812RLlGrqRP6gydarTT_DgOEFfiyg7qcHOtb_c",  # Replace with a valid JWT
    "Content-Type": "application/json"
}
payload = {
    "provider": "anthropic",
    "api_key": "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"   # Replace with the real key to test
}

response = requests.post(url, headers=headers, json=payload)
print(response.status_code)
print(response.json())