#!/usr/bin/env python3
import subprocess
import time
import sys
import os

try:
    import urllib.request
    import json
except ImportError:
    print("Standard python libraries not found. Exiting.")
    sys.exit(1)

PORT = 8009
BASE_URL = f"http://127.0.0.1:{PORT}"

def make_request(path, method="GET", data=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    req_data = json.dumps(data).encode("utf-8") if data else None
    
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as res:
            return res.status, json.loads(res.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        try:
            err_body = json.loads(e.read().decode("utf-8"))
        except Exception:
            err_body = str(e)
        return e.code, err_body
    except Exception as e:
        return 0, str(e)

def print_result(step_name, success, info=""):
    color = "\033[92m[PASS]\033[0m" if success else "\033[91m[FAIL]\033[0m"
    print(f"{color} {step_name:<40} {info}")

def main():
    print("=" * 80)
    print("         AI SALES OPERATIONS MANAGER - BACKEND INTEGRATION TEST SUITE")
    print("=" * 80)
    
    # 1. Start backend server
    print("\n[1/7] Launching FastAPI backend server on port 8009...")
    env = os.environ.copy()
    env["DATABASE_URL"] = "sqlite:///./takeover_test.db"
    env["PYTHONUNBUFFERED"] = "1"
    
    # Clean old test db
    if os.path.exists("takeover_test.db"):
        os.remove("takeover_test.db")
        
    server_log = open("test_server.log", "w", buffering=1)
    server_process = subprocess.Popen(
        ["venv/bin/python", "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", str(PORT)],
        stdout=server_log,
        stderr=server_log,
        env=env
    )
    
    # Wait for server to boot up (including loading sentence-transformer RAG model weights)
    print("Waiting for server to start...")
    booted = False
    for i in range(30):
        if server_process.poll() is not None:
            break
        status, body = make_request("/health")
        if status == 200 and isinstance(body, dict) and body.get("status") == "ok":
            booted = True
            break
        time.sleep(1)
        
    if not booted or server_process.poll() is not None:
        print("\033[91m[ERROR] Failed to start backend server. Make sure dependencies are installed and port 8009 is free.\033[0m")
        # print stderr
        with open("test_server.log", "r") as f:
            print(f.read())
        sys.exit(1)
        
    print_result("Server Startup", True, f"PID: {server_process.pid} listening on {BASE_URL}")

    try:
        # 2. Test Health Endpoint
        status, body = make_request("/health")
        print(f"DEBUG: status={status}, body={body}, type={type(body)}")
        health_ok = status == 200 and isinstance(body, dict) and body.get("status") == "ok"
        service_name = body.get('service', 'unknown') if isinstance(body, dict) else str(body)
        print_result("GET /health", health_ok, f"Status: {status}, Service: {service_name}")

        # 3. Test Dashboard Overview (Initial seeded state)
        status, body = make_request("/dashboard")
        db_ok = status == 200 and "stats" in body
        stats = body.get("stats", {}) if db_ok else {}
        print_result("GET /dashboard", db_ok, 
                     f"Workflows: {stats.get('total_workflows')}, "
                     f"Pending Approvals: {stats.get('pending_approvals')}, "
                     f"Revenue: ${stats.get('total_revenue') or 0.0:,.2f}")

        # 4. Simulate a New Inbound Email Enquiry
        print("\n[4/7] Simulating inbound customer email from Tony Stark...")
        email_payload = {
            "sender": "tony@starkindustries.com",
            "recipient": "sales@company.com",
            "subject": "Requesting 120 units of Widget-B",
            "body": "Hi, Stark Industries needs to place a bulk order of 120 units of Widget B. Can you provide price quotes and shipping times? Best, Tony."
        }
        status, workflow = make_request("/workflows/simulate", method="POST", data=email_payload)
        
        sim_ok = status == 201 and workflow.get("status") == "PENDING_APPROVAL"
        wf_id = workflow.get("id")
        current_stage = workflow.get("current_stage")
        print_result("POST /workflows/simulate (Tony Stark)", sim_ok, 
                     f"Workflow ID: {wf_id}, Status: {workflow.get('status')}, Stage: {current_stage}")

        # Validate that workflow steps were written correctly
        steps = workflow.get("steps", [])
        print(f"      -> Generated {len(steps)} steps up to approval gate:")
        for step in steps:
            print(f"         - {step['stage']:<25} : {step['status']}")

        # 5. Check updated dashboard stats
        status, body = make_request("/dashboard")
        stats = body.get("stats", {})
        print_result("Verify Dashboard Updates", stats.get("pending_approvals") == 2, 
                     f"Pending approvals increased to: {stats.get('pending_approvals')}")

        # 6. Retrieve Pending Approval
        status, approvals = make_request("/approvals?status_filter=pending")
        matching_approvals = [a for a in approvals if a["workflow_id"] == wf_id]
        app_id = matching_approvals[0]["id"] if matching_approvals else None
        print_result("Find Pending Approval ID", app_id is not None, f"Approval ID: {app_id}")

        if app_id:
            # 7. Approve the Quotation
            print(f"\n[7/7] Submitting approval for Quotation in Workflow #{wf_id}...")
            approval_payload = {
                "status": "APPROVED",
                "approver": "Pepper Potts (Acting Manager)",
                "notes": "Approved. Stark Industries pricing approved under standard bulk discount rules."
            }
            status, approval_res = make_request(f"/approvals/{app_id}", method="POST", data=approval_payload)
            approve_ok = status == 200 and approval_res.get("status") == "APPROVED"
            print_result("POST /approvals/{id} (Approved)", approve_ok, f"Status: {approval_res.get('status')}")

            # 8. Verify Workflow Completed successfully (wait for background tasks to finish)
            print("Waiting for workflow to complete...")
            wf_final_ok = False
            for _ in range(40):
                status, workflow_final = make_request(f"/workflows/{wf_id}")
                if status == 200:
                    current_status = workflow_final.get("status")
                    if current_status in ("COMPLETED", "FAILED"):
                        wf_final_ok = current_status == "COMPLETED"
                        break
                time.sleep(1)
            print_result("Verify Workflow Completed", wf_final_ok, f"Final Status: {workflow_final.get('status')}")
            if not wf_final_ok:
                print(f"DEBUG WORKFLOW RESPONSE: {json.dumps(workflow_final, indent=2)}")
            
            # 8b. Verify Workflow Trace
            status, trace = make_request(f"/workflows/{wf_id}/trace")
            trace_ok = status == 200 and len(trace) > 0
            print_result("GET /workflows/{id}/trace", trace_ok, f"Steps in trace: {len(trace)}")
            
            # 8c. Verify Workflow Reasoning
            status, reasoning = make_request(f"/workflows/{wf_id}/reasoning")
            reasoning_ok = status == 200 and len(reasoning) > 0
            print_result("GET /workflows/{id}/reasoning", reasoning_ok, f"Steps with reasoning: {len(reasoning)}")
            
            # Print steps of resumed workflow
            final_steps = workflow_final.get("steps", [])
            print(f"      -> Final steps executed after approval:")
            for step in final_steps[6:]:
                print(f"         - {step['stage']:<25} : {step['status']}")

        # 9. Test Analytics Output
        status, analytics = make_request("/analytics")
        analytics_ok = status == 200 and "automation_rate" in analytics
        print_result("GET /analytics", analytics_ok, 
                     f"Automation Rate: {analytics.get('automation_rate'):.1f}%, "
                     f"Top Product: {analytics.get('top_products', [{}])[0].get('product', 'none')}")

    finally:
        print("\nCleaning up test environment...")
        server_process.terminate()
        server_process.wait()
        
        try:
            server_log.close()
        except Exception:
            pass
            
        # Clean test files
        if os.path.exists("takeover_test.db"):
            os.remove("takeover_test.db")
            
        print("Test server stopped and database removed.")
        print("=" * 80)

if __name__ == "__main__":
    main()
