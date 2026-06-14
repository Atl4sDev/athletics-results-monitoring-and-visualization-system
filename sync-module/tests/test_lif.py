import os
import json
from parser.lif_parser import parse_lif_file

def run_test():
    """Parse a .lif file and print the resulting ResultsSyncPayload as formatted JSON."""
    test_file_path = "lynx.lif"

    if not os.path.exists(test_file_path):
        print(f"\n[ERROR] File {test_file_path} not found!")
        return

    print(f"\n=== LIF PARSER TEST ===")
    print(f"Reading results: {test_file_path}...\n")

    payload = parse_lif_file(test_file_path)

    if payload:
        print("=== TEST RESULTS ===")
        print("Successfully built ResultsSyncPayload (Contract 2)!\n")

        payload_dict = json.loads(payload.model_dump_json())
        print(json.dumps(payload_dict, indent=4, ensure_ascii=False))
    else:
        print("\n[ERROR] Parser returned None. Check the logs.")

if __name__ == "__main__":
    run_test()
