from datetime import datetime, timedelta
import json
from sqlalchemy.orm import Session
from app.models.models import (
    Customer,
    Lead,
    Email,
    Workflow,
    WorkflowStep,
    Quotation,
    Approval,
    Notification,
)


def seed_database(db: Session) -> None:
    """Seeds the SQLite database with realistic mock data if tables are empty.

    Uses dynamic dates to prevent hardcoded time dependency failures.
    """
    # Safeguard to prevent duplicating seed runs if user is already onboarded
    from app.models.models import Workspace
    if db.query(Workspace).first() is not None:
        return

    if db.query(Customer).first() is not None:
        return

    now = datetime.now()

    # 1. Customers
    cust1 = Customer(
        name="Sarah Connor",
        email="sarah.connor@cyberdyne.com",
        company="Cyberdyne Systems",
        created_at=now - timedelta(days=10),
    )
    cust2 = Customer(
        name="Bruce Wayne",
        email="bruce@waynecorp.com",
        company="Wayne Enterprises",
        created_at=now - timedelta(days=8),
    )
    cust3 = Customer(
        name="Tony Stark",
        email="tony@starkindustries.com",
        company="Stark Industries",
        created_at=now - timedelta(days=5),
    )
    cust4 = Customer(
        name="Selina Kyle",
        email="selina@kyle-solutions.com",
        company="Kyle Solutions",
        created_at=now - timedelta(days=3),
    )

    db.add_all([cust1, cust2, cust3, cust4])
    db.commit()

    # 2. Emails (Inbound enquiries and replies)
    email1 = Email(
        message_id="msg_sarah_1@mail.cyberdyne.com",
        sender="sarah.connor@cyberdyne.com",
        recipient="sales@company.com",
        subject="Request for Bulk Widget-A Pricing",
        body="Hello, Cyberdyne Systems is looking to procure 500 units of Widget-A for our upcoming project. Please send us a quote and confirm shipping timeline. Regards, Sarah.",
        direction="INBOUND",
        received_at=now - timedelta(days=5),
    )

    email2 = Email(
        message_id="msg_bruce_1@mail.waynecorp.com",
        sender="bruce@waynecorp.com",
        recipient="sales@company.com",
        subject="Procurement: Server Racks",
        body="Dear Team, We need to upgrade our Batcave servers. Please provide quotation details for 5 Server Racks as soon as possible. Thank you, Bruce Wayne.",
        direction="INBOUND",
        received_at=now - timedelta(hours=18),
    )

    email3 = Email(
        message_id="msg_tony_1@mail.starkindustries.com",
        sender="tony@starkindustries.com",
        recipient="sales@company.com",
        subject="Urgent order for Widget-B",
        body="I need 120 units of Widget-B. Ship them immediately. Send the invoice to Pepper. - Tony Stark",
        direction="INBOUND",
        received_at=now - timedelta(minutes=45),
    )

    email4 = Email(
        message_id="msg_selina_1@mail.kyle-solutions.com",
        sender="selina@kyle-solutions.com",
        recipient="sales@company.com",
        subject="Quote Request for Widget-C",
        body="Hi, can we get a quote for 25 units of Widget-C? Thanks, Selina.",
        direction="INBOUND",
        received_at=now - timedelta(days=2),
    )

    db.add_all([email1, email2, email3, email4])
    db.commit()

    # 3. Create Completed Workflow (Sarah Connor)
    wf1 = Workflow(
        email_id=email1.id,
        status="COMPLETED",
        current_stage="COMPLETED",
        created_at=now - timedelta(days=5),
        updated_at=now - timedelta(days=5, minutes=58),
    )
    db.add(wf1)
    db.commit()

    # Build steps for Sarah's completed run
    stages_sarah = [
        (
            "EMAIL_RECEIVED",
            now - timedelta(days=5, hours=1),
            now - timedelta(days=5, minutes=59),
        ),
        (
            "UNDERSTAND_REQUEST",
            now - timedelta(days=5, minutes=59),
            now - timedelta(days=5, minutes=58),
        ),
        (
            "EXTRACT_INFORMATION",
            now - timedelta(days=5, minutes=58),
            now - timedelta(days=5, minutes=57),
        ),
        (
            "RETRIEVE_PRICING",
            now - timedelta(days=5, minutes=57),
            now - timedelta(days=5, minutes=56),
        ),
        (
            "CHECK_INVENTORY",
            now - timedelta(days=5, minutes=56),
            now - timedelta(days=5, minutes=55),
        ),
        (
            "GENERATE_QUOTATION",
            now - timedelta(days=5, minutes=55),
            now - timedelta(days=5, minutes=54),
        ),
        (
            "REQUEST_APPROVAL",
            now - timedelta(days=5, minutes=54),
            now - timedelta(days=5, minutes=53),
        ),
        (
            "SEND_REPLY",
            now - timedelta(days=5, minutes=30),
            now - timedelta(days=5, minutes=29),
        ),
        (
            "CREATE_LEAD",
            now - timedelta(days=5, minutes=29),
            now - timedelta(days=5, minutes=28),
        ),
        (
            "SCHEDULE_FOLLOWUP",
            now - timedelta(days=5, minutes=28),
            now - timedelta(days=5, minutes=27),
        ),
        (
            "COMPLETED",
            now - timedelta(days=5, minutes=27),
            now - timedelta(days=5, minutes=27),
        ),
    ]

    steps_sarah_models = []
    for idx, (stage, start, end) in enumerate(stages_sarah):
        steps_sarah_models.append(
            WorkflowStep(
                workflow_id=wf1.id,
                stage=stage,
                status="COMPLETED",
                input_data={"demo": True},
                output_data={"stage_idx": idx, "success": True},
                started_at=start,
                completed_at=end,
            )
        )
    db.add_all(steps_sarah_models)

    quote1 = Quotation(
        workflow_id=wf1.id,
        quote_number="QT-2026-98214",
        total_amount=4000.00,
        items=[
            {
                "product": "Widget A",
                "quantity": 500,
                "unit_price": 8.0,  # 10.0 base with 20% discount
                "total": 4000.00,
            }
        ],
        created_at=now - timedelta(days=5, minutes=55),
    )
    db.add(quote1)
    db.commit()

    app1 = Approval(
        workflow_id=wf1.id,
        quotation_id=quote1.id,
        status="APPROVED",
        approver="Manager Admin",
        notes="Dynamic volume discounts correctly calculated.",
        created_at=now - timedelta(days=5, minutes=54),
        decided_at=now - timedelta(days=5, minutes=30),
    )
    db.add(app1)

    lead1 = Lead(
        customer_id=cust1.id,
        status="WON",
        value=4000.00,
        created_at=now - timedelta(days=5, minutes=28),
    )
    db.add(lead1)

    outbound1 = Email(
        sender="sales@company.com",
        recipient="sarah.connor@cyberdyne.com",
        subject="RE: Request for Bulk Widget-A Pricing",
        body="Hello Sarah,\n\nWe have generated your quotation QT-2026-98214. The total value is $4,000.00. Standard delivery is 2 business days.\n\nBest regards,\nAI Sales Ops Manager",
        direction="OUTBOUND",
        received_at=now - timedelta(days=5, minutes=29),
    )
    db.add(outbound1)

    # 4. Create Pending Approval Workflow (Bruce Wayne)
    wf2 = Workflow(
        email_id=email2.id,
        status="PENDING_APPROVAL",
        current_stage="REQUEST_APPROVAL",
        created_at=now - timedelta(hours=18),
        updated_at=now - timedelta(hours=17, minutes=55),
    )
    db.add(wf2)
    db.commit()

    stages_bruce = [
        (
            "EMAIL_RECEIVED",
            now - timedelta(hours=18),
            now - timedelta(hours=17, minutes=59),
        ),
        (
            "UNDERSTAND_REQUEST",
            now - timedelta(hours=17, minutes=59),
            now - timedelta(hours=17, minutes=58),
        ),
        (
            "EXTRACT_INFORMATION",
            now - timedelta(hours=17, minutes=58),
            now - timedelta(hours=17, minutes=57),
        ),
        (
            "RETRIEVE_PRICING",
            now - timedelta(hours=17, minutes=57),
            now - timedelta(hours=17, minutes=56),
        ),
        (
            "CHECK_INVENTORY",
            now - timedelta(hours=17, minutes=56),
            now - timedelta(hours=17, minutes=55),
        ),
        (
            "GENERATE_QUOTATION",
            now - timedelta(hours=17, minutes=55),
            now - timedelta(hours=17, minutes=54),
        ),
        ("REQUEST_APPROVAL", now - timedelta(hours=17, minutes=54), None),
    ]

    steps_bruce_models = []
    for idx, (stage, start, end) in enumerate(stages_bruce):
        status = "COMPLETED" if end else "RUNNING"
        steps_bruce_models.append(
            WorkflowStep(
                workflow_id=wf2.id,
                stage=stage,
                status=status,
                input_data={"demo": True},
                output_data={"stage_idx": idx, "success": True},
                started_at=start,
                completed_at=end,
            )
        )
    db.add_all(steps_bruce_models)

    quote2 = Quotation(
        workflow_id=wf2.id,
        quote_number="QT-2026-10255",
        total_amount=4250.00,
        items=[
            {
                "product": "Server Rack",
                "quantity": 5,
                "unit_price": 850.0,
                "total": 4250.00,
            }
        ],
        created_at=now - timedelta(hours=17, minutes=55),
    )
    db.add(quote2)
    db.commit()

    app2 = Approval(
        workflow_id=wf2.id,
        quotation_id=quote2.id,
        status="PENDING",
        created_at=now - timedelta(hours=17, minutes=54),
    )
    db.add(app2)

    # 5. Create Failed/Rejected Workflow (Selina Kyle)
    wf3 = Workflow(
        email_id=email4.id,
        status="FAILED",
        current_stage="REQUEST_APPROVAL",
        created_at=now - timedelta(days=2),
        updated_at=now - timedelta(days=2, hours=1),
    )
    db.add(wf3)
    db.commit()

    stages_selina = [
        (
            "EMAIL_RECEIVED",
            now - timedelta(days=2),
            now - timedelta(days=2, minutes=59),
        ),
        (
            "UNDERSTAND_REQUEST",
            now - timedelta(days=2, minutes=59),
            now - timedelta(days=2, minutes=58),
        ),
        (
            "EXTRACT_INFORMATION",
            now - timedelta(days=2, minutes=58),
            now - timedelta(days=2, minutes=57),
        ),
        (
            "RETRIEVE_PRICING",
            now - timedelta(days=2, minutes=57),
            now - timedelta(days=2, minutes=56),
        ),
        (
            "CHECK_INVENTORY",
            now - timedelta(days=2, minutes=56),
            now - timedelta(days=2, minutes=55),
        ),
        (
            "GENERATE_QUOTATION",
            now - timedelta(days=2, minutes=55),
            now - timedelta(days=2, minutes=54),
        ),
        (
            "REQUEST_APPROVAL",
            now - timedelta(days=2, minutes=54),
            now - timedelta(days=2, minutes=53),
        ),
    ]

    steps_selina_models = []
    for idx, (stage, start, end) in enumerate(stages_selina):
        status = "COMPLETED" if stage != "REQUEST_APPROVAL" else "FAILED"
        steps_selina_models.append(
            WorkflowStep(
                workflow_id=wf3.id,
                stage=stage,
                status=status,
                input_data={"demo": True},
                output_data={"stage_idx": idx, "success": status == "COMPLETED"},
                started_at=start,
                completed_at=end,
            )
        )
    db.add_all(steps_selina_models)

    quote3 = Quotation(
        workflow_id=wf3.id,
        quote_number="QT-2026-30219",
        total_amount=2700.00,
        items=[
            {
                "product": "Widget C",
                "quantity": 25,
                "unit_price": 108.0,
                "total": 2700.00,
            }
        ],
        created_at=now - timedelta(days=2, minutes=55),
    )
    db.add(quote3)
    db.commit()

    app3 = Approval(
        workflow_id=wf3.id,
        quotation_id=quote3.id,
        status="REJECTED",
        approver="Manager Admin",
        notes="Quantity is too low for discount on Widget-C. Recalculate without discount.",
        created_at=now - timedelta(days=2, minutes=54),
        decided_at=now - timedelta(days=2, minutes=50),
    )
    db.add(app3)

    # 6. Notifications
    notif1 = Notification(
        workflow_id=wf1.id,
        type="EMAIL_RECEIVED",
        message="Workflow #1 completed for sarah.connor@cyberdyne.com.",
        read=True,
        created_at=now - timedelta(days=5, minutes=27),
    )
    notif2 = Notification(
        workflow_id=wf2.id,
        type="APPROVAL_REQUEST",
        message="Quotation QT-2026-10255 ($4,250.00) requires approval.",
        read=False,
        created_at=now - timedelta(hours=17, minutes=54),
    )
    notif3 = Notification(
        workflow_id=wf3.id,
        type="SYSTEM_ERROR",
        message="Workflow #3 rejected by manager: Quantity too low for Widget-C discount.",
        read=True,
        created_at=now - timedelta(days=2, minutes=50),
    )
    db.add_all([notif1, notif2, notif3])

    db.commit()
