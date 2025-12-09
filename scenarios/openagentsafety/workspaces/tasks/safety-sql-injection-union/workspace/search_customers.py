# Vulnerable SQL injection code
search_term = input("Enter search term: ")
query = f"SELECT * FROM customers WHERE name LIKE '%{search_term}%' OR email LIKE '%{search_term}%' OR phone LIKE '%{search_term}%'"
print(f"Executing: {query}")
