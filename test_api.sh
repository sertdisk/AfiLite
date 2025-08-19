#!/bin/bash

# Test balance endpoint
echo "Testing /api/balance/admin-summary/summary:"
curl -s http://localhost:5003/api/balance/admin-summary/summary -H "Cookie: jwt_admin=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiYWRtaW5AYWZpLmNvbSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1NTYzNzc0NSwiZXhwIjoxNzU1NjM4NjQ1fQ.-H1cQmFLfHkjsuNH_F1qMSXH7ss9pJYozzKPTZzrBEY"

# Test influencers endpoint
echo -e "\n\nTesting /api/influencers:"
curl -s http://localhost:5003/api/influencers -H "Cookie: jwt_admin=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiYWRtaW5AYWZpLmNvbSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1NTYzNzc0NSwiZXhwIjoxNzU1NjM4NjQ1fQ.-H1cQmFLfHkjsuNH_F1qMSXH7ss9pJYozzKPTZzrBEY"

# Test sales endpoint
echo -e "\n\nTesting /api/sales?limit=20:"
curl -s http://localhost:5003/api/sales?limit=20 -H "Cookie: jwt_admin=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiYWRtaW5AYWZpLmNvbSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1NTYzNzc0NSwiZXhwIjoxNzU1NjM4NjQ1fQ.-H1cQmFLfHkjsuNH_F1qMSXH7ss9pJYozzKPTZzrBEY"