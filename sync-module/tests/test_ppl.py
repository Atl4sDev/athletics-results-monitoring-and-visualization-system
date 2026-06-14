import os
from parser.ppl_parser import parse_athletes_registry

def run_test():
    """Parse a .ppl file and print the first three validated athlete records."""
    test_file_path = "G:\\Other computers\\My Laptop\\Uni\\Diplom\\New folder\\Lynxpad\\parse test\\lynx.ppl"

    if not os.path.exists(test_file_path):
        print(f"\n[ERROR] File {test_file_path} not found!")
        print("Place the test file next to the script or provide a full path.\n")
        return

    print(f"\n=== PPL PARSER TEST ===")
    print(f"Reading file: {test_file_path}...")

    athletes = parse_athletes_registry(test_file_path)

    print(f"\n=== TEST RESULTS ===")
    print(f"Parsed and validated: {len(athletes)} athletes")

    if athletes:
        print("\nFirst 3 valid records (field mapping check):")
        for i, athlete in enumerate(athletes[:3], start=1):
            print(f"{i}. Name: {athlete.lastName} {athlete.firstName} | Gender: {athlete.gender.value} | License: {athlete.license} | DOB: {athlete.birthDate}")

    print("\n[INFO] Check 'logs/sync_agent.log' to see any rejected invalid records.")

if __name__ == "__main__":
    run_test()
