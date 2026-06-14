import os
import json
from parser.evt_parser import parse_event_schedule

def run_test():
    """Parse a .evt file and print the first event/round entry as formatted JSON."""
    test_file_path = "G:\\Other computers\\My Laptop\\Uni\\Diplom\\New folder\\Lynxpad\\parse test\\lynx.evt"

    if not os.path.exists(test_file_path):
        print(f"\n[ERROR] File {test_file_path} not found!")
        print("Make sure the file is in the root directory.\n")
        return

    print(f"\n=== EVT PARSER TEST ===")
    print(f"Reading start lists: {test_file_path}...\n")

    schedule_data = parse_event_schedule(test_file_path)

    print(f"=== TEST RESULTS ===")
    print(f"Successfully read schedule for {len(schedule_data)} event/round combinations.\n")

    if schedule_data:
        print("Detailed structure of the first Event-Round entry:")

        first_key = list(schedule_data.keys())[0]
        first_event = schedule_data[first_key]

        # heats_data contains Pydantic objects; serialize them for JSON output
        serializable_event = {
            "localEventId": first_event["localEventId"],
            "localRoundId": first_event["localRoundId"],
            "eventName": first_event["eventName"],
            "disciplineCode": first_event["disciplineCode"],
            "ageCategory": first_event["ageCategory"].value,
            "heats_data": [heat.model_dump() for heat in first_event["heats_data"]]
        }

        print(json.dumps(serializable_event, indent=4, ensure_ascii=False))

        print("\n[INFO] Check logs (logs/sync_agent.log) for any entries rejected due to invalid licenses.")

if __name__ == "__main__":
    run_test()
