import os
import json
from parser.cmp_parser import parse_competition_config

def run_test():
    """Parse a .cmp file and print the first two events as formatted JSON."""
    test_file_path = "G:\\Other computers\\My Laptop\\Uni\\Diplom\\New folder\\Lynxpad\\parse test\\lynx.cmp"

    if not os.path.exists(test_file_path):
        print(f"\n[ERROR] File {test_file_path} not found!")
        return

    print(f"\n=== CMP PARSER TEST ===")
    print(f"Reading and structuring: {test_file_path}...\n")

    events_config = parse_competition_config(test_file_path)

    print(f"=== TEST RESULTS ===")
    print(f"Filtered and saved: {len(events_config)} running events\n")

    if events_config:
        print("Structure of the first 2 valid events:")
        first_two_events = {k: events_config[k] for k in list(events_config.keys())[:2]}
        print(json.dumps(first_two_events, indent=4, ensure_ascii=False))

if __name__ == "__main__":
    run_test()
