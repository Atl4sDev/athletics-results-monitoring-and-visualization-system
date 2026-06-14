import os
import json
from parser.cmp_parser import parse_competition_config
from parser.evt_parser import parse_event_schedule
from parser.schedule_builder import build_schedule_payload

def run_test():
    """Parse .cmp and .evt files and print the first assembled ScheduleItem as formatted JSON."""
    cmp_path = "G:\\Other computers\\My Laptop\\Uni\\Diplom\\New folder\\Lynxpad\\parse test\\lynx.cmp"
    evt_path = "G:\\Other computers\\My Laptop\\Uni\\Diplom\\New folder\\Lynxpad\\parse test\\lynx.evt"

    if not os.path.exists(cmp_path) or not os.path.exists(evt_path):
        print(f"\n[ERROR] Files {cmp_path} or {evt_path} not found in the root folder!")
        return

    print("\n=== 1. PARSING CONFIGURATION (.cmp) ===")
    cmp_dict = parse_competition_config(cmp_path)
    print(f"Filtered running events: {len(cmp_dict)}")

    print("\n=== 2. PARSING START LISTS (.evt) ===")
    evt_dict = parse_event_schedule(evt_path)
    print(f"Heats found in file: {len(evt_dict)}")

    print("\n=== 3. ASSEMBLING PAYLOAD (Contract 1) ===")
    schedule_payload = build_schedule_payload(cmp_dict, evt_dict)
    print(f"Valid ScheduleItems assembled: {len(schedule_payload)}\n")

    if schedule_payload:
        print("Detailed structure of the first ScheduleItem:")
        first_item_json = json.loads(schedule_payload[0].model_dump_json())
        print(json.dumps(first_item_json, indent=4, ensure_ascii=False))

    print("\n[INFO] Test complete.")

if __name__ == "__main__":
    run_test()
