from flask import Blueprint, request, jsonify, session, send_file
from utils import get_db_connection
import io

payslip_bp = Blueprint("payslip", __name__)


# ----------------------------
# Upload Payslip (called from Node.js)
# ----------------------------
@payslip_bp.route("/upload", methods=["POST"])
def upload_payslip():

    email = request.form.get("email")
    month = request.form.get("month")
    year = request.form.get("year")

    # Salary values from Node.js
    gross_salary = request.form.get("gross_salary", 0)
    deductions = request.form.get("deductions", 0)
    net_salary = request.form.get("net_salary", 0)

    print("Gross Salary:", gross_salary)
    print("Deductions:", deductions)
    print("Net Salary:", net_salary)

    pdf = request.files.get("pdf")

    if not email or not pdf:
        return jsonify({
            "success": False,
            "message": "Email or PDF missing"
        }), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute(
        "SELECT id FROM users WHERE email=%s",
        (email,)
    )

    user = cursor.fetchone()

    if not user:
        cursor.close()
        conn.close()

        return jsonify({
            "success": False,
            "message": "Employee not found"
        }), 404

    pdf_data = pdf.read()

    cursor.execute(
        """
        INSERT INTO payslips
        (
            user_id,
            month,
            year,
            gross_salary,
            deductions,
            net_salary,
            pdf_file
        )
        VALUES (%s,%s,%s,%s,%s,%s,%s)
        """,
        (
            user["id"],
            month,
            year,
            gross_salary,
            deductions,
            net_salary,
            pdf_data
        )
    )

    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({
        "success": True,
        "message": "Payslip Saved Successfully"
    })
# ----------------------------
# List Logged-in User Payslips
# ----------------------------
@payslip_bp.route("/list", methods=["GET"])
def list_payslips():

    if "user_id" not in session:
        return jsonify([]), 401

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # cursor.execute(
    #     """
    #     SELECT id, month, year, created_at
    #     FROM payslips
    #     WHERE user_id=%s
    #     ORDER BY created_at DESC
    #     """,
    #     (session["user_id"],)
    # )
    cursor.execute("""
    SELECT
        id,
        month,
        year,
        net_salary,
        gross_salary,
        deductions,
        created_at
    FROM payslips
    WHERE user_id=%s
    ORDER BY created_at DESC
""", (session["user_id"],))

    payslips = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(payslips)


# ----------------------------
# Download Payslip
# ----------------------------
@payslip_bp.route("/download/<int:payslip_id>", methods=["GET"])
def download_payslip(payslip_id):

    if "user_id" not in session:
        return "Unauthorized", 401

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute(
        """
        SELECT pdf_file, month, year
        FROM payslips
        WHERE id=%s
        AND user_id=%s
        """,
        (
            payslip_id,
            session["user_id"]
        )
    )

    payslip = cursor.fetchone()

    cursor.close()
    conn.close()

    if not payslip:
        return "Payslip Not Found", 404

    return send_file(
        io.BytesIO(payslip["pdf_file"]),
        mimetype="application/pdf",
        as_attachment=True,
        download_name=f"{payslip['month']}_{payslip['year']}.pdf"
    )

@payslip_bp.route("/view/<int:payslip_id>")
def view_payslip(payslip_id):

    if "user_id" not in session:
        return "Unauthorized", 401

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT pdf_file
        FROM payslips
        WHERE id=%s
        AND user_id=%s
    """, (payslip_id, session["user_id"]))

    row = cursor.fetchone()

    cursor.close()
    conn.close()

    if not row:
        return "Not Found", 404

    return send_file(
        io.BytesIO(row["pdf_file"]),
        mimetype="application/pdf",
        as_attachment=False
    )