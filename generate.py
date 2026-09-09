import random

# Read addresses from addresses.txt
with open("addresses.txt", "r") as f:
    addresses = f.read().splitlines()

formatted_output = []
for address in addresses:
    address = address.strip()
    if address:
        # Generates a random number with 4 decimal places (e.g., 0.0015)
        rand_val = 0.0010 + (random.random() * 0.001)
        formatted_output.append(f"{address},{rand_val:.4f}")

# Write all formatted pairs to output.csv
with open("output.csv", "w") as f:
    f.write("\n".join(formatted_output))

print(f"Successfully processed {len(formatted_output)} addresses into output.csv")
